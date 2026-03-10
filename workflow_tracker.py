"""
workflow_tracker.py — Real-time visualization of LangGraph agentic workflow

Tracks node execution, captures streaming events, and provides human-readable
status updates for Streamlit UI.
"""

from typing import Generator, Optional
import streamlit as st
from datetime import datetime
import json

# Node descriptions for user-friendly display
NODE_DESCRIPTIONS = {
    "route_intent": {
        "title": "🧠 Analyzing Intent",
        "description": "Understanding what you're asking...",
        "emoji": "🧠",
    },
    "vision_extraction_node": {
        "title": "📸 Processing Images",
        "description": "Extracting medication details from photos...",
        "emoji": "📸",
    },
    "human_approval_node": {
        "title": "⏸️ Awaiting Human Approval",
        "description": "Critical decision required for expired medication...",
        "emoji": "⏸️",
    },
    "database_query_node": {
        "title": "📋 Querying Inventory Database",
        "description": "Retrieving medication inventory information...",
        "emoji": "📋",
    },
    "database_update_node": {
        "title": "🔄 Updating Database",
        "description": "Making changes to medication records...",
        "emoji": "🔄",
    },
    "clinical_knowledge_node": {
        "title": "⚕️ Clinical Analysis",
        "description": "Checking FDA drug interactions & clinical data...",
        "emoji": "⚕️",
    },
}

# Substep descriptions for specific operations within nodes
SUBSTEP_DESCRIPTIONS = {
    "vision_extraction_node": [
        "📷 Encoding images to base64...",
        "🔍 Analyzing image content with vision model...",
        "📝 Extracting batch number...",
        "📅 Identifying expiry date...",
        "💊 Detecting medication category...",
        "✅ Validating extracted data...",
    ],
    "clinical_knowledge_node": [
        "🔎 Parsing drug interaction request...",
        "💾 Querying FDA DDI Database...",
        "📚 Searching vector knowledge base...",
        "🧪 Synthesizing clinical evidence...",
    ],
    "database_query_node": [
        "📊 Loading inventory data...",
        "🔍 Filtering relevant records...",
        "📈 Generating summary report...",
    ],
    "human_approval_node": [
        "⚠️ Flagging expired item...",
        "📢 Notifying pharmacist...",
        "⏳ Waiting for human decision...",
    ],
}


class WorkflowTracker:
    """Tracks and visualizes LangGraph workflow execution in Streamlit."""
    
    def __init__(self):
        self.current_node = None
        self.node_history = []
        self.status_container = None
        self.status_expander = None
        
    def start_tracking(self):
        """Initialize the status display."""
        self.status_container = st.container()
        self.node_history = []
        self.current_node = None
        return self.status_container
    
    def update_node(self, node_name: str):
        """Update UI when entering a new node."""
        info = NODE_DESCRIPTIONS.get(node_name, {})
        self.current_node = node_name
        self.node_history.append({
            "node": node_name,
            "timestamp": datetime.now().isoformat(),
            "title": info.get("title", node_name),
        })
        
        if self.status_container:
            with self.status_container:
                if self.status_expander:
                    self.status_expander.update(label=f"✓ {self.node_history[-2]['title']}")
                
                # Create new status for current node
                title = info.get("title", node_name)
                description = info.get("description", "Processing...")
                self.status_expander = st.status(title, state="running")
                self.status_expander.write(description)
    
    def add_substep(self, step_text: str):
        """Add a substep within the current node."""
        if self.status_expander:
            with self.status_expander:
                st.write(step_text)
    
    def complete_current_node(self):
        """Mark current node as completed."""
        if self.status_expander:
            self.status_expander.update(state="complete")
    
    def show_final_status(self):
        """Display complete workflow history."""
        if self.status_expander:
            self.status_expander.update(state="complete")


def stream_agent_with_visualization(app, config, input_data) -> Generator:
    """
    Stream agent execution with real-time Streamlit visualization.
    
    Yields:
        Intermediate events from the agent workflow
    """
    tracker = WorkflowTracker()
    tracker.start_tracking()
    
    # Stream events from LangGraph
    try:
        for event in app.stream(
            input_data,
            config=config,
            stream_mode="values"  # Get state updates
        ):
            # Detect which node is executing by examining event structure
            if event and isinstance(event, dict):
                # Try to infer node from state changes
                if "image_paths" in event and event.get("image_paths"):
                    tracker.update_node("vision_extraction_node")
                    
                if "pending_quarantine" in event and event.get("pending_quarantine"):
                    tracker.update_node("human_approval_node")
                elif event.get("final_response"):
                    # Determine which node based on response content
                    response = event.get("final_response", "")
                    if "Clinical Knowledge" in response or "Vector DB" in response:
                        tracker.update_node("clinical_knowledge_node")
                    elif "Updated batch" in response or "Update failed" in response:
                        tracker.update_node("database_update_node")
                    elif "Logged" in response or "logged" in response:
                        tracker.update_node("vision_extraction_node")
                    else:
                        tracker.update_node("database_query_node")
            
            yield event
        
        tracker.show_final_status()
        
    except Exception as e:
        st.error(f"Workflow error: {e}")
        raise


def stream_agent_with_detailed_tracking(app, config, input_data):
    """
    Stream agent with detailed node-by-node visualization.
    Uses LangGraph's event streaming for more precise tracking.
    """
    tracker = WorkflowTracker()
    status_columns = tracker.start_tracking()
    
    # Track which nodes we've already visualized
    visualized_nodes = set()
    
    try:
        # Stream at "updates" level to get node-level granularity
        for event in app.stream(
            input_data,
            config=config,
            stream_mode="updates"  # Get node-level updates
        ):
            # event is a dict: {node_name: {state_update}}
            if isinstance(event, dict):
                for node_name, node_update in event.items():
                    if node_name not in visualized_nodes:
                        tracker.update_node(node_name)
                        visualized_nodes.add(node_name)
                    
                    # Add substeps if available
                    if isinstance(node_update, dict):
                        if node_update.get("final_response"):
                            response = node_update["final_response"]
                            if response and len(response) > 50:
                                preview = response[:80] + "..."
                                tracker.add_substep(f"📝 {preview}")
            
            yield event
        
        tracker.show_final_status()
        
    except Exception as e:
        st.error(f"Workflow visualization error: {e}")
        raise


class StreamlitNodeVisualizer:
    """
    Enhanced visualizer with beautiful Streamlit UI elements.
    Shows workflow progress with status containers and expandable details.
    """
    
    def __init__(self):
        self.main_status = None
        self.substep_container = None
        self.node_states = {}
        
    def init_visualization(self) -> tuple:
        """Initialize visualization containers."""
        col1, col2 = st.columns([3, 1])
        with col1:
            self.main_status = st.status("🚀 Initializing workflow...", state="running")
        with col2:
            self.timer = st.empty()
        
        self.substep_container = st.container()
        return self.main_status, self.substep_container
    
    def track_nodes(self, app, config, input_data):
        """Main method to stream and visualize agent execution."""
        start_time = datetime.now()
        
        with self.main_status:
            for event in app.stream(input_data, config=config, stream_mode="values"):
                elapsed = (datetime.now() - start_time).total_seconds()
                self.timer.metric("", f"{elapsed:.1f}s")
                
                if event and isinstance(event, dict):
                    final_response = event.get("final_response", "")
                    if final_response:
                        st.write(final_response)
                        self.main_status.update(state="complete")
                        return event
        
        return None


# Preset workflow paths for common scenarios
WORKFLOW_PATHS = {
    "image_upload": [
        ("🧠", "Analyzing Intent", "Understanding your request..."),
        ("📸", "Processing Images", "Extracting medication details from photos..."),
        ("✅", "Validating Data", "Checking extracted information..."),
        ("💾", "Storing Batch", "Logging to inventory database..."),
    ],
    "drug_interaction": [
        ("🧠", "Analyzing Intent", "Understanding your clinical query..."),
        ("💾", "Checking FDA Database", "Querying FDA DDI dataset for Warfarin..."),
        ("📚", "Clinical Evidence", "Searching clinical knowledge base..."),
        ("✅", "Synthesizing Response", "Generating clinical safety response..."),
    ],
    "inventory_query": [
        ("🧠", "Analyzing Intent", "Understanding your inventory question..."),
        ("📋", "Database Query", "Retrieving medication records..."),
        ("📊", "Analysis", "Filtering and summarizing results..."),
    ],
}


def visualize_workflow_path(workflow_type: str = "default"):
    """
    Show a simulated workflow path for demo/placeholder purposes.
    Useful during agent initialization or for showing expected flow.
    """
    steps = WORKFLOW_PATHS.get(workflow_type, [
        ("🧠", "Processing", "Analyzing your request..."),
    ])
    
    cols = st.columns(len(steps))
    for idx, (emoji, title, desc) in enumerate(steps):
        with cols[idx]:
            st.write(f"{emoji} **{title}**")
            st.caption(desc)
