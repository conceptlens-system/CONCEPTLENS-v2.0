
import asyncio
import os
from app.db.mongodb import get_database, connect_to_mongo
from bson import ObjectId

# Mock env vars
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"

async def debug_grouping():
    await connect_to_mongo()
    print("--- DEBUGGING GROUPED MISCONCEPTIONS ---")
    db = await get_database()
    
    # 1. Fetch all misconceptions
    cursor = db.misconceptions.find({})
    all_misconceptions = await cursor.to_list(1000)
    print(f"Total Misconceptions: {len(all_misconceptions)}")
    
    if not all_misconceptions:
        print("No misconceptions in DB!")
        return

    # 2. Check Status distribution
    statuses = {}
    assessment_ids = set()
    for m in all_misconceptions:
        s = m.get("status", "unknown")
        statuses[s] = statuses.get(s, 0) + 1
        assessment_ids.add(m["assessment_id"])
        
    print(f"Status Counts: {statuses}")
    print(f"Associated Assessment IDs: {assessment_ids}")
    
    # 3. Check Exams and Professor IDs
    print("\n--- Checking Exams ---")
    exams_cursor = db.exams.find({"_id": {"$in": [ObjectId(aid) for aid in assessment_ids]}})
    exams = await exams_cursor.to_list(100)
    
    exam_map = {str(e["_id"]): e for e in exams}
    
    for aid in assessment_ids:
        if aid in exam_map:
            exam = exam_map[aid]
            print(f"Exam {aid}: Found. Title='{exam.get('title')}', ProfessorID='{exam.get('professor_id')}'")
        else:
            print(f"Exam {aid}: NOT FOUND in DB")
            
    # 4. Check User (We can't easily retrieve the 'current_user' from here without a token, 
    # but we can list all professors to see if there's a match)
    print("\n--- Checking Professors ---")
    profs = await db.professors.find({}).to_list(100)
    for p in profs:
        print(f"Professor: {p.get('name')} (ID: {p.get('_id')})")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(debug_grouping())
