import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.core.config import settings
from app.core.security import get_password_hash
import sys

# Force load env vars if needed
from dotenv import load_dotenv
load_dotenv()

async def reset_password(email, new_password):
    await connect_to_mongo()
    try:
        print(f"Resetting password for: {email}")
        new_hash = get_password_hash(new_password)
        
        result = await db.client[settings.DATABASE_NAME]["users"].update_one(
            {"email": email},
            {"$set": {"hashed_password": new_hash}}
        )
        
        if result.modified_count > 0:
            print(f"Success! Password updated for {email}")
            print(f"New Hash: {new_hash}")
        else:
            print("User not found or password validation failed (no change).")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    email = "prathamdarji15122@gmail.com"
    password = "password123"
    asyncio.run(reset_password(email, password))
