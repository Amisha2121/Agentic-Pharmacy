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
from rapidfuzz import process, fuzz

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


@lru_cache(maxsize=1)
def _get_all_drug_names() -> list[str]:
    """Get a list of all unique normalized drug names for fuzzy matching."""
    df = _load_df()
    if df.empty:
        return []
    names = set()
    for col in ["_name_upper", "_brand_upper", "_generic_upper"]:
        names.update(df[col].dropna().unique())
    # Also include INN synonyms keys
    names.update(_INN_SYNONYMS.keys())
    return list(names)


def _normalise(name: str) -> str:
    """Strip, uppercase, collapse whitespace, and resolve INN synonyms."""
    key = re.sub(r"\s+", " ", name.strip().upper())
    return _INN_SYNONYMS.get(key, key)


def lookup_drug(drug_name: str) -> dict | None:
    """
    Return the DDI record for a drug by name (case-insensitive).
    Searches drug_name, brand_name, and generic_name columns.
    Includes fuzzy matching for typos (90% similarity threshold).
    Returns None if not found.
    """
    df = _load_df()
    if df.empty:
        return None
    key = _normalise(drug_name)
    
    # First, try exact match
    mask = (
        df["_name_upper"].str.contains(key, regex=False) |
        df["_brand_upper"].str.contains(key, regex=False) |
        df["_generic_upper"].str.contains(key, regex=False)
    )
    matches = df[mask]
    if not matches.empty:
        row = matches.iloc[0]
        return {
            "drug_name":          row["drug_name"],
            "brand_name":         row["brand_name"],
            "generic_name":       row["generic_name"],
            "interacts_with_list": row["interacts_with_list"],
            "description":        row["description"],
            "source":             row["source"],
        }
    
    # If no exact match, try fuzzy matching
    all_names = _get_all_drug_names()
    if all_names:
        best_match = process.extractOne(key, all_names, scorer=fuzz.ratio)
        if best_match and best_match[1] >= 90:  # 90% similarity
            corrected_key = _normalise(best_match[0])  # Resolve synonyms
            # Now lookup with the corrected key
            mask = (
                df["_name_upper"].str.contains(corrected_key, regex=False) |
                df["_brand_upper"].str.contains(corrected_key, regex=False) |
                df["_generic_upper"].str.contains(corrected_key, regex=False)
            )
            matches = df[mask]
            if not matches.empty:
                row = matches.iloc[0]
                return {
                    "drug_name":          row["drug_name"],
                    "brand_name":         row["brand_name"],
                    "generic_name":       row["generic_name"],
                    "interacts_with_list": row["interacts_with_list"],
                    "description":        row["description"],
                    "source":             row["source"],
                }
    
    return None


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
    Clinical interaction check result formatted as clean plain text.
    No emojis, no markdown. Suitable for direct display in a professional UI.
    """
    result = check_interaction(drug_a, drug_b)

    name_a = drug_a.title()
    name_b = drug_b.title()

    if not result["found"]:
        return (
            f"Neither {name_a} nor {name_b} was found in the FDA openFDA drug label dataset. "
            f"This does not confirm they are safe to combine.\n\n"
            f"Recommendation: Consult a licensed pharmacist or physician before taking these "
            f"medications together. A clinical database review of your full medication history "
            f"is advised."
        )

    if result["interaction_detected"]:
        # Clean up raw FDA label text
        raw = result["interaction_text"] or ""
        # Remove all-caps section headers (e.g. "DRUG INTERACTIONS\n")
        cleaned = re.sub(r'^[A-Z][A-Z /\-]+\n', '', raw).strip()
        # Remove any leading label noise
        cleaned = re.sub(r'^Drug Interactions[^\n]*\n', '', cleaned, flags=re.IGNORECASE).strip()
        if len(cleaned) > 500:
            cleaned = cleaned[:500].rsplit(".", 1)[0] + "."

        return (
            f"A clinically significant interaction has been identified between {name_a} and {name_b}.\n\n"
            f"FDA Label Excerpt:\n"
            f"{cleaned}\n\n"
            f"Clinical Guidance: Concurrent use of these agents may require dose adjustment, "
            f"enhanced monitoring, or an alternative therapeutic approach. Do not modify or "
            f"discontinue any medication without first consulting the prescribing physician or "
            f"a qualified pharmacist.\n\n"
            f"Always disclose your complete medication list — including over-the-counter drugs, "
            f"vitamins, and herbal supplements — to your healthcare provider."
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
                f"\n\nNote: {' and '.join(missing)} could not be fully matched in the FDA dataset. "
                f"This result may be incomplete."
            )

        return (
            f"No direct interaction between {name_a} and {name_b} was identified in the "
            f"FDA openFDA drug label records.{caveat}\n\n"
            f"This result does not confirm absolute safety. Individual patient factors — including "
            f"comorbidities, renal or hepatic function, dosage, and concurrent therapies — may "
            f"alter clinical risk.\n\n"
            f"When in doubt, verify with a pharmacist or consult a comprehensive drug interaction "
            f"database such as Lexicomp or Micromedex before co-administering these agents."
        )
