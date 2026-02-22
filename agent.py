import os
import json
import time
import random
import datetime
from typing import TypedDict
from PIL import Image
from pydantic import BaseModel, Field
from google import genai
from google.api_core import exceptions
from dotenv import load_dotenv

import chromadb
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langgraph.graph import StateGraph, START, END

# Import your custom PostgreSQL database module
import database

# 1. Initialize Environment & Databases
# Load API keys and DB connection strings from .env
load_dotenv()

# Initialize the Supabase Postgres table
database.init_db()

# Initialize ChromaDB for unstructured clinical knowledge
# This helps the agent answer "how-to" or safety questions
chroma_client = chromadb.PersistentClient(path="./chroma_db")
vector_collection = chroma_client.get_or_create_collection(name="clinical_guidelines")
embedder = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

# 2. Define State and Schemas
# PharmacyState tracks the images, the query, and the final bot response
class PharmacyState(TypedDict):
    image_paths: list[str]
    user_query: str
    final_response: str

# LabelData ensures the Vision model returns clean, structured JSON
class LabelData(BaseModel):
    batch_number: str
    expiry_date: str
    product_name: str = Field(description="The name of the medication. If the user provided a name in their hint, prioritize that. Otherwise, extract from the label.")
    category: str = Field(description="Analyze the form. Choose from: Tablet, Liquid/Syrup, Capsule, Lozenges, Cream/Ointment, Drops, Spray, or Other.")

# 3. Define the Semantic Router
# This is the "Traffic Cop" that decides which specialist node to trigger
def route_intent(state: PharmacyState):
    """Dynamically routes the graph based on semantic intent or file presence."""
    
    # Priority 1: If images are present, we go to the Vision Node for restocking
    if state.get("image_paths") and len(state["image_paths"]) > 0:
        return "vision_extraction_node"
        
    # Priority 2: Use LLM to classify the text intent
    user_query = state.get("user_query", "")
    client = genai.Client()
    
    routing_prompt = f"""
    Classify this user query into one of THREE categories:
    1. "INVENTORY": Asking to read stock levels or expiry dates (e.g., "What expires soon?").
    2. "CLINICAL": Asking about medical rules, interactions, or safety guidelines.
    3. "UPDATE": Asking to fix or change a record (e.g., "Update batch X name to Y").
    
    User Query: "{user_query}"
    Respond with EXACTLY one word: INVENTORY, CLINICAL, or UPDATE.
    """
    
    try:
        # Using Flash-Lite for cost-efficient routing
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=routing_prompt,
            config={'temperature': 0.0} 
        )
        decision = response.text.strip().upper()
        
        if "CLINICAL" in decision:
            return "clinical_knowledge_node"
        elif "UPDATE" in decision:
            return "database_update_node"
        return "database_query_node"
            
    except Exception as e:
        # Default fallback to inventory query
        return "database_query_node" 

# 4. Define the Nodes (The Specialist Agents)

def vision_extraction_node(state: PharmacyState):
    """Processes multiple images with exponential backoff for the free tier."""
    client = genai.Client()
    user_query = state.get("user_query", "")
    image_paths = state.get("image_paths", [])
    
    all_messages = []
    
    for idx, img_path in enumerate(image_paths):
        img = Image.open(img_path)
        
        # We pass the user_query as a hint to make the AI more 'human' and flexible
        prompt = f"""
        Analyze this medication label and packaging.
        The user hint is: "{user_query}"
        
        Instructions:
        1. Extract Batch Number and Expiry Date.
        2. Extract Product Name. If the user provided a name in the hint above, use that name!
        3. Identify Category (Tablet, Syrup, etc.) based on visual packaging and text.
        """
        
        # Exponential Backoff Retry Loop to handle 429 errors
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Using gemini-2.5-flash-lite for higher free-tier limits
                response = client.models.generate_content(
                    model='gemini-2.5-flash-lite', 
                    contents=[prompt, img],
                    config={'response_mime_type': 'application/json', 'response_schema': LabelData, 'temperature': 0.1}
                )
                
                data = json.loads(response.text)
                batch = data.get("batch_number", "UNKNOWN")
                expiry = data.get("expiry_date", "UNKNOWN")
                name = data.get("product_name", "Unknown")
                category = data.get("category", "Unknown")
                
                if batch != "UNKNOWN":
                    # Save the extraction to the Postgres Cloud DB
                    database.insert_batch(batch, expiry, name, category)
                    all_messages.append(f"✅ Image {idx+1}: Logged **{name}** ({category}) | Batch: {batch} | Exp: {expiry}")
                else:
                    all_messages.append(f"❌ Image {idx+1}: Could not read batch/expiry.")
                
                break # Success! Exit the retry loop
                
            except Exception as e:
                # Catch Quota/Rate Limit Errors
                if "429" in str(e) and attempt < max_retries - 1:
                    # Exponential wait: 2s, 4s, 8s... plus random jitter
                    wait_time = (2 ** attempt) + random.random()
                    time.sleep(wait_time)
                else:
                    all_messages.append(f"⚠️ Image {idx+1}: Vision error - {str(e)}")
                    break
                    
        # Small mandatory cooldown between images to respect 15 RPM limit
        time.sleep(2)
            
    return {"final_response": "\n\n".join(all_messages)}
def database_query_node(state: PharmacyState):
    user_query = state.get("user_query", "")
    today = datetime.date.today()
    current_date_str = today.strftime("%Y-%m-%d") # Use ISO format for grounding
    
    inventory_data = database.get_inventory()
    # Formatting row: Name (Category) | Batch | Expiry
    inventory_context = "\n".join([f"- {r[2]} ({r[3]}) | Batch: {r[0]} | Exp: {r[1]}" for r in inventory_data])
            
    client = genai.Client()
    
    system_instruction = f"""
    You are a professional pharmacy inventory auditor. 
    CURRENT DATE: {current_date_str}
    
    INVENTORY SOURCE OF TRUTH:
    {inventory_context}
    
    GROUNDING RULES:
    1. ZERO-INFERENCE: If a product is not in the list above, state 'Product not found in inventory.' Do not invent data.
    2. DATE COMPARISON: Use the YYYY-MM-DD format to determine expiry. If today ({current_date_str}) is greater than the expiry date, it is EXPIRED.
    3. STEP-BY-STEP: For comparison questions, list the items you are comparing before giving the result.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=[system_instruction, user_query]
    )
    return {"final_response": response.text}
def database_update_node(state: PharmacyState):
    """Parses natural language to perform an SQL UPDATE."""
    user_query = state.get("user_query", "")
    client = genai.Client()
    
    prompt = f"Extract 'batch_number' and 'new_name' from: {user_query}. Return JSON."
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        data = json.loads(response.text)
        batch, new_name = data.get("batch_number"), data.get("new_name")
        
        if database.update_product_name(batch, new_name):
            return {"final_response": f"🔄 Updated batch **{batch}** name to **{new_name}**."}
        return {"final_response": f"⚠️ Batch {batch} not found in database."}
    except Exception as e:
        return {"final_response": f"Update failed: {e}"}

def clinical_knowledge_node(state: PharmacyState):
    """Performs RAG using the local ChromaDB Vector Store."""
    user_query = state.get("user_query", "")
    
    try:
        # Convert query to vector and search ChromaDB
        query_vector = embedder.embed_query(user_query)
        results = vector_collection.query(query_embeddings=[query_vector], n_results=1)
        
        context = results["documents"][0][0] if results["documents"] else "No clinical data found."
        
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=f"Using this reference: {context}\n\nAnswer: {user_query}"
        )
        return {"final_response": f"📚 **Clinical Knowledge:** {response.text}"}
    except Exception as e:
        return {"final_response": f"Vector search error: {e}"}

# 5. Compile the Workflow
workflow = StateGraph(PharmacyState)

# Add Nodes
workflow.add_node("vision_extraction_node", vision_extraction_node)
workflow.add_node("database_query_node", database_query_node)
workflow.add_node("database_update_node", database_update_node)
workflow.add_node("clinical_knowledge_node", clinical_knowledge_node)

# Add Logic
workflow.add_conditional_edges(
    START, 
    route_intent,
    {
        "vision_extraction_node": "vision_extraction_node",
        "database_query_node": "database_query_node",
        "database_update_node": "database_update_node",
        "clinical_knowledge_node": "clinical_knowledge_node"
    }
)

# End the graph after any node executes
workflow.add_edge("vision_extraction_node", END)
workflow.add_edge("database_query_node", END)
workflow.add_edge("database_update_node", END)
workflow.add_edge("clinical_knowledge_node", END)

app = workflow.compile()