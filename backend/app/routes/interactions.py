import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import interactions

router = APIRouter()
logger = logging.getLogger(__name__)


class InteractionCheckRequest(BaseModel):
    drug_names: list[str]


@router.post("/interactions/check")
def check_interactions(body: InteractionCheckRequest):
    names = [n.strip() for n in body.drug_names if n and n.strip()]
    if len(names) < 2:
        return {"pairs": [], "flagged_count": 0, "unresolved": []}
    try:
        return interactions.check_interactions(names)
    except Exception:
        logger.warning("Interaction check failed for %r", names, exc_info=True)
        raise HTTPException(status_code=502, detail="Couldn't reach the drug database to check interactions. Please try again.")
