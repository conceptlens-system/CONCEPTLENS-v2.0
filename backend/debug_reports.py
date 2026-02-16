
import asyncio
import os
from app.db.mongodb import get_database, connect_to_mongo
from bson import ObjectId

# Mock env
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"

async def debug_reports():
    await connect_to_mongo()
    db = await get_database()
    print("Connected to MongoDB")
    
    # 1. Get a professor (just take the first one found in exams)
    exam = await db.exams.find_one({})
    if not exam:
        print("No exams found.")
        return
        
    prof_id = exam["professor_id"]
    print(f"Checking for Professor ID: {prof_id}")
    
    # 2. Fetch Exams
    exams_cursor = db.exams.find({"professor_id": prof_id})
    exams = await exams_cursor.to_list(100)
    exam_ids = [str(e["_id"]) for e in exams]
    print(f"Found {len(exams)} exams: {exam_ids}")
    
    # 3. Check Misconceptions
    # Check RAW first
    all_count = await db.misconceptions.count_documents({})
    print(f"Total Misconceptions in DB: {all_count}")
    
    # Check VALID
    valid_count = await db.misconceptions.count_documents({"status": "valid"})
    print(f"Valid Misconceptions: {valid_count}")
    
    # Check Mapping
    # note: assessment_id is usually a string in misconceptions based on previous schemas
    mapped_count = await db.misconceptions.count_documents({
        "assessment_id": {"$in": exam_ids},
        "status": "valid"
    })
    print(f"Valid Misconceptions linked to these exams: {mapped_count}")
    
    if mapped_count == 0:
        print("MISMATCH DETECTED. checking sample misconception...")
        sample = await db.misconceptions.find_one()
        if sample:
            print(f"Sample assessment_id: {sample.get('assessment_id')} (Type: {type(sample.get('assessment_id'))})")
            print(f"Sample status: {sample.get('status')}")

if __name__ == "__main__":
    asyncio.run(debug_reports())
