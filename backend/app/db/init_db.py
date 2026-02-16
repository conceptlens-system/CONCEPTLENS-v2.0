import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

from app.core.config import settings

# Config
MONGO_URL = settings.MONGODB_URL
DB_NAME = settings.DATABASE_NAME
PWD_CONTEXT = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return PWD_CONTEXT.hash(password)

async def init_db():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    admin_email = "admin@conceptlens.edu"
    
    existing_admin = await db["users"].find_one({"email": admin_email})
    if not existing_admin:
        print(f"Creating default admin user: {admin_email}")
        admin_user = {
            "email": admin_email,
            "hashed_password": get_password_hash("admin"),
            "full_name": "System Administrator",
            "role": "admin",
            "institution_id": "system",
            "is_active": True
        }
        await db["users"].insert_one(admin_user)
        print("Admin user created.")
    else:
        print("Admin user already exists.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(init_db())
