from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import scan_store, share_store

router = APIRouter()


class ShareRequest(BaseModel):
    scan_id: str


@router.post("/share")
def create_share(body: ShareRequest):
    scan = scan_store.get_scan(body.scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")

    top = scan.get("top_pick") or {}
    profile = top.get("profile") or {}
    # Prefer the plain-language summary already generated for this scan over
    # raw FDA label text -- a caregiver shouldn't have to parse a label section.
    en_summary = (scan.get("patient_summary") or {}).get("en") or {}
    dosage = en_summary.get("how_to_take") if en_summary.get("structured") else None
    warnings = en_summary.get("side_effects") if en_summary.get("structured") else None

    record = share_store.create_share(
        {
            "drug_name": profile.get("brand_name") or top.get("drug_name") or scan.get("cleaned_drug_name") or "Unknown medication",
            "dosage": dosage or profile.get("dosage") or "Not specified — consult your pharmacist or doctor.",
            "warnings": warnings or profile.get("warnings") or "",
        }
    )
    return {"token": record["token"], "path": f"/share/{record['token']}"}


@router.get("/share/{token}")
def get_share(token: str):
    record = share_store.get_share(token)
    if record is None:
        raise HTTPException(status_code=404, detail="This share link has expired or doesn't exist.")
    return record
