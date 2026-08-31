"""
Maps raw (possibly messy) OCR text to real drug names using RxNorm's
approximate-match API. This is what gives us open-vocabulary matching
without needing our own drug-name dataset.
Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-Approximate-Match.getApproximateMatch.html
"""
import re
import requests

RXNORM_APPROX_URL = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"

# Patterns that are NOT part of the drug name and confuse RxNorm's name matcher:
# dosage amounts (500mg, 10ml, 0.5mcg), frequencies (twice daily, once a day),
# and common prescription abbreviations (bid, tid, qid, od, prn).
_DOSAGE_NOISE_RE = re.compile(
    r"""
    \b(
        \d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?|tablet|cap|capsule|tab|tabs|caps)  # amounts+units
        | (twice|once|three\s+times?|four\s+times?)\s+(a\s+)?(day|daily|week)   # frequency words
        | \b(bid|tid|qid|od|prn|po|stat|ac|pc|hs|q\d+h?)\b                      # Latin abbreviations
        | \d+\s*x\s*\d+                                                           # 2x2 style
        | \b\d+\b                                                                  # bare numbers
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _extract_drug_name(raw_text: str) -> str:
    """
    Strips dosage amounts, units, and frequency words from raw OCR output so
    only the drug name is sent to RxNorm's name-matching API.
    e.g. "Metformin 500mg twice daily" → "Metformin"
    """
    cleaned = _DOSAGE_NOISE_RE.sub(" ", raw_text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" .,;:")
    return cleaned or raw_text  # fall back to original if everything was stripped


def get_drug_candidates(raw_text: str, top_k: int = 5) -> list[dict]:
    """
    Returns top_k fuzzy-matched real drug names for messy OCR text:
    [{"drug_name": str, "match_score": float}, ...] sorted by score descending.
    match_score is normalized 0-1 (RxNorm returns 0-100 raw).
    """
    drug_name_only = _extract_drug_name(raw_text)
    params = {"term": drug_name_only, "maxEntries": top_k}
    resp = requests.get(RXNORM_APPROX_URL, params=params, timeout=10)
    if resp.status_code != 200:
        return []

    candidates = resp.json().get("approximateGroup", {}).get("candidate", [])
    if not candidates:
        return []

    results = []
    for c in candidates[:top_k]:
        name = c.get("candidate") or c.get("name")
        score = float(c.get("score", 0)) / 100.0
        if name:
            results.append({"drug_name": name, "match_score": score})

    return sorted(results, key=lambda r: r["match_score"], reverse=True)
