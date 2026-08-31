"""
Reads handwritten prescription text using Google's Gemini API (gemini-3.5-flash).

Same rationale as app.services.vision_ocr (Claude): a large multimodal model
recognizes real medication names in ambiguous handwriting far better than
TrOCR's small specialist decoder can, because it brings actual world
knowledge of drug names to the read instead of just matching pen strokes.

This is the free-tier path: Gemini Flash models are available at no cost
through Google AI Studio (rate-limited, but a permanent free tier -- not a
trial credit), which is why app.services.ocr.get_candidates() tries this
before the paid Claude vision path.

Requirements:
  pip install google-genai pillow pydantic

Set GEMINI_API_KEY in the environment to enable this path. Get a free key at
https://aistudio.google.com/apikey
"""

import io
import logging
import os

from PIL import Image
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_MODEL_NAME = "gemini-3.5-flash"
_FALLBACK_MODEL_NAME = "gemini-3.5-flash-lite"  # tried if the primary model returns a transient error (e.g. 503 high demand)
_MAX_DIMENSION = 1568

_client = None


class _Reading(BaseModel):
    text: str = Field(description="One possible reading of the handwritten medication name and dosage, exactly as written")
    confidence: float = Field(ge=0.0, le=1.0, description="How confident you are this reading is correct, 0-1")


class _OCRResult(BaseModel):
    candidates: list[_Reading] = Field(description="Ranked possible readings, most likely first")


def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def _resize_for_api(image: Image.Image) -> Image.Image:
    w, h = image.size
    longest = max(w, h)
    if longest <= _MAX_DIMENSION:
        return image
    scale = _MAX_DIMENSION / longest
    return image.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


def _encode_png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


_PROMPT = """This is a photo/crop of a handwritten medical prescription. Read the \
handwritten medication name (and dosage/strength if visible) as accurately as \
possible.

Doctors' handwriting is often ambiguous or barely legible. Use your knowledge \
of real-world medication names (brand and generic, e.g. Amoxicillin, \
Metformin, Lisinopril, Atorvastatin, Losartan, Omeprazole, Azithromycin) to \
resolve unclear strokes the way an experienced pharmacist would -- prefer a \
reading that is a real medication name over a literal but nonsensical \
letter-for-letter transcription, but don't invent a drug that doesn't \
resemble what's actually written.

Return up to 5 distinct possible readings, ranked most likely first, with a \
confidence 0-1 for each reflecting how legible/certain that reading is."""


def read_text_candidates(image: Image.Image, num_candidates: int = 5) -> list[dict]:
    """
    Sends the image to Gemini's vision API and returns up to `num_candidates`
    ranked hypotheses: [{"text": str, "score": float}, ...], best-first --
    the same shape as ocr.read_text_candidates() / vision_ocr.read_text_candidates()
    so callers can use any of them interchangeably (see ocr.get_candidates).

    Returns [] if GEMINI_API_KEY isn't configured or the call fails, so
    callers can fall back to another OCR engine.
    """
    if not os.getenv("GEMINI_API_KEY"):
        return []

    from google.genai import types

    client = _get_client()
    resized = _resize_for_api(image)
    image_bytes = _encode_png(resized)

    result = None
    for model in (_MODEL_NAME, _FALLBACK_MODEL_NAME):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    _PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_OCRResult,
                ),
            )
            result = response.parsed
            if result is None:
                raise ValueError("Gemini did not return a parseable structured response")
            break
        except Exception:
            logger.warning("Gemini vision OCR (%s) failed; trying next option.", model, exc_info=True)

    if result is None:
        return []

    candidates = [
        {"text": c.text.strip(), "score": c.confidence}
        for c in result.candidates[:num_candidates]
        if c.text.strip()
    ]
    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates
