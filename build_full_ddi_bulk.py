"""
build_full_ddi_bulk.py
======================
FAST approach: bulk-fetches FDA drug labels with drug_interactions text using
pagination (1000 records per API call), then cross-references with Kaggle
medicine names to keep only relevant drugs.

This covers thousands of drugs in ~20 minutes instead of 7+ hours.

Run once:  venv\Scripts\python.exe build_full_ddi_bulk.py
"""
import kagglehub, os, re, time, requests, pandas as pd
from pathlib import Path

os.makedirs("data", exist_ok=True)
OUT_CSV = Path("data/fda_ddi.csv")
BASE_URL = "https://api.fda.gov/drug/label.json"

# ── 1. Load Kaggle medicine names ────────────────────────────────────────────
print("Loading Kaggle 11k medicine dataset...")
kaggle_path = kagglehub.dataset_download("singhnavjot2062001/11000-medicine-details")

medicine_df = None
for root, dirs, files in os.walk(kaggle_path):
    for f in files:
        full = os.path.join(root, f)
        try:
            medicine_df = pd.read_csv(full) if f.endswith(".csv") else pd.read_excel(full)
            print(f"  Loaded {f}: {medicine_df.shape[0]} rows")
            break
        except: pass
    if medicine_df is not None:
        break

NAME_COL = "Medicine Name"

def clean_name(raw: str) -> str:
    raw = str(raw).strip()
    # Strip dosage (e.g. "500mg", "400 Injection")
    cleaned = re.sub(
        r'\s+\d[\d.,]*\s*(?:mg|mcg|ml|g|iu|%|units?|mcg/ml|mg/ml).*',
        '', raw, flags=re.IGNORECASE
    )
    # Strip trailing form words
    cleaned = re.sub(
        r'\s+(?:Tablet|Capsule|Injection|Syrup|Cream|Ointment|Drops?|Spray|'
        r'Suspension|Solution|Gel|Patch|Inhaler|Lotion|Strip|Sachet|Infusion|'
        r'Duo|LS|Plus|Forte|Junior|XR|XL|SR|ER|CR|DS)[\w\s]*$',
        '', cleaned, flags=re.IGNORECASE
    ).strip()
    return cleaned

kaggle_names = set(
    clean_name(n).upper()
    for n in medicine_df[NAME_COL].dropna()
    if len(clean_name(str(n))) > 2
)
print(f"  Unique base drug names from Kaggle: {len(kaggle_names)}")
print(f"  Sample: {list(kaggle_names)[:8]}")

# ── 2. Load existing dataset ─────────────────────────────────────────────────
if OUT_CSV.exists():
    existing = pd.read_csv(OUT_CSV, dtype=str).fillna("")
    already = set(existing["drug_name"].str.upper())
    print(f"\nExisting records: {len(existing)}")
else:
    existing = pd.DataFrame()
    already = set()

# ── 3. Bulk-fetch FDA labels ─────────────────────────────────────────────────
STOP_WORDS = {
    "The","When","This","Drug","Use","With","May","Can","Has","For","Are",
    "Not","All","And","Or","Should","These","Some","Other","Such","Any",
    "Patients","Administration","Concurrent","Following","Increased","After",
    "Before","During","Than","More","Less","Because","Although","Also"
}

new_records = []
total_fetched = 0
page = 0
PAGE_SIZE = 100   # safe limit per FDA API (max 1000, but 100 avoids timeouts)
MAX_PAGES = 300   # up to 30,000 labels checked

print(f"\nBulk-fetching FDA labels with drug interaction data...")
print(f"Looking for matches against {len(kaggle_names)} Kaggle medicine names...")
print(f"(Will check up to {MAX_PAGES * PAGE_SIZE} FDA records)\n")

while page < MAX_PAGES:
    skip = page * PAGE_SIZE
    url = (
        f"{BASE_URL}?search=_exists_:drug_interactions"
        f"&limit={PAGE_SIZE}&skip={skip}"
    )
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 429:
            print(f"  Rate-limited at page {page}, waiting 5s...")
            time.sleep(5)
            continue
        if r.status_code != 200:
            print(f"  HTTP {r.status_code} at page {page}, stopping.")
            break
        data = r.json()
        results = data.get("results", [])
        if not results:
            print(f"  No more results at page {page}. Done.")
            break

        for result in results:
            total_fetched += 1
            openfda = result.get("openfda", {})
            brands  = [b.upper() for b in openfda.get("brand_name", [])]
            generics= [g.upper() for g in openfda.get("generic_name", [])]
            all_names = brands + generics

            # Check if ANY of this drug's names match the Kaggle list
            matched_name = None
            for n in all_names:
                # Exact or substring match against Kaggle set
                if n in kaggle_names:
                    matched_name = n
                    break
                # Check if any Kaggle name is a substring of this name or vice versa
                for kname in kaggle_names:
                    if kname in n or n in kname:
                        matched_name = n
                        break
                if matched_name:
                    break

            if not matched_name:
                continue
            if matched_name in already:
                continue

            ddi_text_list = result.get("drug_interactions", [])
            if not ddi_text_list:
                continue

            ddi_text = " ".join(ddi_text_list)
            mentioned = re.findall(r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b', ddi_text)
            drugs_mentioned = [m for m in set(mentioned)
                               if m not in STOP_WORDS and len(m) > 3][:25]

            primary = (generics[0] if generics else brands[0] if brands else matched_name)
            brand   = brands[0] if brands else ""
            generic = generics[0] if generics else ""

            new_records.append({
                "drug_name":           primary[:200],
                "brand_name":          brand[:200],
                "generic_name":        generic[:200],
                "interacts_with_list": ", ".join(drugs_mentioned),
                "description":         ddi_text[:1500],
                "source":              "FDA_openFDA",
            })
            already.add(primary)

        matched_this_run = len(new_records)
        if page % 10 == 0:
            print(f"  Page {page:3d} | FDA records checked: {total_fetched:,} "
                  f"| Kaggle matches found: {matched_this_run}")

        page += 1
        time.sleep(0.25)   # polite delay

    except Exception as e:
        print(f"  Error at page {page}: {e}")
        page += 1
        time.sleep(1)

# ── 4. Save ───────────────────────────────────────────────────────────────────
print(f"\nTotal FDA records scanned: {total_fetched:,}")
print(f"New Kaggle-matched records found: {len(new_records)}")

if new_records:
    new_df = pd.DataFrame(new_records).drop_duplicates(subset=["drug_name"])
    combined = pd.concat([existing, new_df], ignore_index=True).drop_duplicates(subset=["drug_name"])
    combined.to_csv(OUT_CSV, index=False)
    print(f"\n✅ Saved {len(combined)} total records to {OUT_CSV}")
    print(combined[["drug_name","interacts_with_list"]].tail(10).to_string())
else:
    print("No new records to add.")
