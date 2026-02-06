import logging
from typing import Any, Dict, Optional


logger = logging.getLogger("xbi_tasking_backend.audit")


class AuditService:
    def log_event(
        self,
        event_type: str,
        user: Optional[Dict[str, Any]] = None,
        *,
        target: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        actor = user.get("preferred_username") if user else None
        actor_id = user.get("sub") if user else None
        payload = {
            "event": event_type,
            "actor": actor,
            "actor_id": actor_id,
            "target": target,
            "ip": ip_address,
            "details": details or {},
        }
        logger.info("AUDIT %s", payload)
