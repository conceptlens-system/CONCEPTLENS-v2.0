
import asyncio
import os
from app.db.mongodb import get_database, connect_to_mongo

# Mock env vars
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"

async def fix_status():
    await connect_to_mongo()
    print("--- FIXING STATUSES ---")
    db = await get_database()
    
    # Update all pending to valid
    result = await db.misconceptions.update_many(
        {"status": "pending"},
        {"$set": {"status": "valid"}}
    )
    
    print(f"Updated {result.modified_count} misconceptions to 'valid'.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(fix_status())
