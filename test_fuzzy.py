#!/usr/bin/env python
"""Test fuzzy matching functionality in ddi_lookup.py"""

import ddi_lookup

# Test cases
test_cases = [
    ("AMOXICILLIN", "Exact match (uppercase)"),
    ("amoxicillin", "Exact match (lowercase)"),
    ("Amoxicillin", "Exact match (title case)"),
    ("Amoxicilin", "Typo (missing L)"),
    ("Amoxycillin", "Typo (Y instead of I)"),
    ("Cipro", "Partial match"),
    ("Ciproflaxin", "Typo (A instead of O)"),
    ("PARACETAMOL", "INN synonym"),
    ("Paracetamol", "INN synonym (lowercase)"),
    ("Paracetemol", "INN typo"),
    ("Salbutamol", "INN synonym"),
    ("Nonexistent Drug XYZ", "No match"),
]

print("=" * 70)
print("FUZZY MATCHING TESTS")
print("=" * 70)
print()

for drug, description in test_cases:
    result = ddi_lookup.lookup_drug(drug)
    status = "✓ FOUND" if result else "✗ NOT FOUND"
    drug_name = result['drug_name'] if result else "N/A"
    print(f"{status:<15} | Input: {drug:<25} | {description:<30}")
    if result:
        print(f"{'':15} | Matched to: {drug_name}")
    print()

print("=" * 70)
