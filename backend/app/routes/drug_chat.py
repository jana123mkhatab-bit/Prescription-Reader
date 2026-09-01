import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import drug_data, gemini_ai

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatTurn(BaseModel):
    role: str  # "patient" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatTurn] = []


@router.post("/drugs/{drug_name}/chat")
def chat_about_drug(drug_name: str, body: ChatRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="question is required.")

    profile = drug_data.get_drug_profile(drug_name)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"No label data found for {drug_name!r}.")

    try:
        answer = gemini_ai.answer_drug_question(
            profile, body.question.strip(), [turn.model_dump() for turn in body.history]
        )
    except Exception:
        logger.warning("Drug chat failed for %r", drug_name, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Couldn't get an answer right now. Please ask your pharmacist or doctor directly.",
        )

    return {"answer": answer}
