"""
Reads handwritten prescription text using Claude's vision API (claude-opus-5).

Why this exists: TrOCR (see ocr.py) is a small (~334M param) specialist model
trained mostly on general English handwriting (IAM dataset). It has no real
world knowledge of medication names, so on out-of-vocabulary drug names --
exactly what doctors write -- it garbles the text into the nearest generic
English words. Claude, GPT-4V and Gemini succeed on the same images because
they're large multimodal models with broad exposure to real medication names
and prescription conventions, so they can resolve an ambiguous scrawl the way
a pharmacist actually does: by recognizing it's close to a real drug name,
not just by matching pen strokes. This module gives the pipeline that same
capability; ocr.py's TrOCR path remains as an offline fallback.

Requirements:
  pip install anthropic pillow pydantic

Set ANTHROPIC_API_KEY in the environment to enable this path.
"""

import base64
import io
import logging
import os

from PIL import Image
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_MODEL_NAME = "claude-opus-5"
_MAX_DIMENSION = 1568  # Anthropic's recommended long-edge cap for vision inputs

_client = None


class _Reading(BaseModel):
    text: str = Field(description="One possible reading of the handwritten medication name and dosage, exactly as written")
    confidence: float = Field(ge=0.0, le=1.0, description="How confident you are this reading is correct, 0-1")


class _OCRResult(BaseModel):
    candidates: list[_Reading] = Field(description="Ranked possible readings, most likely first")


def _get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()
    return _client


def _resize_for_api(image: Image.Image) -> Image.Image:
    w, h = image.size
    longest = max(w, h)
    if longest <= _MAX_DIMENSION:
        return image
    scale = _MAX_DIMENSION / longest
    return image.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="PNG")
    return base64.standard_b64encode(buf.getvalue()).decode("utf-8")


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
    Sends the image to Claude's vision API and returns up to `num_candidates`
    ranked hypotheses: [{"text": str, "score": float}, ...], best-first --
    the same shape as ocr.read_text_candidates() so callers can use either
    interchangeably (see ocr.get_candidates, which picks between them).

    Returns [] if ANTHROPIC_API_KEY isn't configured or the call fails, so
    callers can fall back to TrOCR.
    """
    if not os.getenv("ANTHROPIC_API_KEY"):
        return []

    try:
        client = _get_client()
        resized = _resize_for_api(image)
        image_data = _encode_png(resized)

        response = client.messages.parse(
            model=_MODEL_NAME,
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/png", "data": image_data},
                    },
                    {"type": "text", "text": _PROMPT},
                ],
            }],
            output_format=_OCRResult,
        )
        result = response.parsed_output
    except Exception:
        logger.warning("Claude vision OCR failed; falling back to TrOCR.", exc_info=True)
        return []

    candidates = [
        {"text": c.text.strip(), "score": c.confidence}
        for c in result.candidates[:num_candidates]
        if c.text.strip()
    ]
    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates
