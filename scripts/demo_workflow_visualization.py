"""
demo_workflow_visualization.py - Demonstration of thought process visualization

Shows how the workflow tracker visualizes agentic thinking in real-time.
This script demonstrates the concept without requiring a full Streamlit app.
"""

# Example workflow states and how they're visualized

EXAMPLE_EXECUTION = {
    "scenario": "User asks: 'Is Warfarin safe with Aspirin?'",
    "workflow": [
        {
            "node": "route_intent",
            "status": "running",
            "display": "🧠 Analyzing Intent",
            "message": "Understanding your clinical query...",
            "duration": "~0.5s",
            "output": "Intent classified as CLINICAL"
        },
        {
            "node": "clinical_knowledge_node",
            "status": "running",
            "display": "⚕️ Clinical Analysis",
            "message": "Checking FDA drug interactions & clinical data...",
            "duration": "~2-3s",
            "substeps": [
                "🔎 Parsing drug interaction request...",
                "💾 Querying FDA DDI Database...",
                "  ✓ warfarin & aspirin: FOUND interaction",
                "📚 Searching vector knowledge base...",
                "🧪 Synthesizing clinical evidence...",
            ],
            "output": "⚠️ Yes, there is a known interaction between Warfarin and Aspirin"
        },
    ],
    "total_time": "~3 seconds",
    "user_experience": "Sees real-time progress as each step executes"
}

# Example with image processing
IMAGE_PROCESSING_EXAMPLE = {
    "scenario": "User uploads medication bottle photo",
    "workflow": [
        {
            "node": "route_intent",
            "status": "complete",
            "display": "✅ Analyzing Intent",
            "output": "Intent: VISION_EXTRACTION (image detected)"
        },
        {
            "node": "vision_extraction_node",
            "status": "running",
            "display": "📸 Processing Images",
            "message": "Extracting medication details from photos...",
            "duration": "~5-7s",
            "substeps": [
                "📷 Encoding image to base64...",
                "🔍 Analyzing image with vision model...",
                "  ✓ Detected: Medicine Bottle",
                "  ✓ Found: Batch Number XYZ123",
                "📝 Extracting batch number: XYZ123",
                "📅 Identifying expiry date: 2026-12-31",
                "💊 Detecting medication category: Tablet",
                "✅ Validating extracted data...",
            ],
            "output": "Batch: XYZ123, Name: Amoxicillin, Exp: 2026-12-31"
        },
        {
            "node": "human_approval_node",
            "status": "running",
            "display": "⏸️ Awaiting Approval",
            "message": "Checking for expired items...",
            "output": "✅ Valid expiry date - continuing...",
        },
        {
            "node": "final",
            "status": "complete",
            "display": "✅ Complete",
            "output": "✅ Logged Amoxicillin (Tablet) | Batch: XYZ123 | Exp: 2026-12-31",
        },
    ],
    "total_time": "~7 seconds with live feedback",
}

# Example with HITL (Human-in-the-Loop)
HITL_EXAMPLE = {
    "scenario": "User uploads expired medication (past expiry date)",
    "workflow": [
        {
            "node": "vision_extraction_node",
            "status": "complete",
            "display": "✅ Processing Images",
            "output": "Detected: Expired medication (2020-11-30, today is 2026-03-09)"
        },
        {
            "node": "human_approval_node",
            "status": "interrupted",
            "display": "⏸️ HITL Checkpoint Triggered",
            "message": "Critical decision required for expired medication",
            "hitl_widget": {
                "product": "Aspirin",
                "batch": "BATCH-20201130",
                "expiry": "2020-11-30",
                "category": "Tablet",
                "action": "Approve to move to Quarantine OR Reject to discard"
            },
            "user_action": "Pharmacist clicks: ✅ Approve — Move to Quarantine"
        },
        {
            "node": "human_approval_node_resumed",
            "status": "running",
            "display": "🔄 Processing Decision",
            "message": "Moving item to quarantine database...",
            "output": "🔒 Moved to Quarantine | Aspirin (Tablet) | Batch: BATCH-20201130"
        },
    ],
    "total_time": "~2 seconds processing + pharmacist decision time",
    "key_benefit": "Pharmacist sees exactly what triggered approval and why"
}

# Visualization markup (text representation)
STREAMLIT_UI_REPRESENTATION = """
═══════════════════════════════════════════════════════════════════
STREAMLIT UI OUTPUT - Drug Interaction Query
═══════════════════════════════════════════════════════════════════

User Chat Input:
  "Is Warfarin safe with Aspirin?"

Assistant Status Display:
┌──────────────────────────────────────────────────────────────────┐
│ ✅ 🧠 Analyzing Intent                                           │
│    Understanding your clinical query...                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 🟡 ⚕️ Clinical Analysis                                          │
│    Checking FDA drug interactions & clinical data...             │
│                                                                  │
│    🔎 Parsing drug interaction request...                        │
│    💾 Querying FDA DDI Database...                               │
│    📚 Searching vector knowledge base...                         │
│    🧪 Synthesizing clinical evidence... ⏳                       │
└──────────────────────────────────────────────────────────────────┘

Response:
  ⚠️ **Yes, there is a known interaction between Warfarin and 
  Aspirin.**
  
  Concomitant use of NSAIDs and analgesic doses of aspirin may 
  potentiate the risk of bleeding...

═══════════════════════════════════════════════════════════════════
"""

IMAGE_PROCESSING_UI = """
═══════════════════════════════════════════════════════════════════
STREAMLIT UI OUTPUT - Image Processing with Progress
═══════════════════════════════════════════════════════════════════

User uploads: [image_1.jpg] [image_2.jpg]

Status Display:
┌──────────────────────────────────────────────────────────────────┐
│ ✅ 🧠 Analyzing Intent                                           │
│    Understanding your request...                                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 🟡 📸 Processing Images                                          │
│    Extracting medication details from photos...                  │
│                                                                  │
│    📷 Encoding images to base64...                               │
│    🔍 Analyzing image content with vision model...               │
│    📝 Extracting batch number...                                 │
│    📅 Identifying expiry date...                                 │
│    💊 Detecting medication category...                           │
│    ✅ Validating extracted data...                               │
│                                                                  │
│    🔄 Preparing to log to inventory... ⏳                        │
└──────────────────────────────────────────────────────────────────┘

Response:
  ✅ Logged **Amoxicillin** (Tablet) from 2 photos
     | Batch: BATCH-ABC123 | Exp: 2026-12-31

═══════════════════════════════════════════════════════════════════
"""

HITL_UI = """
═══════════════════════════════════════════════════════════════════
STREAMLIT UI OUTPUT - HITL Checkpoint (Expired Item)
═══════════════════════════════════════════════════════════════════

Status Display:
┌──────────────────────────────────────────────────────────────────┐
│ ✅ 🧠 Analyzing Intent                                           │
│    Understanding your request...                                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ✅ 📸 Processing Images                                          │
│    Extracted: Aspirin, Batch XYZ, Exp: 2020-11-30               │
│    ⚠️ EXPIRED (2020 < 2026)                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ⚠️  Human Approval Required                                      │
│                                                                  │
│ **Critical:** The Vision Agent detected an **expired medication**.│
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Product   │ Aspirin (Tablet)                               │  │
│ │ Batch     │ BATCH-XYZ                                      │  │
│ │ Expired   │ 2020-11-30                                     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [✅ Approve — Move to Quarantine]  [❌ Reject — Discard Item]  │
└──────────────────────────────────────────────────────────────────┘

User Action: Clicks ✅ Approve

Processing Decision...

┌──────────────────────────────────────────────────────────────────┐
│ ✅ 🔄 Finalizing                                                 │
│    Moving item to quarantine database...                         │
└──────────────────────────────────────────────────────────────────┘

Response:
  🔒 **Moved to Quarantine** | **Aspirin** (Tablet) 
     | Batch: BATCH-XYZ | Expired: 2020-11-30 
     | Logged to quarantine collection.

═══════════════════════════════════════════════════════════════════
"""

# Code example showing how to implement
IMPLEMENTATION_EXAMPLE = """
# In main.py - Before (simple spinner):
with st.spinner("Analyzing..."):
    result = app.invoke(input_data, config=graph_config)
    final_text = result.get("final_response", "")
    st.markdown(final_text)

# In main.py - After (with visualization):
from workflow_tracker import StreamlitNodeVisualizer

visualizer = StreamlitNodeVisualizer()
visualizer.init_visualization()

result = None
for event in app.stream(input_data, config=graph_config, stream_mode="values"):
    result = event
    # Status widgets update automatically as nodes execute

final_text = result.get("final_response", "") if result else ""
st.markdown(final_text)

# That's it! Streamlit automatically shows:
# ✅ 🧠 Analyzing Intent
# ✅ ⚕️ Clinical Analysis (with substeps)
# Final response appears automatically
"""

# Summary of improvements
IMPROVEMENTS_SUMMARY = {
    "Before": {
        "User sees": "Spinning wheel labeled 'Analyzing...'",
        "Duration": "Feels like 5+ seconds of silence",
        "Trust level": "Low - is it working? How long will this take?",
        "Accessibility": "No indication of progress or what's happening",
    },
    "After": {
        "User sees": "Real-time node execution with emojis and descriptions",
        "Duration": "Perception of speed improved by showing progress",
        "Trust level": "High - user can see reasoning path and confidence",
        "Accessibility": "Clear indication of what step is executing and why",
    },
}

if __name__ == "__main__":
    print("WORKFLOW VISUALIZATION EXAMPLES")
    print("=" * 80)
    print()
    
    print("SCENARIO 1: Drug Interaction Query")
    print("-" * 80)
    print(f"User Query: {EXAMPLE_EXECUTION['scenario']}")
    print(f"Total Time: {EXAMPLE_EXECUTION['total_time']}")
    print(f"\nWorkflow steps:")
    for i, step in enumerate(EXAMPLE_EXECUTION['workflow'], 1):
        print(f"  {i}. {step['display']} ({step['duration']})")
        print(f"     → {step['output'][:60]}...")
    print()
    
    print("SCENARIO 2: Image Processing (Inventory)")
    print("-" * 80)
    print(f"User Action: {IMAGE_PROCESSING_EXAMPLE['scenario']}")
    print(f"Total Time: {IMAGE_PROCESSING_EXAMPLE['total_time']}")
    print("\nKey benefit: Real-time feedback during image processing")
    print()
    
    print("SCENARIO 3: HITL Checkpoint (Expired Item)")
    print("-" * 80)
    print(f"User Action: {HITL_EXAMPLE['scenario']}")
    print("\nKey benefit: Pharmacist approves decision with full context")
    print()
    
    print("IMPROVEMENTS")
    print("-" * 80)
    for scenario, data in IMPROVEMENTS_SUMMARY.items():
        print(f"\n{scenario}:")
        for aspect, description in data.items():
            print(f"  {aspect}: {description}")
