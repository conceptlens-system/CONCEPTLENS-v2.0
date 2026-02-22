from fastapi import APIRouter, UploadFile, HTTPException, File
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import google.generativeai as genai
from pypdf import PdfReader
import io
import json

router = APIRouter()

class Topic(BaseModel):
    name: str

class Unit(BaseModel):
    unit: str
    topics: List[str]

class SyllabusResponse(BaseModel):
    units: List[Unit]

def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

from starlette.concurrency import run_in_threadpool

from app.core.config import settings

@router.post("/parse", response_model=SyllabusResponse)
async def parse_syllabus_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # 1. Read File
    content = await file.read()
    
    # Run CPU-bound PDF extraction in via threadpool to avoid blocking event loop
    try:
        raw_text = await run_in_threadpool(extract_text_from_pdf, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be scanned/image-based.")

    # 2. Configure Gemini
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    # 3. Prompt Engineering
    prompt = f"""
    You are a syllabus parser AI. Extract the Units and Topics from the following syllabus text.
    
    Structure the output as a valid JSON object with the following schema:
    {{
        "units": [
            {{
                "unit": "Unit Name/Number",
                "topics": ["Topic 1", "Topic 2", ...]
            }}
        ]
    }}

    Rules:
    - Ignore administrative details (hours, marks, outcomes).
    - Capture the full unit title (e.g., "Unit 1: Introduction").
    - Split complex topics into individual items where appropriate, but keep related concepts together if they form a single topic heading.
    - Return ONLY the JSON object, no markdown formatting.

    Syllabus Text:
    {raw_text[:30000]} 
    """ # Truncate to avoid context limit if massive

    try:
        # Use Async generation to avoid blocking
        response = await model.generate_content_async(prompt)
        response_text = response.text
        


        # Cleanup potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"AI Parse Error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback or error
        raise HTTPException(status_code=500, detail=f"Failed to parse syllabus with AI. Error: {str(e)}")
