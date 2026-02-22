import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load env
load_dotenv(r"backend\.env")

REMOTE_URI = os.getenv("MONGODB_URL")
LOCAL_URI = "mongodb://localhost:27017"

async def check_db(uri, label):
    print(f"\n--- Checking {label} ---")
    print(f"URI: {uri}")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        # Force connection
        await client.server_info()
        
        db = client.get_database("conceptlens")
        users = await db.users.count_documents({})
        print(f"Users in 'conceptlens': {users}")
        
        # Check other DBs just in case
        dbs = await client.list_database_names()
        print(f"Databases found: {dbs}")
        
        for db_name in dbs:
            if db_name != "conceptlens":
                count = await client[db_name].users.count_documents({})
                if count > 0:
                    print(f"  Users in '{db_name}': {count}")

    except Exception as e:
        print(f"Failed to connect: {e}")

async def main():
    await check_db(REMOTE_URI, "REMOTE (Atlas)")
    await check_db(LOCAL_URI, "LOCAL (localhost)")

if __name__ == "__main__":
    asyncio.run(main())
