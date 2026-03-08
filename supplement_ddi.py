"""
Supplement the FDA DDI dataset with additional drugs / alternate names
that weren't caught by the first run. Appends new records to data/fda_ddi.csv.
"""
import requests, pandas as pd, time, io, os

BASE = "https://api.fda.gov/drug/label.json"

# Drug name -> search strategy (try both generic and brand field)
EXTRA_DRUGS = [
    "warfarin", "acetaminophen", "ibuprofen", "kivexa",
    "abacavir", "lamivudine", "naloxone", "buprenorphine",
    "fentanyl", "oxycodone", "insulin", "metformin", "atorvastatin",
    "omeprazole", "lisinopril", "amlodipine", "aspirin",
    "clopidogrel", "simvastatin", "losartan", "sertraline",
    "fluoxetine", "amitriptyline", "diazepam", "alprazolam",
]

existing = pd.read_csv("data/fda_ddi.csv", dtype=str)
existing_names = set(existing["drug_name"].str.upper())

new_records = []
print(f"Existing: {len(existing)} rows. Supplementing...")

for drug in EXTRA_DRUGS:
    # Try three search fields
    searches = [
        f'{BASE}?search=openfda.generic_name:"{drug}"&limit=1',
        f'{BASE}?search=openfda.brand_name:"{drug}"&limit=1',
        f'{BASE}?search=openfda.substance_name:"{drug}"&limit=1',
    ]
    found = False
    for url in searches:
        try:
            r = requests.get(url, timeout=12)
            if r.status_code != 200:
                continue
            results = r.json().get("results", [])
            if not results:
                continue
            result = results[0]
            openfda = result.get("openfda", {})
            brand   = openfda.get("brand_name", [drug])[0].upper()
            generic = openfda.get("generic_name", [drug])[0].upper()
            primary = generic or brand
            if primary in existing_names:
                print(f"  skip {primary} (already in DB)")
                found = True
                break
            ddi_text_list = result.get("drug_interactions", [])
            if not ddi_text_list:
                continue
            import re
            ddi_text = " ".join(ddi_text_list)
            mentioned = re.findall(r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b', ddi_text)
            stop = {"The","When","This","Drug","Use","With","May","Can","Has","For","Are",
                    "Not","All","And","Or","Should","These","Some","Other","Such","Any"}
            drugs_mentioned = [m for m in set(mentioned) if m not in stop and len(m) > 3]
            new_records.append({
                "drug_name": primary,
                "brand_name": brand,
                "generic_name": generic,
                "interacts_with_list": ", ".join(drugs_mentioned[:20]),
                "description": ddi_text[:1000],
                "source": "FDA_openFDA",
            })
            print(f"  + {primary}: {len(drugs_mentioned)} interactions")
            existing_names.add(primary)
            found = True
            break
        except Exception as e:
            print(f"  err {drug}: {e}")
        time.sleep(0.12)
    if not found:
        print(f"  - {drug}: not found in FDA API")

if new_records:
    new_df = pd.DataFrame(new_records)
    combined = pd.concat([existing, new_df], ignore_index=True)
    combined.to_csv("data/fda_ddi.csv", index=False)
    print(f"\nSaved {len(combined)} total rows to data/fda_ddi.csv")
else:
    print("\nNo new records to add.")
