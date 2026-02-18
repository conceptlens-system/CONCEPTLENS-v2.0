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
    units: Optional[List[str]] = None # List of unit identifiers (e.g. ["1", "2"])

class GeneratedQuestion(BaseModel):
    id: str
    text: str
    type: str = "mcq"
    options: List[str] = [] # Changed to list of strings for simplicity in frontend mapping
    correct_answer: Optional[str] = None
    marks: int = 1
    explanation: Optional[str] = None
    topic: Optional[str] = None
    unit: Optional[str] = None

@router.post("/generate", response_model=List[GeneratedQuestion])
async def generate_exam(request: ExamGenerationRequest, current_user: dict = Depends(get_current_user)):
    try:
        # 1. Fetch Syllabus
        db = await get_database()
        try:
            subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid Subject ID")
            
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
            
        syllabus_text = ""
        valid_topics = []
        if "syllabus" in subject and subject["syllabus"]:
            # Flatten syllabus for prompt
            for unit in subject["syllabus"]:
                unit_id = str(unit.get("unit", ""))
                # Filter by selected units if specified
                if request.units and unit_id not in request.units:
                    continue
                    
                unit_name = unit.get("unit", "Unit")
                title = unit.get("title", "")
                topics = unit.get("topics", [])
                if not isinstance(topics, list):
                    topics = [] # Safely handle if topics is None or not a list
                valid_topics.extend(topics)
                topics_str = ", ".join([str(t) for t in topics])
                syllabus_text += f"Unit {unit_name} ({title}): {topics_str}\n"

        if not valid_topics:
             # Handle case where filtered units have no topics or no units selected
             # If units were requested but none matched (or user deselected all), fallback or error?
             # Let's fallback to full syllabus or "General" if empty to avoid error, 
             # but ideally we should hint valid topics. 
             # If distinct units requested led to empty, maybe just proceed with empty syllabus text so AI makes something up or errors gracefully?
             # Better: If syllabus_text is empty, it means no topics found.
             if request.units:
                 # User selected units but we found nothing?
                 pass
             else:
                 # No units specified, maybe use full? (Logic above covers full if request.units is None)
                 # Fallback if no syllabus parsed yet
                 syllabus_text = f"Subject: {subject['name']}. (No detailed syllabus provided, please generate general questions for this subject.)"


        # 2. Configure Gemini
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="AI Service not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        # 3. Prompt Engineering
        # Safe access for f-string validation
        topic_example_1 = valid_topics[0] if valid_topics else 'TopicName'
        topic_example_2 = valid_topics[1] if len(valid_topics) > 1 else 'TopicName'

        prompt = f"""
        You are an expert professor. Create a {request.difficulty} difficulty exam for the subject based on the syllabus below.
        
        Requirements:
        - Generate EXACTLY {request.question_count} questions.
        - Mix of Question Types:
            - ~70% Multiple Choice Questions (MCQ) - type: "mcq"
            - ~20% True/False Questions - type: "true_false"
            - ~10% One Word Answer Questions - type: "one_word"
            - DO NOT generate Short Answer questions.
        - Format output as a STRICT JSON array.
        - Each question must have: 
            - 'text': Question text
            - 'type': 'mcq' | 'true_false' | 'one_word'
            - 'options': Array of 4 strings (for MCQs only, empty for others)
            - 'correct_answer': The correct option text (for MCQ), "True"/"False" (for T/F), or the answer text (for others).
            - 'marks': int (default 1)
            - 'explanation': Brief explanation of the answer.
            - 'topic': The specific topic name from the syllabus this question relates to. MUST be one of the Valid Topics listed below.
            - 'unit': The Unit number/name (e.g. "1", "2") this topic belongs to.
        
        Valid Topics (Select 'topic' ONLY from this list):
        {", ".join([str(t) for t in valid_topics])}

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
                "explanation": "Why this is correct...",
                "topic": "{topic_example_1}",
                "unit": "1"
            }},
            {{
                "text": "True/False Question?",
                "type": "true_false",
                "options": [],
                "correct_answer": "True",
                "marks": 1,
                "explanation": "...",
                "topic": "{topic_example_2}",
                "unit": "1"
            }}
        ]
        """

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
            if q_type not in ["mcq", "true_false", "one_word"]: # Removed "short_answer" as per prompt
                q_type = "mcq"

            # Validate options for MCQ
            options = q.get("options", [])
            if q_type == "mcq" and len(options) < 2:
                 # Skip malformed MCQs or convert to short answer?
                 # Let's try to keep it robust
                 pass 
            
            # Ensure ID
            q_id = f"ai_gen_{random.randint(1000, 9999)}_{idx}"

            formatted_questions.append({
                "id": q_id,
                "text": q.get("text", "Untitled Question"),
                "type": q_type,
                "options": [str(o) for o in options], # Ensure strings
                "correct_answer": str(q.get("correct_answer", "")),
                "marks": int(q.get("marks", 1)),
                "explanation": q.get("explanation", ""),
                "topic": q.get("topic"),
                "unit": str(q.get("unit", ""))
            })
            
        return formatted_questions

    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {str(e)}")
