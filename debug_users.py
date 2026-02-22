import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load env from backend
env_path = r"d:\Projects\CONCEPTLENS\backend\.env"
load_dotenv(env_path)

MONGO_URL = os.getenv("MONGODB_URL")
if not MONGO_URL:
    print("Error: MONGODB_URL not found in .env")
    exit(1)

async def check_users():
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client.get_database() # Uses default db from connection string
        
        users_collection = db["users"]
        count = await users_collection.count_documents({})
        
        print(f"Total Users Found: {count}")
        
        if count > 0:
            print("\nUser Listing:")
            cursor = users_collection.find({})
            async for user in cursor:
                # Mask sensitive info
                email = user.get("email", "N/A")
                role = user.get("role", "N/A")
                provider = user.get("auth_provider", "local")
                is_active = user.get("is_active", False)
                print(f"- Email: {email} | Role: {role} | Provider: {provider} | Active: {is_active}")
        else:
            print("No users found in the database. You probably need to Sign Up first.")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
