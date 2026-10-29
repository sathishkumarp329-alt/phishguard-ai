"""Image URL Extraction Module (QR Code and OCR)."""

import io
import re
from typing import List, Set
from PIL import Image

URL_PATTERN = re.compile(
    r"https?://(?:[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=]|%[0-9a-fA-F]{2})+"
)


def _clean_url(url: str) -> str:
    return url.rstrip(".,;:)'\"!>?]")


def extract_urls_from_image(content: bytes) -> List[str]:
    """
    Extract URLs from images using QR code decoding and optical character recognition.
    Handles corrupt image buffers and optional library availability gracefully.
    """
    extracted_urls: List[str] = []
    seen: Set[str] = set()

    def _add_url(u: str) -> None:
        clean = _clean_url(u.strip())
        if clean and clean.startswith(("http://", "https://")) and clean not in seen:
            seen.add(clean)
            extracted_urls.append(clean)

    try:
        image = Image.open(io.BytesIO(content))
    except Exception:
        return []

    # 1. QR Code / Barcode Extraction with pyzbar
    try:
        from pyzbar.pyzbar import decode as pyzbar_decode
        decoded_objects = pyzbar_decode(image)
        for obj in decoded_objects:
            try:
                data_str = obj.data.decode("utf-8", errors="ignore")
                matches = URL_PATTERN.findall(data_str)
                if matches:
                    for m in matches:
                        _add_url(m)
                elif data_str.startswith(("http://", "https://")):
                    _add_url(data_str)
            except Exception:
                pass
    except Exception:
        # pyzbar or underlying zbar C-library unavailable
        pass

    # 2. Optical Character Recognition with pytesseract (if installed and configured)
    try:
        import pytesseract
        ocr_text = pytesseract.image_to_string(image)
        matches = URL_PATTERN.findall(ocr_text)
        for match in matches:
            _add_url(match)
    except Exception:
        # pytesseract or tesseract binary not installed
        pass

    return extracted_urls
