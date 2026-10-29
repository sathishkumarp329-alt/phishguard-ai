"""External Threat Intelligence Aggregator Module."""

import asyncio
import base64
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings


@dataclass
class ThreatResult:
    """Dataclass holding threat intelligence scan report from a provider."""

    provider: str
    status: str  # malicious, suspicious, clean, unknown, not_configured, error
    positives: int = 0
    total: int = 0
    details: Dict[str, Any] = field(default_factory=dict)


class ThreatIntelProvider(ABC):
    """Abstract base class for third-party threat intelligence feeds."""

    def __init__(self, cache_ttl_seconds: int = 3600):
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, Tuple[float, ThreatResult]] = {}

    def _get_cached(self, key: str) -> Optional[ThreatResult]:
        now = time.time()
        if key in self._cache:
            ts, res = self._cache[key]
            if now - ts < self.cache_ttl_seconds:
                return res
            del self._cache[key]
        return None

    def _set_cached(self, key: str, res: ThreatResult) -> None:
        self._cache[key] = (time.time(), res)

    @abstractmethod
    async def check_url(self, url: str) -> ThreatResult:
        """Query reputation for given URL."""
        pass


class VirusTotalProvider(ThreatIntelProvider):
    """VirusTotal v3 API Threat Intelligence Provider."""

    async def check_url(self, url: str) -> ThreatResult:
        api_key = settings.VIRUSTOTAL_API_KEY
        if not api_key:
            return ThreatResult(
                provider="VirusTotal",
                status="not_configured",
                details={"reason": "API key not set in environment"},
            )

        cached = self._get_cached(url)
        if cached:
            return cached

        # Encode URL according to VirusTotal v3 specification
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        headers = {"x-apikey": api_key, "Accept": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(endpoint, headers=headers)

                if resp.status_code == 404:
                    result = ThreatResult(
                        provider="VirusTotal",
                        status="unknown",
                        details={"message": "URL not yet analyzed by VirusTotal community"},
                    )
                    self._set_cached(url, result)
                    return result

                if resp.status_code != 200:
                    return ThreatResult(
                        provider="VirusTotal",
                        status="error",
                        details={"http_status": resp.status_code, "body": resp.text[:200]},
                    )

                data = resp.json().get("data", {})
                attributes = data.get("attributes", {})
                stats = attributes.get("last_analysis_stats", {})

                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                harmless = stats.get("harmless", 0)
                undetected = stats.get("undetected", 0)
                total = malicious + suspicious + harmless + undetected

                if malicious >= 2:
                    status = "malicious"
                elif malicious == 1 or suspicious >= 2:
                    status = "suspicious"
                elif harmless > 0:
                    status = "clean"
                else:
                    status = "unknown"

                result = ThreatResult(
                    provider="VirusTotal",
                    status=status,
                    positives=malicious + suspicious,
                    total=total,
                    details={"stats": stats},
                )
                self._set_cached(url, result)
                return result

        except Exception as e:
            return ThreatResult(
                provider="VirusTotal",
                status="error",
                details={"error": str(e)},
            )


class GoogleSafeBrowsingProvider(ThreatIntelProvider):
    """Google Safe Browsing v4 Threat Intelligence Provider."""

    async def check_url(self, url: str) -> ThreatResult:
        api_key = settings.GOOGLE_SAFE_BROWSING_KEY
        if not api_key:
            return ThreatResult(
                provider="GoogleSafeBrowsing",
                status="not_configured",
                details={"reason": "API key not set in environment"},
            )

        cached = self._get_cached(url)
        if cached:
            return cached

        endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
        payload = {
            "client": {"clientId": "phishguard-ai", "clientVersion": "1.0.0"},
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION",
                ],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(endpoint, json=payload)
                if resp.status_code != 200:
                    return ThreatResult(
                        provider="GoogleSafeBrowsing",
                        status="error",
                        details={"http_status": resp.status_code, "body": resp.text[:200]},
                    )

                body = resp.json()
                matches = body.get("matches", [])

                if matches:
                    threat_types = [m.get("threatType") for m in matches]
                    result = ThreatResult(
                        provider="GoogleSafeBrowsing",
                        status="malicious",
                        positives=len(matches),
                        total=len(matches),
                        details={"matches": matches, "threat_types": threat_types},
                    )
                else:
                    result = ThreatResult(
                        provider="GoogleSafeBrowsing",
                        status="clean",
                        positives=0,
                        total=1,
                        details={"message": "No threats identified by Google Safe Browsing"},
                    )

                self._set_cached(url, result)
                return result

        except Exception as e:
            return ThreatResult(
                provider="GoogleSafeBrowsing",
                status="error",
                details={"error": str(e)},
            )


class ThreatIntelService:
    """Orchestrator for all active threat intelligence providers."""

    def __init__(self):
        self.providers: List[ThreatIntelProvider] = [
            VirusTotalProvider(),
            GoogleSafeBrowsingProvider(),
        ]

    async def check_all_providers(self, url: str) -> List[ThreatResult]:
        """Query all threat intelligence feeds concurrently."""
        tasks = [provider.check_url(url) for provider in self.providers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        processed: List[ThreatResult] = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                provider_name = self.providers[i].__class__.__name__
                processed.append(
                    ThreatResult(
                        provider=provider_name,
                        status="error",
                        details={"error": str(res)},
                    )
                )
            else:
                processed.append(res)

        return processed
