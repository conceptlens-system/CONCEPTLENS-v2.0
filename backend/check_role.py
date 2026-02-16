from app.db.mongodb import get_database, connect_to_mongo
import asyncio

async def check():
    await connect_to_mongo()
    db = await get_database()
    u = await db.users.find_one({"email": "nikhilkoladia@gmail.com"})
    if u:
        print(f"User: {u['email']}, Role: {u.get('role')}")
    else:
        print("User not found")

if __name__ == "__main__":
    asyncio.run(check())
