import asyncio
from app.db.mongodb import get_database, connect_to_mongo, close_mongo_connection
import json

async def debug_visibility():
    await connect_to_mongo()
    db = await get_database()

    print("\n--- STUDENT ENROLLMENTS ---")
    enrollments = await db.class_students.find().to_list(100)
    for e in enrollments:
        print(f"Student: {e.get('student_id')} -> Class: {e.get('class_id')}")

    print("\n--- EXAMS ---")
    exams = await db.exams.find({}, {"title": 1, "class_ids": 1}).to_list(100)
    for e in exams:
        print(f"Exam: {e.get('title')} ({e.get('_id')})")
        print(f"   Assigned Classes: {e.get('class_ids')}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(debug_visibility())
