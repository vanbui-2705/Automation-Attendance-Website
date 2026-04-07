import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    """In-memory sliding-window rate limiter (per key, typically IP)."""

    def __init__(self, max_requests=10, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = Lock()
        self._buckets = defaultdict(list)

    def is_limited(self, key):
        now = time.monotonic()
        with self._lock:
            timestamps = self._buckets[key]
            self._buckets[key] = [t for t in timestamps if now - t < self.window_seconds]
            if len(self._buckets[key]) >= self.max_requests:
                return True
            self._buckets[key].append(now)
            return False
