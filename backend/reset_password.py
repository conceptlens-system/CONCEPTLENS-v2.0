import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db
from app.core.security import get_password_hash

async def reset_admin():
    await connect_to_mongo()
    
    database = db.client["conceptlens"]
    
    # 1. Reset Admin
    admin_email = "admin@conceptlens.edu"
    new_password = "admin"
    hashed = get_password_hash(new_password)
    
    print(f"Resetting password for {admin_email}...")
    result = await database["users"].update_one(
        {"email": admin_email},
        {"$set": {
            "hashed_password": hashed,
            "role": "admin",
            "is_active": True,
            "name": "Super Admin" # Ensure name exists
        }},
        upsert=True
    )
    print(f"Admin updated. Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted: {result.upserted_id}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(reset_admin())
