from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import scan_store

router = APIRouter()


class ScanDecision(BaseModel):
    action: str  # "confirm" | "override"
    drug_name: str | None = None


@router.get("/scans")
def get_scans():
    return scan_store.list_scans()


@router.get("/scans/{scan_id}")
def get_scan(scan_id: str):
    record = scan_store.get_scan(scan_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return record


@router.post("/scans/{scan_id}/decision")
def decide_scan(scan_id: str, decision: ScanDecision):
    if decision.action not in ("confirm", "override"):
        raise HTTPException(status_code=400, detail="action must be 'confirm' or 'override'.")
    if decision.action == "override" and not decision.drug_name:
        raise HTTPException(status_code=400, detail="drug_name is required for override.")

    record = scan_store.update_scan_decision(scan_id, decision.action, decision.drug_name)
    if record is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return record
