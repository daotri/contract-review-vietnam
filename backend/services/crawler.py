"""vbpl.vn crawler with rate limiting and retry logic."""

import asyncio
import logging
import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 2.5  # seconds between requests
MAX_RETRIES = 3
REQUEST_TIMEOUT = 30.0

HEADERS = {
    "User-Agent": "ContractReviewBot/1.0 (legal research; respectful crawling)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "vi-VN,vi;q=0.9",
}


async def crawl_law(url: str) -> dict | None:
    """Fetch and parse a law document from vbpl.vn.

    Returns dict with: title, law_number, full_text, articles (list of dicts).
    Returns None if crawl fails after retries.
    """
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()

            html = response.text
            return _parse_law_html(html, url)

        except Exception as e:
            wait_time = (2 ** attempt) * 2
            logger.warning("Crawl attempt %d/%d failed for %s: %s. Retrying in %ds", attempt + 1, MAX_RETRIES, url, e, wait_time)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(wait_time)

    logger.error("Failed to crawl %s after %d attempts", url, MAX_RETRIES)
    return None


def _parse_law_html(html: str, source_url: str) -> dict:
    """Parse vbpl.vn HTML into structured law data."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove scripts and styles
    for tag in soup(["script", "style"]):
        tag.decompose()

    # Extract title — try multiple selectors
    title = ""
    for selector in [".doc-title", ".fulltext h1", "h1", ".title", "title"]:
        el = soup.select_one(selector)
        if el:
            title = el.get_text(strip=True)
            break

    # Extract full text from content area (support multiple sources)
    content_el = (
        soup.select_one(".content1")  # thuvienphapluat.vn
        or soup.select_one(".fulltext")  # vbpl.vn
        or soup.select_one("#toanvancontent")
        or soup.select_one(".content")
        or soup.body
    )
    full_text = content_el.get_text(separator="\n", strip=True) if content_el else ""

    # Parse articles from the full text
    articles = _extract_articles(full_text)

    return {
        "title": title,
        "full_text": full_text,
        "articles": articles,
        "source_url": source_url,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
    }


def _extract_articles(text: str) -> list[dict]:
    """Extract articles (Điều) from Vietnamese legal text.

    Each article has: article_number, title, content.
    """
    # Match "Điều X." or "Điều X:" patterns
    pattern = r"(Điều\s+(\d+[a-z]?)[\.\:]?\s*(.*))"
    matches = list(re.finditer(pattern, text, re.IGNORECASE))

    if not matches:
        return [{"article_number": "full", "title": "", "content": text}]

    articles = []
    for i, match in enumerate(matches):
        article_number = match.group(2)
        title = match.group(3).strip().rstrip(".")

        # Content is between this article header and the next
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        content = text[start:end].strip()

        articles.append({
            "article_number": article_number,
            "title": title,
            "content": content,
        })

    return articles


async def crawl_with_rate_limit(url: str) -> dict | None:
    """Crawl a law URL with rate limiting delay after the request."""
    result = await crawl_law(url)
    await asyncio.sleep(RATE_LIMIT_DELAY)
    return result
