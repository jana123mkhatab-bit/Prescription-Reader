"""Quick OCR accuracy test — run with: python test_ocr.py"""
import warnings, os, sys
warnings.filterwarnings("ignore")
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
sys.path.insert(0, ".")

from PIL import Image, ImageDraw, ImageFont
from app.services.ocr import read_text
from app.services.rxnorm_match import _extract_drug_name, get_drug_candidates

test_drugs = ["Metformin", "Amoxicillin", "Lisinopril", "Ibuprofen", "Paracetamol"]

# Try to load a real system font at a readable size
def make_test_image(text, font_size=36):
    img = Image.new("RGB", (500, 100), "white")
    draw = ImageDraw.Draw(img)
    try:
        # Try common Windows fonts
        for font_path in [
            r"C:\Windows\Fonts\arial.ttf",
            r"C:\Windows\Fonts\calibri.ttf",
            r"C:\Windows\Fonts\times.ttf",
        ]:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break
        else:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()
    draw.text((20, 25), text, fill="black", font=font)
    return img

print("=" * 60)
print("OCR TEST — synthetic images with system font")
print("=" * 60)

passed = 0
for drug in test_drugs:
    img = make_test_image(f"{drug} 500mg")
    raw = read_text(img)
    cleaned = _extract_drug_name(raw)
    candidates = get_drug_candidates(raw)

    top = candidates[0]["drug_name"] if candidates else "NO MATCH"
    score = candidates[0]["match_score"] if candidates else 0.0

    match = drug.lower() in top.lower() or drug.lower() in cleaned.lower()
    status = "PASS" if match else "FAIL"
    if match:
        passed += 1
    print(f"\n[{status}] Expected : {drug}")
    print(f"      OCR read : {raw!r}")
    print(f"      Cleaned  : {cleaned!r}")
    print(f"      RxNorm   : {top}  (score={score:.2f})")

print(f"\n{'=' * 60}")
print(f"Score: {passed}/{len(test_drugs)}")
sys.exit(0)
