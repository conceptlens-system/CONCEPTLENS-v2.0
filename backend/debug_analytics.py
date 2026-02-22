
import asyncio
import os
from app.db.mongodb import get_database, connect_to_mongo
from bson import ObjectId
from app.kiro.analyzers.clustering import cluster_responses
from app.models.schemas import StudentResponse
from datetime import datetime

# Mock env vars
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"
# FORCE DEMO MODE FOR SCRIPT
os.environ["ANALYTICS_MODE"] = "demo"

async def patch_and_analyze():
    await connect_to_mongo()
    print("--- FIXING & ANALYZING ---")
    db = await get_database()
    
    # 1. Fetch Ungraded Responses
    cursor = db.student_responses.find({"is_correct": None})
    ungraded = await cursor.to_list(1000)
    print(f"Found {len(ungraded)} ungraded responses.")
    
    fixed_count = 0
    assessment_ids = set()
    
    # 1b. ALSO fetch assessments for ANY incorrect responses to force re-analysis
    cursor_incorrect = db.student_responses.find({"is_correct": False})
    incorrect_all = await cursor_incorrect.to_list(1000)
    for r in incorrect_all:
        assessment_ids.add(r["assessment_id"])
    
    for r in ungraded:
        aid = r["assessment_id"]
        assessment_ids.add(aid)
        
        # Fetch Exam
        exam = await db.exams.find_one({"_id": ObjectId(aid)})
        if not exam:
            print(f"Exam {aid} not found for response {r['_id']}")
            continue
            
        # Grade
        correct_answers = {q["id"]: q["correct_answer"].strip().lower() for q in exam["questions"]}
        q_id = r["question_id"]
        
        student_text = r["response_text"].strip().lower()
        correct_text = correct_answers.get(q_id, "")
        
        is_correct = (student_text == correct_text)
        
        # Validating
        print(f"Grading {r['_id']}: {student_text} vs {correct_text} -> {is_correct}")
        
        # Update DB
        await db.student_responses.update_one(
            {"_id": r["_id"]},
            {"$set": {"is_correct": is_correct, "processed": False}}
        )
        fixed_count += 1

    print(f"Fixed {fixed_count} responses.")
    
    # 2. Run Manual Analysis on likely assessments
    # We need to re-fetch responses as Pydantic models
    from app.core.config import settings
    settings.ANALYTICS_MODE = "demo" # Force setting
    
    for aid in assessment_ids:
        print(f"Analyzing Assessment: {aid}")
        # Fetch incorrect, unprocessed (or just incorrect to be safe for demo)
        cursor = db.student_responses.find({"assessment_id": aid, "is_correct": False})
        raw_responses = await cursor.to_list(1000)
        
        print(f"Found {len(raw_responses)} incorrect responses for {aid}")
        
        # Group by Question
        from collections import defaultdict
        by_question = defaultdict(list)
        for r in raw_responses:
            r["_id"] = str(r["_id"])
            # Ensure keys exist
            if "submitted_at" not in r: r["submitted_at"] = datetime.utcnow()
            
            try:
                model = StudentResponse(**r)
                by_question[r["question_id"]].append(model)
            except Exception as e:
                print(f"Skipping bad response {r['_id']}: {e}")

        # Cluster
        new_misconceptions = []
        for q_id, resps in by_question.items():
            print(f"Clustering Q: {q_id} with {len(resps)} responses...")
            clusters = cluster_responses(resps, aid, q_id)
            new_misconceptions.extend(clusters)
            
        print(f"Generated {len(new_misconceptions)} misconceptions.")
        
        if new_misconceptions:
             # Add timestamps
            for m in new_misconceptions:
                m["created_at"] = datetime.utcnow()
                m["last_updated"] = datetime.utcnow()
                
            # Clear old pending ones to avoid dupes in this script? No, just insert.
            await db.misconceptions.insert_many(new_misconceptions)
            print("Saved to DB.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(patch_and_analyze())
