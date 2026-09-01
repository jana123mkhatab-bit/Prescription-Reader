"""
Pairwise drug interaction checking built on openFDA label text.

NLM's RxNav Drug Interaction API (interaction/list.json) -- the usual free,
no-auth source for this -- was permanently discontinued on 2024-01-02 with no
replacement. This substitutes a conservative, keyword-scored heuristic over
the same openFDA label fields drug_data.py already fetches: a drug's own
"Drug Interactions" / "Warnings" / "Boxed Warning" / "Contraindications" text
very often names the interacting drug or drug class directly, since that's
exactly what those label sections are for.

This is a screening heuristic, not a clinical decision -- every "moderate" or
"major" hit is marked pharmacist_review_recommended, and the app never
auto-blocks or silently drops a pair based on this alone.
"""
import re

from app.services import drug_data

_MAJOR_KEYWORDS = (
    "contraindicated",
    "should not be used",
    "should not be taken",
    "do not use",
    "do not administer",
    "avoid concomitant",
    "avoid concurrent",
    "fatal",
)
_MODERATE_KEYWORDS = (
    "increased risk",
    "increased exposure",
    "may increase",
    "may decrease",
    "may potentiate",
    "caution",
    "monitor",
    "close monitoring",
    "dose adjustment",
    "concomitant use",
)

# Pharm classes generic enough that sharing one isn't a meaningful interaction
# signal on its own (nearly every drug profile carries one of these).
_CLASS_OVERLAP_IGNORE = {"human", "drug"}


def _name_variants(profile: dict) -> list[str]:
    names = {profile.get("brand_name", ""), profile.get("generic_name", "")}
    return [n.lower() for n in names if n and len(n) > 2]


def _combined_text(profile: dict) -> str:
    return " ".join(
        (profile.get(field) or "")
        for field in ("drug_interactions", "warnings", "boxed_warning", "contraindications")
    ).lower()


def _severity_for_mention(text: str) -> str:
    if any(kw in text for kw in _MAJOR_KEYWORDS):
        return "major"
    if any(kw in text for kw in _MODERATE_KEYWORDS):
        return "moderate"
    return "minor"


def _mentions(text: str, name: str) -> bool:
    return re.search(rf"\b{re.escape(name)}\b", text) is not None


def _check_pair(name_a: str, profile_a: dict, name_b: str, profile_b: dict) -> dict | None:
    text_a, text_b = _combined_text(profile_a), _combined_text(profile_b)
    severities = []
    reasons = []

    for direction_name, other_names, text, source_label in (
        (name_a, _name_variants(profile_b), text_a, profile_a.get("brand_name") or name_a),
        (name_b, _name_variants(profile_a), text_b, profile_b.get("brand_name") or name_b),
    ):
        if any(_mentions(text, n) for n in other_names):
            severity = _severity_for_mention(text)
            severities.append(severity)
            reasons.append(f"{source_label}'s label text references the other medication or its drug class.")

    shared_classes = (set(profile_a.get("pharm_class") or []) & set(profile_b.get("pharm_class") or [])) - _CLASS_OVERLAP_IGNORE
    if shared_classes and not severities:
        severities.append("minor")
        reasons.append(f"Both medications share a drug class ({', '.join(sorted(shared_classes))}).")

    if not severities:
        return None

    order = {"minor": 0, "moderate": 1, "major": 2}
    top_severity = max(severities, key=lambda s: order[s])
    return {
        "drug_a": name_a,
        "drug_b": name_b,
        "severity": top_severity,
        "reason": " ".join(reasons),
        "flagged_for_review": top_severity in ("major", "moderate"),
    }


def check_interactions(drug_names: list[str]) -> dict:
    """
    drug_names: list of drug names as stored on the patient's medication list.
    Looks up each one's openFDA profile and screens every pair.
    Returns {"pairs": [...], "flagged_count": int, "unresolved": [str, ...]}.
    unresolved lists any drug name openFDA had no label for -- those pairs
    simply can't be screened, which is itself worth surfacing rather than
    silently treating as "no interaction found".
    """
    profiles: dict[str, dict | None] = {name: drug_data.get_drug_profile(name) for name in dict.fromkeys(drug_names)}
    unresolved = [name for name, profile in profiles.items() if profile is None]

    pairs = []
    resolved = [n for n in profiles if profiles[n] is not None]
    for i, name_a in enumerate(resolved):
        for name_b in resolved[i + 1 :]:
            pair = _check_pair(name_a, profiles[name_a], name_b, profiles[name_b])
            if pair:
                pairs.append(pair)

    return {
        "pairs": pairs,
        "flagged_count": sum(1 for p in pairs if p["flagged_for_review"]),
        "unresolved": unresolved,
    }
