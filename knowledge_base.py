from langchain_google_genai import GoogleGenerativeAIEmbeddings
import chromadb

# Initialize ChromaDB connection inside the agent
chroma_client = chromadb.PersistentClient(path="./chroma_db")
vector_collection = chroma_client.get_collection(name="clinical_guidelines")
embedder = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001") #

def clinical_knowledge_node(state: PharmacyState):
    """Handles questions about drug interactions and rules using Vector Search."""
    user_query = state["user_query"]
    
    try:
        # 1. Convert the user's question into a vector
        query_vector = embedder.embed_query(user_query) #
        
        # 2. Search ChromaDB for the most semantically similar guideline
        results = vector_collection.query(
            query_embeddings=[query_vector], 
            n_results=1
        )
        
        retrieved_context = results["documents"][0][0] if results["documents"] else "No specific guidelines found."
        
        # 3. Ask Gemini to answer using ONLY the retrieved vector context
        client = genai.Client()
        system_instruction = f"""
        You are a clinical pharmacy agent. Answer the user's query using ONLY this retrieved medical context:
        {retrieved_context}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[system_instruction, user_query]
        )
        return {"final_response": f"📚 **Clinical Knowledge:** {response.text}"}
        
    except Exception as e:
        return {"final_response": f"Vector Search Error: {e}"}