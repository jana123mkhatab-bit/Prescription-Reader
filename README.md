# Prescription AI Co-Worker

AI co-worker for pharmacy staff and patients: reads handwritten prescriptions, cross-checks
predictions against the patient's diagnosis, flags low-confidence reads for human review, and
generates a plain-language patient summary (indications, dosage, side effects, nutrition notes).

## Problem statement
Handwritten prescriptions are a well-documented source of medication errors: ambiguous
handwriting leads to misread drug names, and pharmacists have no fast way to cross-check a
read drug against the patient's actual diagnosis before dispensing. Patients, in turn, are
handed dense FDA label text they can't easily act on — dosage, side effects, and interactions
buried in clinical language. Errors here have real safety consequences, and the manual
verification process is slow and inconsistent.

## Solution description
Prescription AI Co-Worker is a two-sided web app (pharmacist + patient) that:
- Reads a photo of a handwritten prescription and identifies the medication.
- Cross-references the read against the patient's stated diagnosis, flagging any mismatch.
- Routes low-confidence reads to a pharmacist review queue instead of auto-approving them.
- Generates a plain-language summary for the patient (what it's for, how to take it, side
  effects, nutrition notes) once a pharmacist confirms the drug.

It's explicitly a decision-support tool, not an autonomous prescriber — every uncertain result
is surfaced for a human to confirm.

## Selected challenge theme
Wildcard — submitted to the **Build with IBM BOB** hackathon under the open/wildcard track
(not tied to one of the fixed problem statements).

## AI approach and architecture
Open-vocabulary pipeline — no custom training data required:
1. **OCR** — Gemini's vision API (gemini-3.5-flash, free tier) reads the raw handwritten text from the prescription image, using its knowledge of real medication names to resolve ambiguous handwriting the way a pharmacist would. Falls back to pretrained TrOCR (microsoft/trocr-base-handwritten) if `GEMINI_API_KEY` isn't set or the call fails, so the app still works offline. No fine-tuning needed either way. See `backend/app/services/gemini_ocr.py` and `backend/app/services/ocr.py`.
2. **Fuzzy matching** — RxNorm's approximate-match API maps that raw (possibly messy) text to real drug name candidates, ranked by match score. This is what makes the system open-vocabulary — not limited to a fixed set of trained classes.
3. **Canonicalization** — each candidate is looked up in openFDA for its full drug profile.
4. **Diagnosis matching** — Gemini embeddings (gemini-embedding-001, free tier) compute semantic similarity between the patient's stated diagnosis/symptoms and each candidate's indications, re-ranking candidates and flagging low-confidence matches for pharmacist review.
5. **Patient summary** — Gemini (gemini-3.5-flash, free tier) turns the raw FDA label data into a short, plain-language explanation for the patient. See `backend/app/services/gemini_ai.py`.

### The review flag
`flagged_for_review` fires if *either*: the OCR→RxNorm match score is low (handwriting was ambiguous), or the diagnosis match score is low (the top drug doesn't semantically fit the stated diagnosis). It never silently auto-approves a low-confidence result — the UI must surface it as needing pharmacist verification.

## How IBM BOB was used
IBM BOB was used as the primary coding assistant for the OCR pipeline rework in
`backend/app/services/ocr.py` and `backend/app/routes/prescription.py`:

- **Caught a conflict before coding.** The request assumed TrOCR, but `ocr.py` had a
  documented prior decision to use Tesseract instead, because TrOCR was found to hallucinate
  on out-of-vocabulary drug names. BOB surfaced that conflict via a clarifying question
  instead of silently picking a side; the decision was made to reintroduce TrOCR as
  originally requested.
- **Rewrote `ocr.py`** — added an OpenCV preprocessing pipeline (grayscale → CLAHE contrast →
  Gaussian denoise → Otsu binarize → minAreaRect-based deskew, with each step logged for
  debugging) and replaced the single greedy TrOCR read with `read_text_candidates()`, using
  beam search (`num_beams=5`, `num_return_sequences=5`) to return 5 ranked hypotheses instead
  of one.
- **Updated `prescription.py`** — added `_best_ocr_hypothesis()`, which runs RxNorm
  fuzzy-matching against all 5 hypotheses concurrently (`asyncio.gather`/`to_thread`),
  combines each hypothesis's OCR confidence with its RxNorm match score (0.4/0.6 weighting),
  logs all 5 for debugging, and picks the winner. This replaced the old single-shot OCR +
  RxNorm call in the `/analyze` route, leaving the `flagged_for_review` threshold logic
  untouched.
- **Updated `requirements.txt`** — swapped `pytesseract` out for `torch`, `transformers`,
  `opencv-python`.
- **Actually tested it, not just wrote it**: installed the missing `opencv-python`
  dependency, then ran the real pipeline three times — preprocessing alone, TrOCR beam search
  alone (confirmed 5 distinct ranked hypotheses, including a deskew trigger on a rotated
  crop), and the full `_best_ocr_hypothesis` flow end-to-end against the live RxNorm API —
  before reporting it done. It also flagged an unrelated pre-existing quirk noticed while
  testing (RxNorm's match scores coming back low even on exact matches) rather than silently
  fixing or ignoring it.

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your GEMINI_API_KEY (free -- powers OCR, diagnosis matching, and patient summaries)
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```




## Safety note
This tool is a decision-support aid, not a replacement for pharmacist or doctor judgment.
All low-confidence or diagnosis-mismatched predictions are flagged for human review rather
than auto-approved.
