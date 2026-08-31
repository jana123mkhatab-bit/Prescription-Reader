"""
Looks up drug info from openFDA (no API key required for low-volume use).
Docs: https://open.fda.gov/apis/drug/label/
"""
import requests

OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"


def get_drug_profile(drug_name: str) -> dict | None:
    """
    Returns a normalized profile for a drug, or None if not found.
    {
        "brand_name": str,
        "generic_name": str,
        "indications": str,
        "dosage": str,
        "side_effects": str,
        "warnings": str,
    }
    """
    params = {
        "search": f'openfda.generic_name:"{drug_name}" OR openfda.brand_name:"{drug_name}"',
        "limit": 1,
    }
    try:
        resp = requests.get(OPENFDA_LABEL_URL, params=params, timeout=10)
    except requests.exceptions.RequestException:
        return None
    if resp.status_code != 200:
        return None

    results = resp.json().get("results", [])
    if not results:
        return None

    r = results[0]
    openfda = r.get("openfda", {})

    def first(field, default=""):
        val = r.get(field)
        return val[0] if val else default

    return {
        "brand_name": (openfda.get("brand_name") or [drug_name])[0],
        "generic_name": (openfda.get("generic_name") or [drug_name])[0],
        "indications": first("indications_and_usage", "Not available."),
        "dosage": first("dosage_and_administration", "Not specified — consult your doctor or pharmacist."),
        "side_effects": first("adverse_reactions", "Not available."),
        "warnings": first("warnings", ""),
    }
