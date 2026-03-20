"""Diff two versions of a law document article-by-article."""

import logging

logger = logging.getLogger(__name__)


def diff_law_versions(old_articles: list[dict], new_articles: list[dict]) -> list[dict]:
    """Compare article lists and classify changes.

    Returns list of dicts: {change_type, article_id, old_content, new_content}.
    change_type: 'new', 'amended', 'repealed'
    """
    old_map = {a["article_number"]: a for a in old_articles}
    new_map = {a["article_number"]: a for a in new_articles}

    changes = []

    # Check for new and amended articles
    for art_num, new_art in new_map.items():
        if art_num not in old_map:
            changes.append({
                "change_type": "new",
                "article_id": art_num,
                "old_content": None,
                "new_content": new_art.get("content", ""),
            })
        else:
            old_content = old_map[art_num].get("content", "")
            new_content = new_art.get("content", "")
            if old_content.strip() != new_content.strip():
                changes.append({
                    "change_type": "amended",
                    "article_id": art_num,
                    "old_content": old_content,
                    "new_content": new_content,
                })

    # Check for repealed articles
    for art_num in old_map:
        if art_num not in new_map:
            changes.append({
                "change_type": "repealed",
                "article_id": art_num,
                "old_content": old_map[art_num].get("content", ""),
                "new_content": None,
            })

    logger.info("Diff result: %d new, %d amended, %d repealed",
        sum(1 for c in changes if c["change_type"] == "new"),
        sum(1 for c in changes if c["change_type"] == "amended"),
        sum(1 for c in changes if c["change_type"] == "repealed"),
    )
    return changes
