import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.core.config import settings
import sys

# Force load env vars if needed
from dotenv import load_dotenv
load_dotenv()

async def check_user(email):
    await connect_to_mongo()
    try:
        print(f"Checking user: {email}")
        user = await db.client[settings.DATABASE_NAME]["users"].find_one({"email": email})
        if user:
            print("User found!")
            print(f"ID: {user.get('_id')}")
            print(f"Role: {user.get('role')}")
            print(f"Is Active: {user.get('is_active')}")
            print(f"Has Password: {'password' in user}")
            print(f"Full Record: {user}")
        else:
            print("User NOT found in 'users' collection.")
            
            # Check professors collection if separate (though auth usually uses users)
            print("Checking 'professors' collection...")
            prof = await db.client[settings.DATABASE_NAME]["professors"].find_one({"email": email})
            if prof:
                 print("Found in 'professors' collection!")
                 print(f"ID: {prof.get('_id')}")
                 print(f"Record: {prof}")
            else:
                print("Not found in 'professors' either.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    email = "prathamdarji15122@gmail.com"
    if len(sys.argv) > 1:
        email = sys.argv[1]
    asyncio.run(check_user(email))
