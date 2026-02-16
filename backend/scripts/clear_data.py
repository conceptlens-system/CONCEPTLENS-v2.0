import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.mongodb import connect_to_mongo, close_mongo_connection, db

async def clear():
    await connect_to_mongo()
    print("Connected. Clearing data...")
    
    await db.client.conceptlens.student_responses.delete_many({})
    await db.client.conceptlens.assessments.delete_many({})
    await db.client.conceptlens.misconceptions.delete_many({})
    await db.client.conceptlens.teacher_validations.delete_many({})
    
    print("Database Cleared!")
    await close_mongo_connection()

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(clear())
    except Exception as e:
        print(e)
