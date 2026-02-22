import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from collections import defaultdict

# DB Config (matching existing config)
MONGODB_URL = "mongodb+srv://prathamdarji15122_db_user:pd%409173312623@cluster0.j265yzh.mongodb.net/?appName=Cluster0"
DATABASE_NAME = "conceptlens"

async def debug_misconceptions():
    print(f"Connecting to {MONGODB_URL}...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    # 1. Get the most recent exam
    print("Fetching most recent exam...")
    cursor = db.exams.find().sort("created_at", -1).limit(1)
    exams = await cursor.to_list(1)
    
    if not exams:
        print("No exams found.")
        return

    exam = exams[0]
    exam_id = str(exam["_id"])
    print(f"Latest Exam: {exam.get('title', 'Unknown')} (ID: {exam_id})")
    
    # 2. Get misconceptions for this exam
    print(f"\nFetching misconceptions for Exam ID: {exam_id}...")
    m_cursor = db.misconceptions.find({"assessment_id": exam_id})
    misconceptions = await m_cursor.to_list(1000)
    
    print(f"Total Misconception Records: {len(misconceptions)}")
    
    # 3. Analyze for duplicates
    grouped = defaultdict(list)
    for m in misconceptions:
        key = (m.get("question_id"), m.get("cluster_label"))
        grouped[key].append(m)
        
    print("\n--- Analysis by (Question ID, Label) ---")
    for (qid, label), items in grouped.items():
        count = len(items)
        print(f"QID: {qid} | Label: '{label}' | Count: {count}")
        if count > 1:
            print(f"  [!] DUPLICATE DETECTED! Found {count} records.")
            for item in items:
                print(f"    - ID: {item['_id']} | Status: {item.get('status')} | Student Count: {item.get('student_count')}")

    # 4. Check Student Responses for context
    print("\n--- Checking Student Responses ---")
    r_cursor = db.student_responses.find({"assessment_id": exam_id})
    responses = await r_cursor.to_list(1000)
    print(f"Total Student Responses: {len(responses)}")
    
    # Group responses by question to see what b_stu answered
    # We don't have student names easily, but we can look at unique students
    student_responses = defaultdict(list)
    for r in responses:
        student_responses[r["student_id"]].append(r)
        
    print(f"Unique Students: {len(student_responses)}")
    for sid, resps in student_responses.items():
        print(f"Student {sid}: {len(resps)} responses")

if __name__ == "__main__":
    asyncio.run(debug_misconceptions())
