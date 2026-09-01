"""
Cross-checks a newly identified drug's openFDA label data against a
patient-entered allergy list. Deliberately conservative: any match, and any
allergy term we can't confidently rule out, is flagged for pharmacist review
rather than silently passed or silently blocked (the app never auto-blocks a
scan result outright).
"""
import re

# A handful of well-known drug-class synonyms for common allergy phrasing,
# so "penicillin" also catches a profile whose pharm_class says
# "Penicillin-class Antibacterial" etc. Deliberately small and additive --
# an allergy term not in this map still gets checked via substring/class match.
_CLASS_SYNONYMS = {
    "penicillin": ["penicillin"],
    "sulfa": ["sulfonamide"],
    "sulfonamide": ["sulfonamide"],
    "nsaid": ["nonsteroidal", "nsaid"],
    "aspirin": ["salicylate"],
    "codeine": ["opioid"],
    "morphine": ["opioid"],
}


def _profile_text(profile: dict) -> str:
    return " ".join(
        (profile.get(field) or "")
        for field in ("warnings", "boxed_warning", "contraindications", "drug_interactions", "indications")
    ).lower()


def check_allergy_conflict(profile: dict, allergies: list[str]) -> dict | None:
    """
    profile: a drug_data.get_drug_profile() result.
    allergies: patient-entered allergy strings, e.g. ["penicillin", "latex"].
    Returns None if there's nothing to flag, otherwise:
      {"conflict": bool, "reason": str, "flagged_for_review": True}
    flagged_for_review is always True whenever this returns non-None -- an
    allergy hit is exactly the kind of thing that should reach a pharmacist,
    whether it's a clear conflict or just an ambiguous name overlap.
    """
    if not allergies or not profile:
        return None

    text = _profile_text(profile)
    name_variants = [
        (profile.get("brand_name") or "").lower(),
        (profile.get("generic_name") or "").lower(),
    ]
    pharm_classes = [c.lower() for c in (profile.get("pharm_class") or [])]

    hits = []
    for raw in allergies:
        allergy = raw.strip().lower()
        if not allergy or len(allergy) < 3:
            continue

        # Direct name match: patient is allergic to the drug itself.
        if any(allergy in variant for variant in name_variants if variant):
            hits.append(f"You listed an allergy to \"{raw.strip()}\", which matches this medication's name directly.")
            continue

        # Class match, via synonym map or a direct substring against pharm_class.
        class_terms = _CLASS_SYNONYMS.get(allergy, [allergy])
        if any(term in pc for term in class_terms for pc in pharm_classes):
            hits.append(f"This medication's drug class overlaps with your listed allergy to \"{raw.strip()}\".")
            continue

        # Ambiguous: the allergy term shows up in warnings/contraindications
        # prose (often listing cross-reactive substances) without a clean
        # name/class match -- can't confidently rule this out.
        if re.search(rf"\b{re.escape(allergy)}\b", text):
            hits.append(f"\"{raw.strip()}\" appears in this medication's warnings text -- worth confirming with a pharmacist.")

    if not hits:
        return None

    return {
        "conflict": True,
        "reason": " ".join(hits),
        "flagged_for_review": True,
    }
