"""
📊 Evaluation Dataset - 20 Complex Pharmacy Queries (Academic Testing)

This dataset is designed for rigorous evaluation of the NovaMed system.
Includes:
- Clinical DDI queries (exact + typos)
- Inventory queries
- Edge cases
- Expected outputs (ground truth)

Used by: evaluation_runner.py
"""

EVALUATION_QUERIES = [
    # ========== CLINICAL DDI QUERIES (10) ==========
    {
        "id": "clinical_001",
        "query": "Is it safe to take Paracetamol with Warfarin?",
        "type": "clinical_ddi",
        "expected_contains": ["interaction", "Warfarin", "Paracetamol"],
        "should_be_deterministic": True,  # Should use FDA data, not LLM
        "ground_truth": {
            "drug_a": "PARACETAMOL",
            "drug_b": "WARFARIN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_002",
        "query": "Can I combine Aspirin and Ibuprofen together?",
        "type": "clinical_ddi",
        "expected_contains": ["interaction", "Aspirin", "Ibuprofen"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "ASPIRIN",
            "drug_b": "IBUPROFEN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_003",
        "query": "Paracetemol with Amoxicillin - any issues?",  # TYPO: Paracetemol
        "type": "clinical_ddi_with_typo",
        "expected_contains": ["Paracetamol", "Amoxicillin", "safe"],  # Should correct typo
        "fuzzy_match_required": True,
        "ground_truth": {
            "drug_a": "PARACETAMOL",
            "drug_b": "AMOXICILLIN",
            "has_interaction": False,
            "source": "FDA_DDI_DATABASE",
            "typo_corrected": "Paracetemol → Paracetamol"
        }
    },
    {
        "id": "clinical_004",
        "query": "Is Salbutamol safe to use with Prednisolone?",
        "type": "clinical_ddi",
        "expected_contains": ["Salbutamol", "Prednisolone"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "SALBUTAMOL",  # Should map to ALBUTEROL
            "drug_b": "PREDNISOLONE",
            "has_interaction": False,
            "source": "FDA_DDI_DATABASE",
            "inn_synonym": "Salbutamol → Albuterol"
        }
    },
    {
        "id": "clinical_005",
        "query": "Can I take Ciprofloxin with Warfarin together?",  # TYPO: Cipro + misspelling
        "type": "clinical_ddi_with_typo",
        "expected_contains": ["Ciprofloxacin", "Warfarin"],  # Should correct typo
        "fuzzy_match_required": True,
        "ground_truth": {
            "drug_a": "CIPROFLOXACIN",
            "drug_b": "WARFARIN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE",
            "typo_corrected": "Ciprofloxin → Ciprofloxacin"
        }
    },
    {
        "id": "clinical_006",
        "query": "Is Metformin contraindicated with Gliclazide?",
        "type": "clinical_ddi",
        "expected_contains": ["Metformin", "Gliclazide"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "METFORMIN",
            "drug_b": "GLICLAZIDE",
            "has_interaction": False,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_007",
        "query": "What about Cipro and Theophylline - safe combo?",  # Abbreviation
        "type": "clinical_ddi_abbreviation",
        "expected_contains": ["Ciprofloxacin", "Theophylline"],
        "fuzzy_match_required": True,
        "ground_truth": {
            "drug_a": "CIPROFLOXACIN",  # Cipro is abbreviation
            "drug_b": "THEOPHYLLINE",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_008",
        "query": "Is Omeprazole compatible with Clopidogrel?",
        "type": "clinical_ddi",
        "expected_contains": ["Omeprazole", "Clopidogrel"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "OMEPRAZOLE",
            "drug_b": "CLOPIDOGREL",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_009",
        "query": "Can I use Lisinopril with HCTZ together?",  # HCTZ = Hydrochlorothiazide
        "type": "clinical_ddi_abbreviation",
        "expected_contains": ["Lisinopril", "Hydrochlorothiazide"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "LISINOPRIL",
            "drug_b": "HYDROCHLOROTHIAZIDE",
            "has_interaction": False,  # Often combined
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "clinical_010",
        "query": "Is there a problem taking Clarithromycin with Simvastatin?",
        "type": "clinical_ddi",
        "expected_contains": ["Clarithromycin", "Simvastatin"],
        "should_be_deterministic": True,
        "ground_truth": {
            "drug_a": "CLARITHROMYCIN",
            "drug_b": "SIMVASTATIN",
            "has_interaction": True,  # Known serious interaction
            "source": "FDA_DDI_DATABASE"
        }
    },

    # ========== INVENTORY QUERIES (5) ==========
    {
        "id": "inventory_001",
        "query": "What medications are currently in stock?",
        "type": "inventory_query",
        "expected_contains": ["inventory", "stock"],  # Flexible expectations
        "should_reference_db": True
    },
    {
        "id": "inventory_002",
        "query": "Are there any expired items in the inventory?",
        "type": "inventory_expiry_check",
        "expected_contains": ["expired", "expiry"],
        "should_reference_db": True
    },
    {
        "id": "inventory_003",
        "query": "How many batches of Amoxicillin do we have?",
        "type": "inventory_count",
        "expected_contains": ["Amoxicillin", "batch"],
        "should_reference_db": True
    },
    {
        "id": "inventory_004",
        "query": "Which medications expire before 2026-06-30?",
        "type": "inventory_filter",
        "expected_contains": ["expire"],
        "should_reference_db": True
    },
    {
        "id": "inventory_005",
        "query": "List all capsule medications in our pharmacy.",
        "type": "inventory_category",
        "expected_contains": ["Capsule", "medication"],
        "should_reference_db": True
    },

    # ========== EDGE CASES & ROBUSTNESS (5) ==========
    {
        "id": "edge_001",
        "query": "Is PARACETAMOL safe with WARFARIN?",  # ALL CAPS
        "type": "clinical_ddi_edge_case",
        "expected_contains": ["Warfarin", "Paracetamol"],
        "should_handle_case_insensitive": True,
        "ground_truth": {
            "drug_a": "PARACETAMOL",
            "drug_b": "WARFARIN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "edge_002",
        "query": "Paracetamol + Warfarin — interaction?",  # Minimal text, special chars
        "type": "clinical_ddi_minimal",
        "expected_contains": ["Paracetamol", "Warfarin"],
        "should_parse_minimal_syntax": True,
        "ground_truth": {
            "drug_a": "PARACETAMOL",
            "drug_b": "WARFARIN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "edge_003",
        "query": "Is XYZ123 safe with ABC456?",  # Non-existent drugs
        "type": "clinical_ddi_not_found",
        "expected_contains": ["not found", "not in", "unknown"],  # Should gracefully fail
        "should_not_hallucinate": True
    },
    {
        "id": "edge_004",
        "query": "paracetemol WARFARIN interaction",  # Mixed case + typo
        "type": "clinical_ddi_mixed_case_typo",
        "expected_contains": ["Paracetamol", "Warfarin"],
        "fuzzy_match_required": True,
        "ground_truth": {
            "drug_a": "PARACETAMOL",
            "drug_b": "WARFARIN",
            "has_interaction": True,
            "source": "FDA_DDI_DATABASE"
        }
    },
    {
        "id": "edge_005",
        "query": "I'm on Metformin. Can I also start Sulfonylureas?",  # Generic medical question
        "type": "clinical_general_question",
        "expected_contains": ["Metformin"],  # Should reference ChromaDB or DDI
        "should_provide_clinical_guidance": True
    },
]

# ========== EVALUATION METRICS DEFINITIONS ==========

EVALUATION_METRICS = {
    "faithfulness": {
        "description": "Did the output hallucinate or did it strictly use FDA data for DDI queries?",
        "scale": "0-100",
        "threshold": 90,
        "implementation": "Check if DDI queries reference FDA_DDI_DATABASE, not LLM speculation",
    },
    "answer_relevance": {
        "description": "Did the output directly answer the user's query?",
        "scale": "0-100",
        "threshold": 80,
        "implementation": "NLP similarity between query intent and response",
    },
    "context_precision": {
        "description": "Percentage of retrieved context that is relevant to the query",
        "scale": "0-100",
        "threshold": 80,
        "implementation": "Measure relevant vs irrelevant context chunks",
    },
    "context_recall": {
        "description": "Percentage of ground truth information covered in the output",
        "scale": "0-100",
        "threshold": 85,
        "implementation": "Check if expected_contains are in the response",
    },
    "hallucination_rate": {
        "description": "Percentage of outputs that contain fabricated information",
        "scale": "0-100 (lower is better)",
        "threshold_max": 10,
        "implementation": "Detect claims not supported by FDA data or ChromaDB",
    },
    "typo_tolerance": {
        "description": "Accuracy of fuzzy matching for intentional typos",
        "scale": "0-100",
        "threshold": 90,
        "implementation": "Check if typos were corrected before lookup",
    },
}

# ========== REFERENCE ANSWERS FOR MANUAL SCORING ==========

REFERENCE_ANSWERS = {
    "clinical_001": {
        "query": "Is it safe to take Paracetamol with Warfarin?",
        "answer": "There is a known interaction between Paracetamol and Warfarin. Paracetamol can increase the anticoagulant effect of Warfarin, increasing the risk of bleeding.",
        "source": "FDA_DDI_DATABASE"
    },
    "clinical_002": {
        "query": "Can I combine Aspirin and Ibuprofen together?",
        "answer": "Yes, there is an interaction. Taking Aspirin and Ibuprofen together increases the risk of gastrointestinal bleeding and other adverse effects.",
        "source": "FDA_DDI_DATABASE"
    },
    "clinical_003": {
        "query": "Paracetemol with Amoxicillin - any issues?",
        "answer": "No significant interaction. Paracetamol (note: corrected from 'Paracetemol') and Amoxicillin can be safely used together.",
        "source": "FDA_DDI_DATABASE"
    },
    "inventory_001": {
        "query": "What medications are currently in stock?",
        "answer": "Should reference actual database inventory or clearly state that no inventory has been logged yet.",
        "source": "DATABASE_QUERY"
    },
}

if __name__ == "__main__":
    print("📊 PHARMACY EVALUATION DATASET")
    print(f"Total queries: {len(EVALUATION_QUERIES)}")
    print(f"\nBreakdown:")
    print(f"  - Clinical DDI: 10 queries")
    print(f"  - Inventory: 5 queries")
    print(f"  - Edge Cases: 5 queries")
    print(f"\nEvaluation Metrics: {len(EVALUATION_METRICS)}")
    for metric, details in EVALUATION_METRICS.items():
        print(f"  - {metric}: {details['description']}")
    print(f"\nReference Answers Provided: {len(REFERENCE_ANSWERS)}")
