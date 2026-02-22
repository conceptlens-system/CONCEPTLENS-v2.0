import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv(r"backend\.env")
MONGO_URL = os.getenv("MONGODB_URL")

async def verify_orphans():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["conceptlens"]
    
    # Get all user IDs from users collection
    existing_users = await db.users.find({}, {"_id": 1, "email": 1, "name": 1}).to_list(length=1000)
    existing_ids = {str(u["_id"]) for u in existing_users}
    print(f"Existing Users ({len(existing_ids)}):")
    for u in existing_users:
        print(f" - {u.get('name')} ({u.get('email')}) ID: {u['_id']}")

    # Check referenced IDs in class_join_requests
    print("\nChecking class_join_requests...")
    requests = await db.class_join_requests.find({}).to_list(length=10)
    for r in requests:
        uid = r.get("student_user_id")
        if uid and uid not in existing_ids:
            print(f" [MISSING] User {uid} referenced in request {r['_id']} (Student: {r.get('student_name')})")
        elif uid:
             print(f" [FOUND] User {uid} exists.")

    # Check referenced IDs in class_students
    print("\nChecking class_students...")
    students = await db.class_students.find({}).to_list(length=10)
    for s in students:
        # student_id is usually email, let's see if we have user_id too?
        # Based on previous output, it has 'student_id' (email).
        # We should check if that email exists in users.
        email = s.get("student_id")
        found = False
        for u in existing_users:
             if u.get("email") == email:
                 found = True
                 break
        if not found:
             print(f" [MISSING] Student Email {email} from class_students not in Users")
        else:
             print(f" [FOUND] Student Email {email} exists.")

if __name__ == "__main__":
    asyncio.run(verify_orphans())
