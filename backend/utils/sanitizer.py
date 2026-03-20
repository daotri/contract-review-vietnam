"""Input sanitization utilities."""

import ipaddress
import re
import socket
from urllib.parse import urlparse

from fastapi import HTTPException

MAX_TEXT_LENGTH = 10_000
ALLOWED_URL_SCHEMES = {"http", "https"}

# Private/reserved IP ranges to block (SSRF protection)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("0.0.0.0/8"),
]


def sanitize_url(url: str) -> str:
    """Validate and sanitize a URL for crawling. Blocks SSRF targets."""
    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_URL_SCHEMES:
        raise HTTPException(status_code=400, detail=f"URL scheme '{parsed.scheme}' not allowed")

    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL: no hostname")

    hostname = parsed.hostname or ""

    # Block localhost variants
    if hostname in ("localhost", "0.0.0.0", ""):
        raise HTTPException(status_code=400, detail="Internal hostnames not allowed")

    # Resolve hostname and check against blocked IP ranges
    try:
        resolved_ip = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(resolved_ip)
        for network in BLOCKED_NETWORKS:
            if ip in network:
                raise HTTPException(status_code=400, detail="URL resolves to blocked internal address")
    except socket.gaierror:
        raise HTTPException(status_code=400, detail=f"Cannot resolve hostname: {hostname}")

    return url


def sanitize_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """Strip control characters and limit text length."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    if len(text) > max_length:
        text = text[:max_length]

    return text
