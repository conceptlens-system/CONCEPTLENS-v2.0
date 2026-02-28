import asyncio
import os
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime, timedelta

load_dotenv()

async def seed_responses():
    mongo_url = os.getenv("MONGODB_URL")
    if not mongo_url:
        print("MongoDB URL not found")
        return
        
    client = AsyncIOMotorClient(mongo_url)
    db = client.get_database()
    if db.name != "conceptlens":
       db = client["conceptlens"]
       
    # 1. Find a professor
    prof = await db.users.find_one({'email': 'prathamdarji15122@gmail.com'})
    if not prof:
        print("Professor not found")
        return
        
    # 2. Find a student
    student = await db.users.find_one({'role': 'student'})
    if not student:
        print("No student found to seed responses for")
        return
        
    student_id = str(student["_id"])
    print(f"Seeding for student: {student['email']}")
    
    # 3. Get some exams
    exams = await db.exams.find({"professor_id": str(prof["_id"])}).to_list(5)
    
    if not exams:
        print("No exams found for this professor.")
        return
        
    seeded_count = 0
    now = datetime.utcnow()
    
    # Generate some responses
    for exam in exams:
        questions = exam.get("questions", [])
        if not questions: continue
        
        # We want to simulate that they took this exam recently
        for q in questions:
            # Let's make them good at some topics, bad at others
            topic = q.get("topic", "General")
            
            # Artificial struggle: Always fail 'Polymorphism' or 'Recursion'
            is_correct = random.choice([True, True, False]) # 66% win rate
            
            if "poly" in topic.lower() or "recur" in topic.lower():
                is_correct = False
            if "basic" in topic.lower():
                is_correct = True
                
            resp = {
                "student_id": student_id,
                "assessment_id": str(exam["_id"]),
                "question_id": str(q.get("id")),
                "response_text": "I think it is X" if not is_correct else q.get("correct_answer", "Correct"),
                "is_correct": is_correct,
                "submitted_at": now - timedelta(days=random.randint(0, 5))
            }
            
            await db.student_responses.insert_one(resp)
            seeded_count += 1
            
    print(f"Successfully seeded {seeded_count} test responses!")

if __name__ == "__main__":
    asyncio.run(seed_responses())
