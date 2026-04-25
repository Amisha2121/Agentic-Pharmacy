"""
build_full_ddi_dataset.py
=========================
Downloads the Kaggle 11k medicine dataset, extracts clean drug names from the
'Medicine Name' column, queries the FDA openFDA drug labels API for each one,
and saves all DDI records to data/fda_ddi.csv.

Run once:  venv\Scripts\python.exe build_full_ddi_dataset.py
"""
import kagglehub
import os, re, time, random, requests, pandas as pd
from pathlib import Path

os.makedirs("data", exist_ok=True)
OUT_CSV = Path("data/fda_ddi.csv")
BASE_URL = "https://api.fda.gov/drug/label.json"

# ── 1. Load Kaggle dataset ──────────────────────────────────────────────────
print("Downloading Kaggle 11k medicine dataset...")
kaggle_path = kagglehub.dataset_download("singhnavjot2062001/11000-medicine-details")

medicine_df = None
for root, dirs, files in os.walk(kaggle_path):
    for f in files:
        full = os.path.join(root, f)
        try:
            medicine_df = pd.read_csv(full) if f.endswith(".csv") else pd.read_excel(full)
            print(f"Loaded: {f}  shape={medicine_df.shape}")
            print("Columns:", list(medicine_df.columns))
            break
        except Exception as e:
            print(f"  Skipping {f}: {e}")
    if medicine_df is not None:
        break

if medicine_df is None:
    raise RuntimeError("Could not load the Kaggle dataset file.")

# ── 2. Extract clean base drug names ────────────────────────────────────────
NAME_COL = "Medicine Name"  # adjust if column name differs

def clean_drug_name(raw: str) -> str:
    """
    Strip dosage/form info to get the base drug name.
    'Azithral 500 Tablet' → 'Azithral'
    'Avastin 400mg Injection' → 'Avastin'
    """
    raw = str(raw).strip()
    # Remove dosage numbers and units
    cleaned = re.sub(
        r'\s+\d[\d.,]*\s*(?:mg|mcg|ml|g|iu|%|units?|mcg/ml|mg/ml).*',
        '', raw, flags=re.IGNORECASE
    )
    # Remove trailing form words
    cleaned = re.sub(
        r'\s+(?:Tablet|Capsule|Injection|Syrup|Cream|Ointment|Drops?|Spray|'
        r'Suspension|Solution|Gel|Patch|Inhaler|Lotion|Strip|Sachet|Infusion)'
        r'[\w\s]*$',
        '', cleaned, flags=re.IGNORECASE
    ).strip()
    return cleaned

raw_names = medicine_df[NAME_COL].dropna().astype(str).tolist()
clean_names = list(dict.fromkeys(  # deduplicate preserving order
    n for n in (clean_drug_name(r) for r in raw_names) if len(n) > 2
))
print(f"\nTotal unique base names from Kaggle: {len(clean_names)}")
print("Sample:", clean_names[:10])

# ── 3. Load existing CSV to avoid re-fetching ───────────────────────────────
if OUT_CSV.exists():
    existing = pd.read_csv(OUT_CSV, dtype=str).fillna("")
    already_fetched = set(existing["drug_name"].str.upper())
    print(f"Existing records: {len(existing)}, already-fetched drugs: {len(already_fetched)}")
else:
    existing = pd.DataFrame()
    already_fetched = set()

# ── 4. Query openFDA for each drug name ─────────────────────────────────────
STOP_WORDS = {
    "The","When","This","Drug","Use","With","May","Can","Has","For","Are",
    "Not","All","And","Or","Should","These","Some","Other","Such","Any",
    "Drug","Patients","Administration","Concurrent","Following","Increased"
}

new_records = []
errors = 0
hits = 0
skipped = 0

total = len(clean_names)
for idx, drug in enumerate(clean_names, 1):
    if drug.upper() in already_fetched:
        skipped += 1
        continue

    if idx % 100 == 0:
        print(f"  [{idx}/{total}] hits={hits} skipped={skipped} errors={errors}")

    # Try three FDA search strategies
    search_urls = [
        f'{BASE_URL}?search=openfda.brand_name:"{drug}"&limit=1',
        f'{BASE_URL}?search=openfda.generic_name:"{drug}"&limit=1',
        f'{BASE_URL}?search=openfda.substance_name:"{drug}"&limit=1',
    ]
    found = False
    for url in search_urls:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 429:
                time.sleep(1)
                continue
            if r.status_code != 200:
                continue
            results = r.json().get("results", [])
            if not results:
                continue
            result = results[0]
            openfda = result.get("openfda", {})
            brand   = ", ".join(openfda.get("brand_name", [drug]))[:200].upper()
            generic = ", ".join(openfda.get("generic_name", [drug]))[:200].upper()
            primary = generic.split(",")[0].strip() or brand.split(",")[0].strip()

            ddi_text_list = result.get("drug_interactions", [])
            if not ddi_text_list:
                break  # drug found but no DDI text — not useful

            ddi_text = " ".join(ddi_text_list)
            # Extract co-mentioned drug names
            mentioned = re.findall(r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b', ddi_text)
            drugs_mentioned = [m for m in set(mentioned)
                               if m not in STOP_WORDS and len(m) > 3][:25]

            new_records.append({
                "drug_name":           primary,
                "brand_name":          brand[:200],
                "generic_name":        generic[:200],
                "interacts_with_list": ", ".join(drugs_mentioned),
                "description":         ddi_text[:1500],
                "source":              "FDA_openFDA",
            })
            already_fetched.add(primary)
            hits += 1
            found = True
            break
        except Exception as e:
            errors += 1
        time.sleep(0.13)  # stay under FDA rate limit (~240 req/min)

# ── 5. Save merged dataset ───────────────────────────────────────────────────
if new_records:
    new_df = pd.DataFrame(new_records).drop_duplicates(subset=["drug_name"])
    combined = pd.concat([existing, new_df], ignore_index=True).drop_duplicates(subset=["drug_name"])
    combined.to_csv(OUT_CSV, index=False)
    print(f"\n✅ Done! Total records saved: {len(combined)}")
    print(f"   New this run: {len(new_df)} | Skipped (already had): {skipped} | Errors: {errors}")
else:
    print("\nNo new records added.")

print(f"\nFinal dataset: {OUT_CSV} ({OUT_CSV.stat().st_size//1024}KB)")
