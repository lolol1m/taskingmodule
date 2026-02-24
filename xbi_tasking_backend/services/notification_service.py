import time
import secrets
from collections import deque


class NotificationService:
    def __init__(self, max_items=200):
        self._items = deque(maxlen=max_items)
        self._max_items = max_items

    def push(self, title, meta=None, user=None):
        suffix = ""
        if user and isinstance(user, dict):
            username = user.get("preferred_username")
            if username:
                suffix = f" · {username}"
        notification = {
            "id": f"{int(time.time() * 1000)}-{secrets.token_hex(4)}",
            "title": title,
            "meta": f"{meta or 'Just now'}{suffix}",
            "read": False,
        }
        self._items.appendleft(notification)
        return notification

    def list_all(self):
        return list(self._items)
