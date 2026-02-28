import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    mongo_url = os.getenv("MONGODB_URL")
    if not mongo_url:
        print("MongoDB URL not found in .env")
        return
        
    client = AsyncIOMotorClient(mongo_url)
    db = client.get_database() # or client['conceptlens'] if it's not the default in the URL
    if db.name != "conceptlens":
       db = client["conceptlens"]
       
    user = await db.users.find_one({'email': 'prathamdarji15122@gmail.com'})
    if not user:
        print("User not found!")
        return
        
    print("USER EMAIL:", user.get("email"))
    print("USER AUTH PROVIDER:", user.get("auth_provider"))
    print("USER HAS PASSWORD:", bool(user.get("hashed_password")))
    print("USER ROLE:", user.get("role"))
    print("USER IS_ACTIVE:", user.get("is_active"))

if __name__ == "__main__":
    asyncio.run(main())
