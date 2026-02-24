import os
import time


class RateLimitService:
    """
    Simple in-memory rate limiter (per process).
    Uses a sliding window with fixed bucket size.
    """

    def __init__(self):
        self._window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self._max_requests = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "30"))
        self._buckets = {}

    def check(self, key: str) -> bool:
        """
        Returns True if request is allowed, False if rate limit exceeded.
        """
        now = time.time()
        window_start = now - self._window_seconds
        requests = self._buckets.get(key, [])

        # Drop old requests
        requests = [t for t in requests if t >= window_start]
        if len(requests) >= self._max_requests:
            self._buckets[key] = requests
            return False

        requests.append(now)
        self._buckets[key] = requests
        return True
