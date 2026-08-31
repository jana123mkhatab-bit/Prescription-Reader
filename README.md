# Prescription AI Co-Worker

AI co-worker for pharmacy staff and patients: reads handwritten prescriptions, cross-checks
predictions against the patient's diagnosis, flags low-confidence reads for human review, and
generates a plain-language patient summary (indications, dosage, side effects, nutrition notes).

## Architecture
Open-vocabulary pipeline — no custom training data required:
1. **OCR** — Gemini's vision API (gemini-3.5-flash, free tier) reads the raw handwritten text from the prescription image, using its knowledge of real medication names to resolve ambiguous handwriting the way a pharmacist would. Falls back to Claude's vision API (claude-opus-5, paid) if `GEMINI_API_KEY` isn't configured or the call fails, then to pretrained TrOCR (microsoft/trocr-base-handwritten) if neither key is set, so the app still works offline. No fine-tuning needed either way. See `backend/app/services/gemini_ocr.py`, `backend/app/services/vision_ocr.py`, and `backend/app/services/ocr.py`.
2. **Fuzzy matching** — RxNorm's approximate-match API maps that raw (possibly messy) text to real drug name candidates, ranked by match score. This is what makes the system open-vocabulary — not limited to a fixed set of trained classes.
3. **Canonicalization** — each candidate is looked up in openFDA for its full drug profile.
4. **Diagnosis matching** — Gemini embeddings (gemini-embedding-001, free tier) compute semantic similarity between the patient's stated diagnosis/symptoms and each candidate's indications, re-ranking candidates and flagging low-confidence matches for pharmacist review.
5. **Patient summary** — Gemini (gemini-3.5-flash, free tier) turns the raw FDA label data into a short, plain-language explanation for the patient. See `backend/app/services/gemini_ai.py`.

### The review flag
`flagged_for_review` fires if *either*: the OCR→RxNorm match score is low (handwriting was ambiguous), or the diagnosis match score is low (the top drug doesn't semantically fit the stated diagnosis). It never silently auto-approves a low-confidence result — the UI must surface it as needing pharmacist verification.

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your GEMINI_API_KEY (free -- powers OCR, diagnosis matching, and patient summaries); ANTHROPIC_API_KEY is an optional paid OCR fallback
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` if your backend isn't on `localhost:8000`.

## Still needed
- [ ] Test with real handwritten prescription samples (crop to just the drug name for best OCR results)
- [ ] Tune MATCH_SCORE_THRESHOLD / DIAGNOSIS_MATCH_THRESHOLD in app/routes/prescription.py
- [ ] Record demo video (max 3 min) once working end-to-end

## Safety note
This tool is a decision-support aid, not a replacement for pharmacist or doctor judgment.
All low-confidence or diagnosis-mismatched predictions are flagged for human review rather
than auto-approved.
