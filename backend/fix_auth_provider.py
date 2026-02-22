import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.core.config import settings
import sys

# Force load env vars from .env
from dotenv import load_dotenv
import os
load_dotenv()

async def fix_user_auth(email):
    await connect_to_mongo()
    try:
        print(f"Checking user: {email}")
        user = await db.client[settings.DATABASE_NAME]["users"].find_one({"email": email})
        
        if user:
            print(f"Current Auth Provider: {user.get('auth_provider')}")
            
            # Force update to local
            result = await db.client[settings.DATABASE_NAME]["users"].update_one(
                {"email": email},
                {"$set": {"auth_provider": "local"}}
            )
            
            print(f"Updated auth_provider to 'local'. Modified count: {result.modified_count}")
            
            # Verify
            updated_user = await db.client[settings.DATABASE_NAME]["users"].find_one({"email": email})
            print(f"New Auth Provider: {updated_user.get('auth_provider')}")
            print(f"Hashed Password starts with: {updated_user.get('hashed_password')[:15]}...")
        else:
            print("User not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    email = "prathamdarji15122@gmail.com"
    asyncio.run(fix_user_auth(email))
