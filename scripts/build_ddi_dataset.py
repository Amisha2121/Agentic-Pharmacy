"""
Build a structured DDI CSV from the FDA openFDA drug labels API.
This creates data/fda_ddi.csv with columns:
  drug_name, interacts_with, description, severity
"""
import requests
import pandas as pd
import json, time, os

os.makedirs("data", exist_ok=True)

# Drugs of interest -- common pharmacy drugs to pre-seed the database
SEED_DRUGS = [
    "paracetamol", "acetaminophen", "ibuprofen", "aspirin", "amoxicillin",
    "ciprofloxacin", "metformin", "atorvastatin", "omeprazole", "lisinopril",
    "amlodipine", "metoprolol", "warfarin", "clopidogrel", "furosemide",
    "hydrochlorothiazide", "prednisone", "azithromycin", "doxycycline", "cetirizine",
    "loratadine", "ranitidine", "pantoprazole", "simvastatin", "losartan",
    "kivexa", "abacavir", "lamivudine", "ritonavir", "lopinavir",
    "sertraline", "fluoxetine", "amitriptyline", "diazepam", "alprazolam",
    "codeine", "tramadol", "morphine", "gabapentin", "pregabalin",
    "allopurinol", "colchicine", "hydroxychloroquine", "methotrexate", "adalimumab",
]

BASE = "https://api.fda.gov/drug/label.json"
records = []

print("Fetching DDI data from FDA openFDA API...")
for drug in SEED_DRUGS:
    try:
        url = f'{BASE}?search=openfda.generic_name:"{drug}"&limit=1'
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            # Try brand name field
            url = f'{BASE}?search=openfda.brand_name:"{drug}"&limit=1'
            r = requests.get(url, timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", [])
            if results:
                result = results[0]
                openfda = result.get("openfda", {})
                
                # Get canonical drug name
                brand = openfda.get("brand_name", [drug])[0].upper()
                generic = openfda.get("generic_name", [drug])[0].upper()
                primary_name = generic if generic else brand
                
                # Get drug interactions text
                ddi_text_list = result.get("drug_interactions", [])
                
                if ddi_text_list:
                    ddi_text = " ".join(ddi_text_list)
                    
                    # Parse out drug names mentioned in interactions
                    # Simple heuristic: split by common separators
                    import re
                    # Find capitalized drug names / common patterns
                    mentioned = re.findall(
                        r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b',
                        ddi_text
                    )
                    # Filter to likely drug names (short, not common words)
                    stop_words = {
                        "The", "When", "This", "Drug", "Use", "With", "May", "Can",
                        "Has", "For", "Are", "Has", "Not", "All", "And", "Or",
                        "Should", "These", "Some", "Other", "Such", "Any"
                    }
                    drugs_mentioned = [
                        m for m in set(mentioned)
                        if m not in stop_words and len(m) > 3
                    ]
                    
                    # Store full text record
                    records.append({
                        "drug_name": primary_name,
                        "brand_name": brand,
                        "generic_name": generic,
                        "interacts_with_list": ", ".join(drugs_mentioned[:20]),
                        "description": ddi_text[:1000],
                        "source": "FDA_openFDA",
                    })
                    print(f"  ✓ {primary_name}: {len(drugs_mentioned)} interactions found")
                else:
                    print(f"  - {primary_name}: no DDI text")
        else:
            print(f"  ✗ {drug}: HTTP {r.status_code}")
        
        time.sleep(0.12)  # FDA rate limit: ~240 req/min
    except Exception as e:
        print(f"  ERR {drug}: {e}")

df = pd.DataFrame(records)
print(f"\nTotal records: {len(df)}")
if not df.empty:
    df.to_csv("data/fda_ddi.csv", index=False)
    print("Saved to data/fda_ddi.csv")
    print(df[["drug_name","interacts_with_list"]].head(5).to_string())
