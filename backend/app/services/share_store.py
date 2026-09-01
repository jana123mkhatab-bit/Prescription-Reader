"""
In-memory, process-lifetime store of shareable medication card tokens.
Same non-persistence posture as scan_store.py -- this is a demo-scope
feature, not a durable sharing system. A token's payload deliberately
excludes the scan image and full clinical record: it's built to be handed to
a caregiver, not to expose the whole scan.
"""
import secrets
import threading
from datetime import datetime, timezone

_MAX_RECORDS = 200

_lock = threading.Lock()
_store: dict[str, dict] = {}
_order: list[str] = []  # tracks insertion order for the ring-buffer cap


def create_share(payload: dict) -> dict:
    """payload: {drug_name, dosage, warnings}"""
    token = secrets.token_urlsafe(8)
    record = {
        "token": token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    with _lock:
        _store[token] = record
        _order.append(token)
        if len(_order) > _MAX_RECORDS:
            stale = _order.pop(0)
            _store.pop(stale, None)
    return record


def get_share(token: str) -> dict | None:
    with _lock:
        record = _store.get(token)
        return dict(record) if record else None
