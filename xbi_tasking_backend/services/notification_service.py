import time
import secrets
from collections import deque


class NotificationService:
    def __init__(self, db=None, max_items=200):
        self._db = db
        self._items = deque(maxlen=max_items)
        self._max_items = max_items
        if self._db is not None:
            self._ensure_table()

    def _ensure_table(self):
        self._db.executeUpdate(
            """
            CREATE TABLE IF NOT EXISTS app_notification (
                id VARCHAR(64) PRIMARY KEY,
                title TEXT NOT NULL,
                meta TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                target_roles TEXT,
                persist BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self._db.executeUpdate("ALTER TABLE app_notification ADD COLUMN IF NOT EXISTS persist BOOLEAN DEFAULT FALSE")

    def push(self, title, meta=None, user=None, target_roles=None, persist=False):
        suffix = ""
        if user and isinstance(user, dict):
            username = user.get("preferred_username")
            if username:
                suffix = f" · {username}"
        roles_csv = None
        if target_roles:
            roles_csv = ",".join(str(role).strip() for role in target_roles if str(role).strip())
        notification = {
            "id": f"{int(time.time() * 1000)}-{secrets.token_hex(4)}",
            "title": title,
            "meta": f"{meta or 'Just now'}{suffix}",
            "read": False,
            "target_roles": roles_csv,
            "persist": bool(persist),
        }
        self._items.appendleft(notification)
        if self._db is not None and persist:
            self._db.executeInsert(
                "INSERT INTO app_notification (id, title, meta, is_read, target_roles, persist) VALUES (%s, %s, %s, %s, %s, %s)",
                (notification["id"], notification["title"], notification["meta"], False, roles_csv, True),
            )
        return notification

    def list_for_user(self, user):
        viewer_roles = set()
        if user and isinstance(user, dict):
            account_type = user.get("account_type")
            if account_type:
                viewer_roles.add(str(account_type))
            for role in (user.get("roles", []) or []):
                viewer_roles.add(str(role))

        persisted_items = []
        if self._db is not None:
            rows = self._db.executeSelect(
                "SELECT id, title, meta, is_read, target_roles, persist FROM app_notification "
                "WHERE persist = TRUE "
                "ORDER BY created_at DESC LIMIT %s",
                (self._max_items,),
            )
            persisted_items = [
                {
                    "id": row[0],
                    "title": row[1],
                    "meta": row[2],
                    "read": bool(row[3]),
                    "target_roles": row[4],
                    "persist": bool(row[5]),
                }
                for row in rows
            ]
        items_by_id = {}
        for item in list(self._items) + persisted_items:
            item_id = item.get("id")
            if item_id and item_id not in items_by_id:
                items_by_id[item_id] = item
        items = sorted(
            items_by_id.values(),
            key=lambda item: int(str(item.get("id", "0")).split("-", 1)[0]) if str(item.get("id", "")).split("-", 1)[0].isdigit() else 0,
            reverse=True,
        )

        filtered = []
        for item in items:
            target_roles_raw = item.get("target_roles")
            if not target_roles_raw:
                filtered.append({k: v for k, v in item.items() if k not in ("target_roles", "persist")})
                continue
            target_roles = {role.strip() for role in str(target_roles_raw).split(",") if role.strip()}
            if viewer_roles.intersection(target_roles):
                filtered.append({k: v for k, v in item.items() if k not in ("target_roles", "persist")})
        return filtered
