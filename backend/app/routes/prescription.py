import asyncio
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
import io

from app.services import ocr, rxnorm_match, drug_data, gemini_ai, scan_store

router = APIRouter()
logger = logging.getLogger(__name__)

MATCH_SCORE_THRESHOLD = 0.5  # below this, flag for pharmacist review
DIAGNOSIS_MATCH_THRESHOLD = 0.5

# Weights for combining an OCR hypothesis's own confidence with how well it
# fuzzy-matches a real drug name in RxNorm, to pick the best of several OCR
# readings (from Claude's vision API, or TrOCR beam search as a fallback -- see
# app.services.ocr.get_candidates). RxNorm match is weighted higher: a
# hypothesis that reads as a real drug name is a much stronger signal than the
# OCR engine's own confidence.
OCR_SCORE_WEIGHT = 0.4
RXNORM_SCORE_WEIGHT = 0.6

UNAVAILABLE_SUMMARY = {
    "structured": False,
    "what_its_for": None,
    "how_to_take": None,
    "side_effects": None,
    "nutrition_notes": None,
    "error": "AI summary unavailable — configure GEMINI_API_KEY.",
}


async def _best_ocr_hypothesis(pil_image: Image.Image) -> tuple[str, list[dict], float]:
    """
    Gets the OCR engine's top ranked hypotheses (Claude vision API, or TrOCR
    beam search as a fallback), fuzzy-matches EACH of them against RxNorm in
    parallel, and returns the (raw_text, candidates, ocr_score) for whichever
    hypothesis scored highest overall -- combining the hypothesis's own
    confidence with its best RxNorm match score. This lets a lower-ranked OCR
    guess "win" over the engine's top pick when it reads closer to a real
    drug name.
    """
    hypotheses = ocr.get_candidates(pil_image, num_candidates=5)
    if not hypotheses:
        return "", [], 0.0

    async def _lookup(hyp: dict) -> tuple[dict, list[dict]]:
        try:
            candidates = await asyncio.to_thread(rxnorm_match.get_drug_candidates, hyp["text"], 5)
        except Exception:
            logger.warning("RxNorm lookup failed for hypothesis %r", hyp["text"], exc_info=True)
            candidates = []
        return hyp, candidates

    results = await asyncio.gather(*(_lookup(h) for h in hypotheses))

    scored = []
    for hyp, candidates in results:
        top_match_score = candidates[0]["match_score"] if candidates else 0.0
        combined = OCR_SCORE_WEIGHT * hyp["score"] + RXNORM_SCORE_WEIGHT * top_match_score
        scored.append((combined, hyp, candidates))
        # Temporary debug logging (per beam-search tuning task): shows all 5
        # hypotheses and their RxNorm match scores so it's easy to check
        # whether beam search is surfacing better readings on real images,
        # and whether num_beams needs adjusting.
        logger.info(
            "OCR hypothesis %r (beam_score=%.3f) -> best RxNorm match %r (score=%.3f), combined=%.3f",
            hyp["text"],
            hyp["score"],
            candidates[0]["drug_name"] if candidates else None,
            top_match_score,
            combined,
        )

    scored.sort(key=lambda s: s[0], reverse=True)
    best_combined, best_hyp, best_candidates = scored[0]
    logger.info(
        "Selected OCR hypothesis: %r (combined_score=%.3f)", best_hyp["text"], best_combined
    )
    return best_hyp["text"], best_candidates, best_hyp["score"]


@router.post("/analyze")
async def analyze_prescription(
    image: UploadFile = File(...),
    diagnosis: str = Form(""),
    source: str = Form("patient"),
):
    """
    Full pipeline (open-vocabulary, no custom training data required):
    1. Claude's vision API (or TrOCR as a fallback) reads the raw handwritten
       text from the prescription image
    2. RxNorm approximate-match maps that raw text to real drug name candidates
    3. Look up each candidate's profile via openFDA
    4. If a diagnosis/symptom string is provided, re-rank candidates by semantic match
    5. Generate a plain-language patient summary for the top candidate

    Every request is persisted as a scan record (see app.services.scan_store) so it
    shows up in the pharmacist queue/analytics, regardless of whether it was submitted
    from patient or pharmacist mode.
    """
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file.")

    # Steps 1-2: the OCR engine yields 5 ranked hypotheses; each is
    # fuzzy-matched against RxNorm in parallel, and the hypothesis whose
    # match scored best overall (OCR confidence + RxNorm score) wins.
    raw_text, candidates, ocr_score = await _best_ocr_hypothesis(pil_image)
    if not raw_text:
        raise HTTPException(status_code=422, detail="Could not read any text from the image.")

    # _extract_drug_name strips dosage noise from the winning reading so RxNorm/UI get a clean name
    cleaned_drug_name = rxnorm_match._extract_drug_name(raw_text)

    if not candidates:
        # No OCR->drug match at all: still a valid, persistable result (not a crash) so the
        # frontend can show a "try a clearer photo" recovery state instead of a raw error.
        record = scan_store.create_scan(
            {
                "raw_ocr_text": raw_text,
                "candidates": [],
                "top_pick": None,
                "flagged_for_review": True,
                "patient_summary": None,
                "diagnosis": diagnosis,
                "source": source,
            },
            contents,
        )
        return record

    for c in candidates:
        c["confidence"] = c["match_score"]  # keep field name consistent for downstream code

    # Step 3: attach drug profiles
    for c in candidates:
        c["profile"] = drug_data.get_drug_profile(c["drug_name"])

    # Step 4: re-rank by diagnosis match, if provided (degrades gracefully if Gemini isn't configured)
    flagged_low_confidence = candidates[0]["match_score"] < MATCH_SCORE_THRESHOLD
    if diagnosis.strip():
        try:
            candidates = gemini_ai.rank_candidates_by_diagnosis(candidates, diagnosis)
            if candidates[0]["combined_score"] < DIAGNOSIS_MATCH_THRESHOLD:
                flagged_low_confidence = True
        except Exception:
            logger.warning("Diagnosis ranking failed (Gemini unavailable?); falling back to confidence sort.", exc_info=True)
            candidates = sorted(candidates, key=lambda c: c["confidence"], reverse=True)
    else:
        candidates = sorted(candidates, key=lambda c: c["confidence"], reverse=True)

    top = candidates[0]

    # Step 5: patient-facing summary (only if we found a real profile)
    patient_summary = None
    if top.get("profile"):
        try:
            patient_summary = gemini_ai.generate_patient_summary(top["profile"], diagnosis)
        except Exception:
            logger.warning("Patient summary generation failed (Gemini unavailable?).", exc_info=True)
            patient_summary = UNAVAILABLE_SUMMARY

    record = scan_store.create_scan(
        {
            "raw_ocr_text": raw_text,
            "cleaned_drug_name": cleaned_drug_name,
            "candidates": candidates,
            "top_pick": top,
            "flagged_for_review": flagged_low_confidence or not top.get("profile"),
            "patient_summary": patient_summary,
            "diagnosis": diagnosis,
            "source": source,
        },
        contents,
    )
    return record
