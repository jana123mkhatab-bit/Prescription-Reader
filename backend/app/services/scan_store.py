"""
In-memory, process-lifetime store of analyzed prescription scans.

This is deliberately not a database: it exists so the pharmacist queue,
verification detail view, and analytics strip have real data to work with
without standing up persistence infrastructure. Restarting the server
clears it.
"""
import io
import threading
import uuid
from datetime import datetime, timezone

from PIL import Image

_MAX_RECORDS = 200
_THUMB_MAX_EDGE = 900
_THUMB_QUALITY = 75

_lock = threading.Lock()
_store: list[dict] = []  # append-only; most-recent-last internally


def _make_image_data_url(image_bytes: bytes) -> str | None:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
    except Exception:
        return None

    edge = max(img.width, img.height)
    if edge > _THUMB_MAX_EDGE:
        scale = _THUMB_MAX_EDGE / edge
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=_THUMB_QUALITY)
    import base64

    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def create_scan(payload: dict, image_bytes: bytes) -> dict:
    """
    payload: {raw_ocr_text, candidates, top_pick, flagged_for_review,
              patient_summary, diagnosis, source}
    """
    record = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "decided_drug_name": None,
        "decided_at": None,
        "image_data_url": _make_image_data_url(image_bytes),
        **payload,
    }
    with _lock:
        _store.append(record)
        if len(_store) > _MAX_RECORDS:
            del _store[0 : len(_store) - _MAX_RECORDS]
    return record


def list_scans() -> list[dict]:
    with _lock:
        records = list(reversed(_store))
    return [{k: v for k, v in r.items() if k != "image_data_url"} for r in records]


def get_scan(scan_id: str) -> dict | None:
    with _lock:
        for r in _store:
            if r["id"] == scan_id:
                return dict(r)
    return None


def update_scan_decision(scan_id: str, action: str, drug_name: str | None) -> dict | None:
    with _lock:
        for r in _store:
            if r["id"] == scan_id:
                if action == "confirm":
                    top_pick = r.get("top_pick") or {}
                    r["decided_drug_name"] = top_pick.get("drug_name")
                    r["status"] = "confirmed"
                elif action == "override":
                    r["decided_drug_name"] = drug_name
                    r["status"] = "overridden"
                else:
                    return None
                r["decided_at"] = datetime.now(timezone.utc).isoformat()
                return dict(r)
    return None
