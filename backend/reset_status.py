
import asyncio
import os
from app.db.mongodb import get_database, connect_to_mongo

# Mock env
os.environ["MONGODB_URL"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "conceptlens"

async def reset_pending():
    await connect_to_mongo()
    db = await get_database()
    print("Connected. Resetting statuses to 'pending'...")
    
    result = await db.misconceptions.update_many(
        {}, 
        {"$set": {"status": "pending"}}
    )
    
    print(f"Updated {result.modified_count} misconceptions to 'pending'.")

if __name__ == "__main__":
    asyncio.run(reset_pending())
