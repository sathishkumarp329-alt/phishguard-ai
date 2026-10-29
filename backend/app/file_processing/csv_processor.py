"""CSV and Plain Text URL Extraction Module."""

import csv
import io
import re
from typing import List, Set

from app.core.config import settings

URL_PATTERN = re.compile(
    r"https?://(?:[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=]|%[0-9a-fA-F]{2})+"
)


def _clean_url(url: str) -> str:
    return url.rstrip(".,;:)'\"!>?]")


def extract_urls_from_csv(
    content: bytes, max_urls: int = settings.MAX_BATCH_URLS
) -> List[str]:
    """
    Parse CSV or plain-text files and extract valid URLs up to max_urls.
    """
    extracted_urls: List[str] = []
    seen: Set[str] = set()

    def _add_url(u: str) -> bool:
        clean = _clean_url(u.strip())
        if clean and clean.startswith(("http://", "https://")) and clean not in seen:
            seen.add(clean)
            extracted_urls.append(clean)
            if len(extracted_urls) >= max_urls:
                return True
        return False

    try:
        text = content.decode("utf-8", errors="replace")
    except Exception:
        return []

    # Read line-by-line / CSV cells
    reader = csv.reader(io.StringIO(text))
    for row in reader:
        for cell in row:
            matches = URL_PATTERN.findall(cell)
            if matches:
                for match in matches:
                    if _add_url(match):
                        return extracted_urls
            elif cell.strip().startswith(("http://", "https://")):
                if _add_url(cell):
                    return extracted_urls

    return extracted_urls
