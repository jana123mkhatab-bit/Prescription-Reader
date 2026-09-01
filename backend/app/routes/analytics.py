from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter

from app.services import scan_store
from app.services.constants import MATCH_SCORE_THRESHOLD

router = APIRouter()

_PERIOD_DAYS = 7


@router.get("/analytics")
def get_analytics():
    """
    Aggregates recent scan history for the pharmacist analytics dashboard.
    Runs entirely over the existing in-memory scan_store -- no new storage,
    consistent with the rest of the demo's no-database posture.
    """
    scans = scan_store.list_scans()
    cutoff = datetime.now(timezone.utc) - timedelta(days=_PERIOD_DAYS)
    recent = [s for s in scans if datetime.fromisoformat(s["created_at"]) >= cutoff]

    total = len(recent)
    flagged = sum(1 for s in recent if s.get("flagged_for_review"))
    flagged_pct = round((flagged / total) * 100) if total else 0

    low_confidence: dict[str, list[float]] = defaultdict(list)
    for s in recent:
        top = s.get("top_pick")
        if not top:
            continue
        top_score = top.get("match_score", top.get("confidence", 0))
        if top_score < MATCH_SCORE_THRESHOLD:
            name = s.get("cleaned_drug_name") or s.get("raw_ocr_text") or "Unknown"
            low_confidence[name].append(top_score)

    low_confidence_drugs = sorted(
        (
            {"drug_name": name, "count": len(scores), "avg_confidence": round(sum(scores) / len(scores), 2)}
            for name, scores in low_confidence.items()
        ),
        key=lambda d: d["count"],
        reverse=True,
    )[:10]

    return {
        "total_scans": total,
        "flagged_pct": flagged_pct,
        "low_confidence_drugs": low_confidence_drugs,
        "period_days": _PERIOD_DAYS,
    }
