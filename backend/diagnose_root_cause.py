
import asyncio
import os
import difflib
from app.db.mongodb import get_database, connect_to_mongo
from app.core.config import settings

# Mock env vars
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"

async def diagnose():
    await connect_to_mongo()
    db = await get_database()
    print("--- ROOT CAUSE DIAGNOSIS ---")
    
    # 1. Confirm Misconception Records
    print("\n[Q1] Misconception Records:")
    cursor = db.misconceptions.find({})
    misconceptions = await cursor.to_list(100)
    print(f"Count: {len(misconceptions)}")
    for m in misconceptions:
        print(f" - ID: {m['_id']} | Status: '{m.get('status')}' | Label: '{m.get('cluster_label')}'")

    # 3. Confirm Demo Mode (Config)
    print("\n[Q3] Runtime Config:")
    print(f"ANALYTICS_MODE from config: '{settings.ANALYTICS_MODE}'")
    
    # 4 & 5. Student Count & Similarity Logic Check
    print("\n[Q4 & Q5] Clustering Logic Check (Last 2 Incorrect Responses):")
    # Get last 2 incorrect responses for the SAME question
    resps = await db.student_responses.find({"is_correct": False}).sort("submitted_at", -1).to_list(100)
    
    # Group by (assessment_id, question_id)
    groups = {}
    for r in resps:
        key = (r['assessment_id'], r['question_id'])
        if key not in groups: groups[key] = []
        groups[key].append(r)
        
    found_pair = False
    for key, items in groups.items():
        if len(items) >= 2:
            r1 = items[0]
            r2 = items[1]
            print(f"Found pair for Assessment {key[0]}, Question {key[1]}:")
            print(f" - Student A: '{r1['response_text']}'")
            print(f" - Student B: '{r2['response_text']}'")
            
            # Logic from clustering.py
            similarity = difflib.SequenceMatcher(None, r1['response_text'].lower(), r2['response_text'].lower()).ratio()
            print(f" - Calculated Similarity: {similarity}")
            print(f" - Threshold needed: 0.6")
            if similarity >= 0.6:
                print(" -> PASS: Should cluster.")
            else:
                print(" -> FAIL: Similarity too low.")
                
            found_pair = True
            break
            
    if not found_pair:
        print("No pair of incorrect responses found for the same question to test logic.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(diagnose())
