import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load env
load_dotenv(r"backend\.env")

MONGO_URL = os.getenv("MONGODB_URL")

async def investigate():
    print(f"Connecting to: {MONGO_URL.split('@')[1]}") # Hide credentials
    client = AsyncIOMotorClient(MONGO_URL)
    
    # 1. Check 'sample_mflix' content
    print("\n--- Checking 'sample_mflix.users' ---")
    try:
        sample_users = await client["sample_mflix"]["users"].find({}, limit=5).to_list(length=5)
        for u in sample_users:
            print(f"User: {u.get('name', 'NoName')} | Email: {u.get('email')} | Roles: {u.get('role', 'NoRole')}")
    except Exception as e:
        print(f"Error checking sample_mflix: {e}")

    # 2. Check 'conceptlens' other collections
    print("\n--- Checking 'conceptlens' collections ---")
    db = client["conceptlens"]
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    
    for col_name in collections:
        count = await db[col_name].count_documents({})
        print(f"  {col_name}: {count}")
        if count > 0 and count < 10:
             docs = await db[col_name].find({}, limit=3).to_list(length=3)
             print(f"    Sample docs: {docs}")

if __name__ == "__main__":
    asyncio.run(investigate())
