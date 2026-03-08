"""
ddi_lookup.py — Structured Drug-Drug Interaction Lookup Tool

Uses a pandas DataFrame loaded from the FDA openFDA-sourced CSV to perform
deterministic, exact lookups. No LLM guessing; strictly reads the validated dataset.

Columns in data/fda_ddi.csv:
  drug_name, brand_name, generic_name, interacts_with_list, description, source
"""
import os
import re
import pandas as pd
from functools import lru_cache

_DDI_CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "fda_ddi.csv")

# International Non-proprietary Name (INN) → FDA canonical name map.
# Covers common non-US brand/INN names that the FDA database lists differently.
_INN_SYNONYMS: dict[str, str] = {
    "PARACETAMOL":    "ACETAMINOPHEN",
    "KIVEXA":         "ABACAVIR",           # Kivexa = abacavir/lamivudine combo
    "PETHIDINE":      "MEPERIDINE",
    "ADRENALINE":     "EPINEPHRINE",
    "LIGNOCAINE":     "LIDOCAINE",
    "SALBUTAMOL":     "ALBUTEROL",
    "FRUSEMIDE":      "FUROSEMIDE",
    "GLIBENCLAMIDE":  "GLYBURIDE",
    "TRIMETHOPRIM SULFAMETHOXAZOLE": "SULFAMETHOXAZOLE",
    "CO-AMOXICLAV":   "AMOXICILLIN",
    "AUGMENTIN":      "AMOXICILLIN",
}

@lru_cache(maxsize=1)
def _load_df() -> pd.DataFrame:
    """Load and cache the DDI CSV. Returns empty DataFrame if file not found."""
    if not os.path.exists(_DDI_CSV_PATH):
        return pd.DataFrame(columns=["drug_name", "brand_name", "generic_name",
                                     "interacts_with_list", "description", "source"])
    df = pd.read_csv(_DDI_CSV_PATH, dtype=str).fillna("")
    # Normalise to uppercase for case-insensitive matching
    df["_name_upper"] = df["drug_name"].str.upper().str.strip()
    df["_brand_upper"] = df["brand_name"].str.upper().str.strip()
    df["_generic_upper"] = df["generic_name"].str.upper().str.strip()
    return df


def _normalise(name: str) -> str:
    """Strip, uppercase, collapse whitespace, and resolve INN synonyms."""
    key = re.sub(r"\s+", " ", name.strip().upper())
    return _INN_SYNONYMS.get(key, key)


def lookup_drug(drug_name: str) -> dict | None:
    """
    Return the DDI record for a drug by name (case-insensitive).
    Searches drug_name, brand_name, and generic_name columns.
    Returns None if not found.
    """
    df = _load_df()
    if df.empty:
        return None
    key = _normalise(drug_name)
    mask = (
        df["_name_upper"].str.contains(key, regex=False) |
        df["_brand_upper"].str.contains(key, regex=False) |
        df["_generic_upper"].str.contains(key, regex=False)
    )
    matches = df[mask]
    if matches.empty:
        return None
    row = matches.iloc[0]
    return {
        "drug_name":          row["drug_name"],
        "brand_name":         row["brand_name"],
        "generic_name":       row["generic_name"],
        "interacts_with_list": row["interacts_with_list"],
        "description":        row["description"],
        "source":             row["source"],
    }


def check_interaction(drug_a: str, drug_b: str) -> dict:
    """
    Check whether drug_a's FDA label mentions drug_b as an interacting substance,
    and vice versa.

    Returns a dict with keys:
      found (bool), drug_a_record, drug_b_record,
      a_mentions_b (bool), b_mentions_a (bool),
      interaction_text (str or None), source (str)
    """
    rec_a = lookup_drug(drug_a)
    rec_b = lookup_drug(drug_b)

    norm_b = _normalise(drug_b)
    norm_a = _normalise(drug_a)

    a_mentions_b = False
    b_mentions_a = False
    interaction_text = None

    if rec_a:
        desc_a = rec_a["description"].upper()
        inter_a = rec_a["interacts_with_list"].upper()
        if norm_b in desc_a or norm_b in inter_a:
            a_mentions_b = True
            # Extract the sentence(s) mentioning drug_b
            sentences = re.split(r"(?<=[.!?])\s+", rec_a["description"])
            hits = [s for s in sentences if norm_b in s.upper()]
            interaction_text = " ".join(hits[:3]) if hits else rec_a["description"][:400]

    if rec_b:
        desc_b = rec_b["description"].upper()
        inter_b = rec_b["interacts_with_list"].upper()
        if norm_a in desc_b or norm_a in inter_b:
            b_mentions_a = True
            if not interaction_text:
                sentences = re.split(r"(?<=[.!?])\s+", rec_b["description"])
                hits = [s for s in sentences if norm_a in s.upper()]
                interaction_text = " ".join(hits[:3]) if hits else rec_b["description"][:400]

    return {
        "found":           bool(rec_a or rec_b),
        "drug_a_in_db":    rec_a is not None,
        "drug_b_in_db":    rec_b is not None,
        "a_mentions_b":    a_mentions_b,
        "b_mentions_a":    b_mentions_a,
        "interaction_detected": a_mentions_b or b_mentions_a,
        "interaction_text": interaction_text,
        "source":          "FDA openFDA Drug Labels",
    }


def get_all_interactions_for(drug_name: str) -> str:
    """
    Return a formatted string of all known interactions for a drug.
    Returns a 'not found' message if the drug is absent from the dataset.
    """
    rec = lookup_drug(drug_name)
    if not rec:
        return f"'{drug_name}' was not found in the FDA DDI dataset."
    lines = [
        f"**{rec['drug_name']}** (brand: {rec['brand_name']} | generic: {rec['generic_name']})",
        f"**Known interacting substances:** {rec['interacts_with_list'] or 'None listed'}",
        f"**FDA Interaction Text:**",
        rec["description"][:600] + ("..." if len(rec["description"]) > 600 else ""),
        f"_Source: {rec['source']}_",
    ]
    return "\n".join(lines)


def format_interaction_result(drug_a: str, drug_b: str) -> str:
    """
    User-friendly interaction check result.
    Written for pharmacists and patients — no technical jargon.
    """
    result = check_interaction(drug_a, drug_b)

    # Display names (use what the user typed, but title-cased)
    name_a = drug_a.title()
    name_b = drug_b.title()

    if not result["found"]:
        return (
            f"We don't have specific data on **{name_a}** or **{name_b}** in our drug "
            f"interaction database right now.\n\n"
            f"**Please consult a pharmacist or your doctor before taking these together.** "
            f"They can check a comprehensive interaction database and review your full medication history."
        )

    if result["interaction_detected"]:
        # Clean up the raw FDA text into something readable
        raw = result["interaction_text"] or ""
        # Remove section headers like "Drug Interactions Anticoagulants"
        cleaned = re.sub(r'^[A-Z][A-Za-z /]+\n', '', raw).strip()
        # Limit to a readable length
        if len(cleaned) > 400:
            cleaned = cleaned[:400].rsplit(".", 1)[0] + "."

        return (
            f"⚠️ **Yes, there is a known interaction between {name_a} and {name_b}.**\n\n"
            f"{cleaned}\n\n"
            f"**What this means for you:** Taking these two medications together may require "
            f"dose adjustment or extra monitoring. Do not stop or change your medication without "
            f"speaking to your doctor first.\n\n"
            f"> 💊 Always inform your pharmacist about all the medicines you are taking, "
            f"including over-the-counter drugs and supplements."
        )
    else:
        missing = []
        if not result["drug_a_in_db"]:
            missing.append(name_a)
        if not result["drug_b_in_db"]:
            missing.append(name_b)

        caveat = ""
        if missing:
            caveat = (
                f"\n\n*Note: We don't have full data for {' and '.join(missing)}, "
                f"so this result may not be complete.*"
            )

        return (
            f"✅ **No direct interaction was found between {name_a} and {name_b}** "
            f"in our drug interaction records.{caveat}\n\n"
            f"This does not mean they are completely risk-free when combined — individual "
            f"factors like your health conditions, dosage, and other medications matter.\n\n"
            f"> 💊 When in doubt, always check with your pharmacist before combining medicines."
        )
