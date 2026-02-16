import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.core.config import settings
from app.core.security import get_password_hash
import sys

# Force load env vars
from dotenv import load_dotenv
load_dotenv()

async def set_password(email, plain_password):
    await connect_to_mongo()
    try:
        print(f"Setting password for: {email}")
        
        # 1. Generate secure hash
        new_hash = get_password_hash(plain_password)
        
        # 2. Update DB
        result = await db.client[settings.DATABASE_NAME]["users"].update_one(
            {"email": email},
            {"$set": {
                "hashed_password": new_hash,
                "auth_provider": "local" # Ensure they can login with password
            }}
        )
        
        if result.modified_count > 0:
            print(f"Success! Password updated.")
        elif result.matched_count > 0:
            print("User found, but password was already set to this value.")
        else:
            print("User not found!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python set_password.py <email> <new_password>")
    else:
        email = sys.argv[1]
        pwd = sys.argv[2]
        asyncio.run(set_password(email, pwd))
