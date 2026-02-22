import asyncio
from pymongo import MongoClient
import datetime
import os

def check_data():
    print("--- SYSTEM TIMEZONE ---")
    local_now = datetime.datetime.now()
    timezone = local_now.astimezone().tzinfo
    print(f"Backend System Time: {local_now}")
    print(f"Backend Timezone: {timezone}")
    
    print("\n--- DB STORED VALUE ---")
    # Direct connection for debugging
    client = MongoClient("mongodb://localhost:27017")
    db = client["ai_bharat_db"] # Hardcoding or guessing name based on previous errors/code
    
    # Try getting DB name from config if possible, but hardcoding 'ai_bharat_db' or trying to list dbs
    # Re-checking previous context... user didn't specify DB name recently, but let's try to find it.
    # Actually, let's just use the one from the app if we can import config.
    try:
        from app.core.config import settings
        db_name = settings.DATABASE_NAME
        db = client[db_name]
    except:
        print("Could not load settings, trying 'test' or 'ai_bharat'")
        # Fallback
        db = client["test"] 

    # Find the most recently created exam
    exam = db.exams.find_one(sort=[("created_at", -1)])
    
    if exam:
        print(f"Exam ID: {exam['_id']}")
        print(f"Title: {exam.get('title')}")
        val = exam.get('schedule_start')
        print(f"stored schedule_start: {val} (Type: {type(val)})")
        if isinstance(val, str):
            print(f"Raw String: '{val}'")
            
        print(f"stored created_at: {exam.get('created_at')} (Type: {type(exam.get('created_at'))})")
    else:
        print("No exams found in DB.")

if __name__ == "__main__":
    check_data()
