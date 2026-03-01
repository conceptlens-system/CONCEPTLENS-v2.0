from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.db.mongodb import get_database
from app.core.config import settings
from app.core.security import get_current_user
from bson import ObjectId
import google.generativeai as genai
import json
import random
from datetime import datetime

router = APIRouter()

class PracticeGenerationRequest(BaseModel):
    subject_id: str
    topic: str
    question_count: int = 5
    difficulty: str = "Medium"

class PracticeQuestion(BaseModel):
    id: str
    text: str
    type: str = "mcq"
    options: List[str] = []
    correct_answer: str
    explanation: str

class PracticeSubmission(BaseModel):
    subject_id: str
    topic: str
    score: int
    total_questions: int
    difficulty: str

@router.post("/generate", response_model=List[PracticeQuestion])
async def generate_practice(request: PracticeGenerationRequest, current_user: dict = Depends(get_current_user)):
    try:
        # 1. Fetch Subject for Context
        db = await get_database()
        try:
            subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid Subject ID")
            
        subject_name = subject["name"] if subject else "General Content"

        # 2. Configure Gemini
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="AI Service not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        # 3. Prompt Engineering
        prompt = f"""
        You are an expert professor in {subject_name}. Create a short {request.difficulty} difficulty practice quiz for a student who is struggling with the following topic: "{request.topic}".
        
        Requirements:
        - Generate EXACTLY {request.question_count} questions.
        - Mix of Question Types:
            - Mostly Multiple Choice Questions (MCQ) - type: "mcq"
            - Some True/False Questions - type: "true_false"
        - Format output as a STRICT JSON array.
        - Each question must have: 
            - 'text': Question text
            - 'type': 'mcq' | 'true_false'
            - 'options': Array of 4 strings (for MCQs only, empty array for T/F)
            - 'correct_answer': The exact correct option text (for MCQ) or "True"/"False" (for T/F).
            - 'explanation': Highly detailed, encouraging explanation of the answer to help the student learn from their mistakes.
        
        JSON Schema:
        [
            {{
                "text": "Question text here?",
                "type": "mcq",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option C",
                "explanation": "Great job! This is correct because..."
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
            q_type = q.get("type", "mcq").lower()
            if q_type not in ["mcq", "true_false"]:
                q_type = "mcq"

            options = q.get("options", [])
            q_id = f"practice_{random.randint(1000, 9999)}_{idx}"

            formatted_questions.append({
                "id": q_id,
                "text": q.get("text", "Untitled Question"),
                "type": q_type,
                "options": [str(o) for o in options], 
                "correct_answer": str(q.get("correct_answer", "")),
                "explanation": q.get("explanation", "Keep practicing!")
            })
            
        # Log AI Usage (Optional, tracking student practice generation)
        try:
            user_id = current_user.get("_id") or current_user.get("id")
            await db["ai_usage_logs"].insert_one({
                "timestamp": datetime.utcnow(),
                "user_id": user_id,
                "institution_id": current_user.get("institution_id"),
                "subject_id": request.subject_id,
                "questions_generated": len(formatted_questions),
                "model": "gemini-flash-latest",
                "context": "practice_mode"
            })
        except Exception as e:
            pass # Non-critical

        return formatted_questions

    except Exception as e:
        print(f"Error generating practice: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate practice quiz")


@router.post("/submit")
async def submit_practice(submission: PracticeSubmission, current_user: dict = Depends(get_current_user)):
    """Record student practice results for gamification and tracking"""
    try:
        db = await get_database()
        user_id = current_user.get("_id") or current_user.get("id")
        
        result = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "subject_id": ObjectId(submission.subject_id),
            "topic": submission.topic,
            "score": submission.score,
            "total_questions": submission.total_questions,
            "difficulty": submission.difficulty,
            "timestamp": datetime.utcnow()
        }
        
        await db["practice_results"].insert_one(result)
        
        # Calculate points for Gamification
        # e.g., Base points for completing + Bonus for high score
        points_earned = 10 + int((submission.score / max(1, submission.total_questions)) * 40)
        
        # Update user's total points (Leaderboard feature)
        await db["users"].update_one(
            {"_id": result["user_id"]},
            {"$inc": {"points": points_earned}}
        )
        
        return {"success": True, "points_earned": points_earned}

    except Exception as e:
        print(f"Error saving practice result: {e}")
        raise HTTPException(status_code=500, detail="Failed to save practice result")

@router.get("/history")
async def get_practice_history(
    page: int = 1, 
    limit: int = 9, 
    current_user: dict = Depends(get_current_user)
):
    """Fetch student practice history with pagination"""
    try:
        db = await get_database()
        user_id = current_user.get("_id") or current_user.get("id")
        uid_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Pipeline for history with subject names
        pipeline = [
            {"$match": {"user_id": uid_obj}},
            {"$sort": {"timestamp": 1}}, # Oldest to Latest as requested
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "subjects",
                    "localField": "subject_id",
                    "foreignField": "_id",
                    "as": "subject_data"
                }
            },
            {
                "$addFields": {
                    "subject_name": {"$arrayElemAt": ["$subject_data.name", 0]}
                }
            },
            {
                "$project": {
                    "subject_data": 0
                }
            }
        ]
        
        results = await db["practice_results"].aggregate(pipeline).to_list(limit)
        
        # Format for JSON
        formatted_results = []
        for r in results:
            r["_id"] = str(r["_id"])
            r["user_id"] = str(r["user_id"])
            r["subject_id"] = str(r["subject_id"])
            if "timestamp" in r:
                ts = r.get("timestamp")
                r["timestamp"] = ts.isoformat() if hasattr(ts, "isoformat") else ts
            formatted_results.append(r)
        
        total_count = await db["practice_results"].count_documents({"user_id": uid_obj})
        
        # Get current points
        user = await db["users"].find_one({"_id": uid_obj})
        current_points = user.get("points", 0) if user else 0
        
        return {
            "history": formatted_results,
            "total": total_count,
            "current_points": current_points
        }
    except Exception as e:
        print(f"Error fetching practice history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch practice history")
