from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.db.mongodb import get_database
from app.core.config import settings
from app.core.security import get_current_user
from bson import ObjectId
import google.generativeai as genai
import json
import random

router = APIRouter()

class ExamGenerationRequest(BaseModel):
    subject_id: str
    question_count: int = 10
    difficulty: str = "Medium" # Easy, Medium, Hard
    topics: Optional[List[str]] = None # specific units or topics

class GeneratedQuestion(BaseModel):
    id: str
    text: str
    type: str = "mcq"
    options: List[str] = [] # Changed to list of strings for simplicity in frontend mapping
    correct_answer: Optional[str] = None
    marks: int = 1
    explanation: Optional[str] = None

@router.post("/generate", response_model=List[GeneratedQuestion])
async def generate_exam(request: ExamGenerationRequest, current_user: dict = Depends(get_current_user)):
    # 1. Fetch Syllabus
    db = await get_database()
    try:
        subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Subject ID")
        
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    syllabus_text = ""
    if "syllabus" in subject and subject["syllabus"]:
        # Flatten syllabus for prompt
        for unit in subject["syllabus"]:
            unit_name = unit.get("unit", "Unit")
            topics = ", ".join(unit.get("topics", []))
            syllabus_text += f"{unit_name}: {topics}\n"
    else:
        # Fallback if no syllabus parsed yet?
        # We can try using the subject name as a fallback prompt
        syllabus_text = f"Subject: {subject['name']}. (No detailed syllabus provided, please generate general questions for this subject.)"

    # 2. Configure Gemini
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Service not configured")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    # 3. Prompt Engineering
    prompt = f"""
    You are an expert professor. Create a {request.difficulty} difficulty exam for the subject based on the syllabus below.
    
    Requirements:
    - Generate EXACTLY {request.question_count} questions.
    - Mix of Question Types:
        - ~60% Multiple Choice Questions (MCQ) - type: "mcq"
        - ~20% True/False Questions - type: "true_false"
        - ~10% Short Answer Questions - type: "short_answer"
        - ~10% One Word Answer Questions - type: "one_word"
    - Format output as a STRICT JSON array.
    - Each question must have: 
        - 'text': Question text
        - 'type': 'mcq' | 'true_false' | 'short_answer' | 'one_word'
        - 'options': Array of 4 strings (for MCQs only, empty for others)
        - 'correct_answer': The correct option text (for MCQ), "True"/"False" (for T/F), or the answer text (for others).
        - 'marks': int (default 1)
        - 'explanation': Brief explanation of the answer.
    
    Syllabus:
    {syllabus_text[:10000]}
    
    JSON Schema:
    [
        {{
            "text": "Question text here?",
            "type": "mcq",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option C",
            "marks": 1,
            "explanation": "Why this is correct..."
        }},
        {{
            "text": "True/False Question?",
            "type": "true_false",
            "options": [],
            "correct_answer": "True",
            "marks": 1,
            "explanation": "..."
        }}
    ]
    """

    try:
        response = await model.generate_content_async(prompt)
        response_text = response.text
        
        # Cleanup markdown
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            
        data = json.loads(response_text)
        
        # Transform to internal model
        formatted_questions = []
        for idx, q in enumerate(data):
            # Validate type
            q_type = q.get("type", "mcq").lower()
            if q_type not in ["mcq", "true_false", "short_answer", "one_word"]:
                q_type = "mcq"

            # Validate options for MCQ
            options = q.get("options", [])
            if q_type == "mcq" and len(options) < 2:
                 # Skip malformed MCQs or convert to short answer?
                 # Let's try to keep it robust
                 pass 

            formatted_questions.append({
                "id": str(ObjectId()), 
                "text": q["text"],
                "type": q_type,
                "options": options,
                "correct_answer": q.get("correct_answer", ""),
                "marks": q.get("marks", 1),
                "explanation": q.get("explanation", "")
            })
            
        return formatted_questions

    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {str(e)}")
