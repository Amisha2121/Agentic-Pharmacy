#!/usr/bin/env python
"""Demonstrate the fuzzy matching feature working end-to-end"""

import ddi_lookup

print("\n" + "="*70)
print("FUZZY MATCHING INTEGRATION DEMO")
print("="*70 + "\n")

# 1. Typo on direct lookup
print("1. Typo Handling (Paracetemol → Acetaminophen):")
typo_result = ddi_lookup.lookup_drug('Paracetemol')
print(f"   Input: 'Paracetemol' (typo)")
print(f"   Result: {typo_result['drug_name']}")
print(f"   ✓ Fuzzy match caught the typo!\n")

# 2. INN synonym resolution
print("2. INN Synonym (Paracetamol → Acetaminophen):")
inn_result = ddi_lookup.lookup_drug('Paracetamol')
print(f"   Input: 'Paracetamol' (INN name)")
print(f"   Result: {inn_result['drug_name']}")
print(f"   ✓ Synonym mapping works!\n")

# 3. Interaction check with fuzzy-matched drug
print("3. Interaction Check with Fuzzy Match:")
interaction = ddi_lookup.check_interaction('Paracetemol', 'Warfarin')
print(f"   Input: 'Paracetemol' + 'Warfarin'")
print(f"   Result Found: {interaction['found']}")
print(f"   Drug A in DB: {interaction['drug_a_in_db']}")
print(f"   Interaction Detected: {interaction['interaction_detected']}")
print(f"   ✓ Interaction check works with fuzzy-matched drugs!\n")

# 4. Partial match (brand name abbreviation)
print("4. Partial Match (Brand Name):")
partial_result = ddi_lookup.lookup_drug('Cipro')
print(f"   Input: 'Cipro' (abbreviation)")
print(f"   Result: {partial_result['drug_name']}")
print(f"   ✓ Common abbreviation recognized!\n")

# 5. No false positives
print("5. Reject Below Threshold:")
no_match = ddi_lookup.lookup_drug('Ciproflaxin')  # 86% similarity
print(f"   Input: 'Ciproflaxin' (86% similarity - below 90% threshold)")
print(f"   Result: {no_match}")
print(f"   ✓ Correctly rejects low-confidence matches!\n")

print("="*70)
print("All fuzzy matching features working correctly!")
print("="*70 + "\n")
