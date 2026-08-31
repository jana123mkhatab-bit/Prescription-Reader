"""
Reads text from a prescription image. `get_candidates` is the entry point the
rest of the app should use. It tries, in order:

  1. Gemini's vision API (app.services.gemini_ocr) if GEMINI_API_KEY is set
     -- free tier (Google AI Studio), no cost.
  2. Claude's vision API (app.services.vision_ocr) if ANTHROPIC_API_KEY is
     set -- paid, used only if Gemini isn't configured or fails.
  3. Local TrOCR (microsoft/trocr-base-handwritten) below -- always
     available, works offline, no API key needed.

Both vision APIs are large multimodal models that resolve ambiguous
handwriting far better than TrOCR (a small specialist OCR model with no
knowledge of real medication names) can. TrOCR remains as the last-resort
fallback so the app still works with no API keys configured at all.

The TrOCR path applies an OpenCV preprocessing pass on the crop and
beam-search decoding so it gets several ranked hypotheses instead of one
greedy read. Letting RxNorm's fuzzy matcher pick among several TrOCR readings
(see app.routes.prescription) is what compensates for TrOCR's tendency to
garble out-of-vocabulary drug names.

Requirements:
  pip install torch transformers opencv-python pillow numpy
"""

import logging
import re

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

logger = logging.getLogger(__name__)

_MODEL_NAME = "microsoft/trocr-base-handwritten"
_NUM_BEAMS = 5

_processor: TrOCRProcessor | None = None
_model: VisionEncoderDecoderModel | None = None


def _load_model():
    global _processor, _model
    if _model is None:
        logger.info("Loading TrOCR model %s ...", _MODEL_NAME)
        _processor = TrOCRProcessor.from_pretrained(_MODEL_NAME)
        _model = VisionEncoderDecoderModel.from_pretrained(_MODEL_NAME)
        _model.eval()
    return _processor, _model


def preprocess_image(image: Image.Image) -> tuple[Image.Image, list[str]]:
    """
    OpenCV preprocessing for the cropped drug-name image before it goes to
    TrOCR:
      1. Grayscale
      2. CLAHE contrast enhancement
      3. Light Gaussian blur (denoise) ahead of thresholding
      4. Otsu binarization -> clean black text on white background
      5. Deskew via minAreaRect over the text pixel cloud

    Returns (preprocessed_image, applied_steps). `image` itself is left
    untouched so the caller still has the original crop; `applied_steps` is a
    log of what actually ran, for debugging OCR accuracy on real scans.
    """
    applied: list[str] = []

    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    applied.append("grayscale")

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    contrasted = clahe.apply(gray)
    applied.append("clahe_contrast")

    blurred = cv2.GaussianBlur(contrasted, (3, 3), 0)
    applied.append("gaussian_denoise")

    _, binarized = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    applied.append("otsu_threshold")

    deskewed, angle = _deskew(binarized)
    if angle is not None:
        applied.append(f"deskew({angle:.2f}deg)")

    processed = Image.fromarray(deskewed).convert("RGB")  # TrOCR's processor expects RGB
    return processed, applied


def _deskew(binary_img: np.ndarray) -> tuple[np.ndarray, float | None]:
    """
    Estimates the rotation of the text via minAreaRect over the connected
    text-pixel cloud (all pixels surviving Otsu thresholding) and rotates to
    correct it. binary_img is black text (0) on white background (255).
    """
    # Text is dark on a light background after thresholding, so invert first:
    # findNonZero needs the text pixels to be the non-zero (foreground) ones.
    inverted = cv2.bitwise_not(binary_img)
    coords = cv2.findNonZero(inverted)
    if coords is None or len(coords) < 5:
        return binary_img, None

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]
    # cv2.minAreaRect's angle convention wraps at -90/0; normalize to [-45, 45]
    # so small tilts (the common case for a photographed prescription) don't
    # get read as a near-90-degree rotation.
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.5:
        return binary_img, None

    h, w = binary_img.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        binary_img, matrix, (w, h),
        flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=255,
    )
    return rotated, angle


def read_text_candidates(image: Image.Image, num_candidates: int = 5) -> list[dict]:
    """
    Runs TrOCR with beam search and returns up to `num_candidates` ranked
    hypotheses: [{"text": str, "score": float}, ...], best-first, ranked by
    the model's own beam sequence score (normalized log-probability, mapped
    to (0, 1] via exp()).
    """
    processor, model = _load_model()
    processed, applied_steps = preprocess_image(image)
    logger.info("OCR preprocessing applied: %s", applied_steps)

    pixel_values = processor(images=processed, return_tensors="pt").pixel_values

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            num_beams=_NUM_BEAMS,
            num_return_sequences=min(num_candidates, _NUM_BEAMS),
            output_scores=True,
            return_dict_in_generate=True,
            early_stopping=True,
        )

    texts = processor.batch_decode(outputs.sequences, skip_special_tokens=True)
    if outputs.sequences_scores is not None:
        log_scores = outputs.sequences_scores.tolist()
    else:
        log_scores = [0.0] * len(texts)

    candidates = []
    for text, log_score in zip(texts, log_scores):
        cleaned = re.sub(r"\s+", " ", text).strip()
        if not cleaned:
            continue
        candidates.append({"text": cleaned, "score": float(np.exp(log_score))})

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates


def get_candidates(image: Image.Image, num_candidates: int = 5) -> list[dict]:
    """
    Primary OCR entry point for the rest of the app. Tries Gemini's vision
    API first (app.services.gemini_ocr -- free tier), then Claude's vision
    API (app.services.vision_ocr -- paid), then falls back to local TrOCR
    beam search if neither API key is configured or both calls fail.
    """
    from app.services import gemini_ocr, vision_ocr

    gemini_candidates = gemini_ocr.read_text_candidates(image, num_candidates)
    if gemini_candidates:
        return gemini_candidates

    claude_candidates = vision_ocr.read_text_candidates(image, num_candidates)
    if claude_candidates:
        return claude_candidates

    logger.info("No vision API configured/available; using TrOCR.")
    return read_text_candidates(image, num_candidates)


def read_text(image: Image.Image) -> str:
    """Back-compat single-string read: best candidate from get_candidates()."""
    candidates = get_candidates(image, num_candidates=1)
    return candidates[0]["text"] if candidates else ""
