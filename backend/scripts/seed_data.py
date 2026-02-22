import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.models.schemas import MisconceptionStatus
from datetime import datetime

async def seed():
    await connect_to_mongo()
    print("Connected. Seeding data...")
    
    # 1. Clear Collections
    await db.client.conceptlens.student_responses.delete_many({})
    await db.client.conceptlens.assessments.delete_many({})
    await db.client.conceptlens.misconceptions.delete_many({})
    
    # 2. Create Assessment
    assessment = {
        "_id": "math-midterm-01",
        "title": "Algebra Midterm 2024",
        "subject": "Mathematics",
        "questions": [
            {"id": "q1", "text": "Solve for x: x^2 - 4 = 0", "correct_answer": "2, -2", "type": "short_answer"}
        ]
    }
    await db.client.conceptlens.assessments.insert_one(assessment)
    
    # 3. Create Responses (Cluster 1: Only Positive Root)
    responses = []
    for i in range(15):
        responses.append({
            "assessment_id": "math-midterm-01",
            "question_id": "q1",
            "student_id": f"student_{i}",
            "response_text": "2", # Forgot -2
            "is_correct": False,
            "timestamp": datetime.utcnow()
        })
        
    # Cluster 2: Zero
    for i in range(15, 25):
        responses.append({
            "assessment_id": "math-midterm-01",
            "question_id": "q1",
            "student_id": f"student_{i}",
            "response_text": "0", 
            "is_correct": False,
            "timestamp": datetime.utcnow()
        })
        
    await db.client.conceptlens.student_responses.insert_many(responses)
    
    # 4. Create Pre-Calculated Misconception (Mock Analysis Result)
    misconception = {
        "assessment_id": "math-midterm-01",
        "question_id": "q1",
        "cluster_label": "Incomplete Root Finding",
        "description": "Students identified the positive root (2) but failed to identify the negative root (-2).",
        "student_count": 15,
        "confidence_score": 0.92,
        "status": "pending",
        "example_ids": [],
        "created_at": datetime.utcnow(),
        "last_updated": datetime.utcnow()
    }
    await db.client.conceptlens.misconceptions.insert_one(misconception)
    
    print("Seed complete!")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed())
