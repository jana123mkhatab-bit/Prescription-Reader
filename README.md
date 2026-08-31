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
1. **OCR** — Gemini's vision API (gemini-3.5-flash, free tier) reads the raw handwritten text from the prescription image, using its knowledge of real medication names to resolve ambiguous handwriting the way a pharmacist would. Falls back to Claude's vision API (claude-opus-5, paid) if `GEMINI_API_KEY` isn't configured or the call fails, then to pretrained TrOCR (microsoft/trocr-base-handwritten) if neither key is set, so the app still works offline. No fine-tuning needed either way. See `backend/app/services/gemini_ocr.py`, `backend/app/services/vision_ocr.py`, and `backend/app/services/ocr.py`.
2. **Fuzzy matching** — RxNorm's approximate-match API maps that raw (possibly messy) text to real drug name candidates, ranked by match score. This is what makes the system open-vocabulary — not limited to a fixed set of trained classes.
3. **Canonicalization** — each candidate is looked up in openFDA for its full drug profile.
4. **Diagnosis matching** — Gemini embeddings (gemini-embedding-001, free tier) compute semantic similarity between the patient's stated diagnosis/symptoms and each candidate's indications, re-ranking candidates and flagging low-confidence matches for pharmacist review.
5. **Patient summary** — Gemini (gemini-3.5-flash, free tier) turns the raw FDA label data into a short, plain-language explanation for the patient. See `backend/app/services/gemini_ai.py`.

### The review flag
`flagged_for_review` fires if *either*: the OCR→RxNorm match score is low (handwriting was ambiguous), or the diagnosis match score is low (the top drug doesn't semantically fit the stated diagnosis). It never silently auto-approves a low-confidence result — the UI must surface it as needing pharmacist verification.

## How AI development tools were used
This repository was prepared for public release with help from **Claude Code** (Anthropic),
used as a coding/repo-ops assistant:
- Audited the working tree before making the repo public and caught a real, live-valued
  `backend/.env` (Gemini/Anthropic API keys) that would otherwise have been committed.
- Authored the `.gitignore` (excluding secrets, `venv/`, `node_modules/`, `.next/`,
  `__pycache__/`, logs, and scratch API-response captures).
- Initialized the git repository, staged the correct file set, and connected/pushed it to
  the public GitHub remote.
- Authored this README against the hackathon's required submission format.

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
