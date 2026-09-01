"""
Uses Google's Gemini API (free tier) for:
  1. Embedding similarity between patient diagnosis/symptoms and a drug's indications
  2. Generating a plain-language patient summary of the drug

Free-tier replacement for the original watsonx.ai/Granite implementation --
same interface (rank_candidates_by_diagnosis, generate_patient_summary) as
the old app.services.granite_ai, so app.routes.prescription only needed an
import swap. No IBM Cloud account required.

Requirements:
  pip install google-genai numpy pydantic

Set GEMINI_API_KEY in the environment. Get a free key at
https://aistudio.google.com/apikey
"""

import logging
import os

import numpy as np
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_EMBED_MODEL = "gemini-embedding-001"
_GEN_MODEL = "gemini-3.5-flash"
_GEN_FALLBACK_MODEL = "gemini-3.5-flash-lite"  # tried if the primary model returns a transient error

_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def match_score(diagnosis_text: str, drug_indications: str) -> float:
    """Returns a 0-1 similarity score between patient diagnosis and a drug's indications."""
    client = _get_client()
    response = client.models.embed_content(
        model=_EMBED_MODEL,
        contents=[diagnosis_text, drug_indications],
    )
    vectors = [e.values for e in response.embeddings]
    return _cosine_similarity(vectors[0], vectors[1])


def rank_candidates_by_diagnosis(candidates: list[dict], diagnosis_text: str) -> list[dict]:
    """
    candidates: [{"drug_name": str, "confidence": float, "profile": dict}, ...]
    Adds "diagnosis_match" score to each and re-ranks by combined score.
    """
    for c in candidates:
        indications = (c.get("profile") or {}).get("indications", "")
        c["diagnosis_match"] = match_score(diagnosis_text, indications) if indications else 0.0
        # Weighted combination -- tune these weights based on demo results
        c["combined_score"] = 0.5 * c["confidence"] + 0.5 * c["diagnosis_match"]

    return sorted(candidates, key=lambda c: c["combined_score"], reverse=True)


class _PatientSummary(BaseModel):
    what_its_for: str = Field(description="1-2 sentences on what this medication treats")
    how_to_take: str = Field(description="How it's typically taken, noting the doctor's written dosage should be followed if different")
    side_effects: str = Field(description="Common side effects to watch for, plain language")
    nutrition_notes: str = Field(description="Relevant food/nutrition interaction notes if present in the data, otherwise an empty string")


_SUMMARY_PROMPT = """You are a helpful pharmacy assistant explaining a medication to a patient in simple,
non-alarming, plain language. Do not give medical advice beyond what is in the provided data.
Always recommend confirming with a pharmacist or doctor for anything uncertain.

{language_instruction}

Drug: {brand_name} ({generic_name})
Patient's stated diagnosis/symptoms: {diagnosis_text}

Raw indications: {indications}
Raw dosage info: {dosage}
Raw side effects: {side_effects}

Fill in each field below. Keep each field under 60 words. Do not include a reminder to see a
pharmacist in any field -- that is shown separately by the app."""

_LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "ar": "Respond in Modern Standard Arabic (فصيح). Every field's value must be written entirely in Arabic.",
}


def generate_patient_summary(drug_profile: dict, diagnosis_text: str, language: str = "en") -> dict:
    """
    Uses Gemini to turn raw FDA label text into a plain-language patient summary,
    structured into four topics so the UI can render them as separate cards.

    language: "en" or "ar" -- callers (see app.routes.prescription) generate
    both once per scan and cache them so the frontend can toggle instantly.

    Returns {"structured": True, "what_its_for": str, "how_to_take": str,
             "side_effects": str, "nutrition_notes": str} on success.
    Raises if both the primary and fallback models fail -- callers catch this
    and show an "unavailable" state for that language only.
    """
    from google.genai import types

    client = _get_client()
    prompt = _SUMMARY_PROMPT.format(
        language_instruction=_LANGUAGE_INSTRUCTIONS.get(language, _LANGUAGE_INSTRUCTIONS["en"]),
        brand_name=drug_profile["brand_name"],
        generic_name=drug_profile["generic_name"],
        diagnosis_text=diagnosis_text,
        indications=drug_profile["indications"],
        dosage=drug_profile["dosage"],
        side_effects=drug_profile["side_effects"],
    )

    last_exc = None
    for model in (_GEN_MODEL, _GEN_FALLBACK_MODEL):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_PatientSummary,
                ),
            )
            parsed = response.parsed
            if parsed is None:
                raise ValueError("Gemini did not return a parseable structured response")
            return {"structured": True, **parsed.model_dump()}
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini patient summary (%s) failed; trying next option.", model, exc_info=True)

    raise last_exc


_CHAT_SYSTEM_PROMPT = """You are a helpful pharmacy assistant. A patient is asking a follow-up question about a
specific medication they were already prescribed. Answer ONLY using the drug label data provided below --
do not rely on general medical knowledge beyond it, and do not speculate about their personal health situation.
If the label data doesn't cover their question, say so plainly rather than guessing.
Keep your answer under 120 words, plain language, non-alarming.

Medication: {brand_name} ({generic_name})
Indications: {indications}
Dosage and administration: {dosage}
Side effects: {side_effects}
Warnings: {warnings}
Drug interactions: {drug_interactions}

Conversation so far:
{history_text}

Patient's new question: {question}"""

_CHAT_REMINDER = "\n\nAs always, confirm anything uncertain with your pharmacist or doctor before acting on it."


def answer_drug_question(drug_profile: dict, question: str, history: list[dict] | None = None) -> str:
    """
    Answers a patient's follow-up question about one specific drug, grounded in
    its openFDA profile so the model can't wander into general knowledge.

    history: [{"role": "patient"|"assistant", "content": str}, ...] -- prior
    turns in this chat, oldest first. No server-side session: callers (see
    app.routes.drug_chat) pass the whole history back in each request.

    The trailing pharmacist/doctor reminder is appended here, in code, not
    left to the model -- that's a hard requirement, not a prompt suggestion.
    """
    client = _get_client()
    history_text = "\n".join(f"{turn['role']}: {turn['content']}" for turn in (history or [])) or "(none yet)"
    prompt = _CHAT_SYSTEM_PROMPT.format(
        brand_name=drug_profile.get("brand_name", ""),
        generic_name=drug_profile.get("generic_name", ""),
        indications=drug_profile.get("indications", ""),
        dosage=drug_profile.get("dosage", ""),
        side_effects=drug_profile.get("side_effects", ""),
        warnings=drug_profile.get("warnings", ""),
        drug_interactions=drug_profile.get("drug_interactions", ""),
        history_text=history_text,
        question=question,
    )

    last_exc = None
    for model in (_GEN_MODEL, _GEN_FALLBACK_MODEL):
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            answer = (response.text or "").strip()
            if not answer:
                raise ValueError("Gemini returned an empty chat response")
            return answer + _CHAT_REMINDER
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini drug chat (%s) failed; trying next option.", model, exc_info=True)

    raise last_exc
