"""PDF Document URL Extraction Module."""

import io
import re
from typing import List, Set
import PyPDF2

# Standard URL regex pattern
URL_PATTERN = re.compile(
    r"https?://(?:[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=]|%[0-9a-fA-F]{2})+"
)


def _clean_url(url: str) -> str:
    """Strip trailing punctuation that may be part of surrounding text."""
    return url.rstrip(".,;:)'\"!>?]")


def extract_urls_from_pdf(content: bytes) -> List[str]:
    """
    Extract all URLs from a PDF document, including page text and embedded annotation hyperlinks.
    Handles corrupted files safely without raising unhandled exceptions.
    """
    extracted_urls: List[str] = []
    seen: Set[str] = set()

    def _add_url(u: str) -> None:
        clean = _clean_url(u.strip())
        if clean and clean.startswith(("http://", "https://")) and clean not in seen:
            seen.add(clean)
            extracted_urls.append(clean)

    try:
        pdf_file = io.BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file, strict=False)

        for page in reader.pages:
            # 1. Extract text-embedded URLs
            try:
                page_text = page.extract_text() or ""
                matches = URL_PATTERN.findall(page_text)
                for match in matches:
                    _add_url(match)
            except Exception:
                pass

            # 2. Extract hyperlink annotations
            try:
                if "/Annots" in page:
                    annots = page["/Annots"]
                    if isinstance(annots, PyPDF2.generic.ArrayObject):
                        for annot in annots:
                            annot_obj = annot.get_object()
                            if "/A" in annot_obj:
                                action = annot_obj["/A"]
                                if "/URI" in action:
                                    uri = str(action["/URI"])
                                    _add_url(uri)
            except Exception:
                pass

    except Exception:
        # Corrupted or unreadable PDF
        pass

    return extracted_urls
