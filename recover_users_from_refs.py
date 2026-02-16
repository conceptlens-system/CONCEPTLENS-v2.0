import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.security import get_password_hash
from bson import ObjectId

# Load env from backend
load_dotenv(r"backend\.env")

MONGO_URL = os.getenv("MONGODB_URL")

async def recover_users():
    print("--- User Recovery Helper ---")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["conceptlens"]
    
    # 1. Get existing emails
    existing_users = await db.users.find({}, {"email": 1}).to_list(1000)
    existing_emails = {u.get("email") for u in existing_users}
    print(f"Existing Users: {len(existing_emails)}")

    # 2. Collect Missing Users from References
    missing_users = {} # email -> {name, role, source}
    
    # Check class_students
    cursor = db.class_students.find({})
    async for s in cursor:
        email = s.get("student_id")
        if email and email not in existing_emails:
            if email not in missing_users:
                 missing_users[email] = {"name": "Unknown (Recovered)", "role": "student", "source": "class_students", "email": email}

    # Check join_requests (richer data)
    cursor = db.class_join_requests.find({})
    async for r in cursor:
        # student_id is email
        email = r.get("student_id")
        # student_user_id is the OLD ID (we can't restore ID easily if it's auto-generated, but we can try)
        # However, restoring _id requires manual crafting. Let's stick to restoring account by email.
        name = r.get("student_name")
        
        if email and email not in existing_emails:
            # Update info if available
            if email not in missing_users:
                 missing_users[email] = {"name": name or "Unknown", "role": "student", "source": "join_request", "email": email}
            elif name:
                 missing_users[email]["name"] = name

    # Check professor_requests
    cursor = db.professor_requests.find({})
    async for r in cursor:
        email = r.get("email")
        if email and email not in existing_emails:
             missing_users[email] = {"name": r.get("name", "Unknown"), "role": "professor", "source": "professor_request", "email": email}

    # 3. Analyze Orphaned Professor IDs (from Classes/Exams)
    print("\n--- Analyzing Orphaned Professor IDs ---")
    prof_ids = {} # _id -> {count, sources}
    
    # helper
    def add_ref(pid, source):
        pid = str(pid)
        if pid not in prof_ids:
            prof_ids[pid] = {"count": 0, "sources": set()}
        prof_ids[pid]["count"] += 1
        prof_ids[pid]["sources"].add(source)

    # Scan Classes
    async for c in db.classes.find({}, {"professor_id": 1, "name": 1}):
        if c.get("professor_id"):
            add_ref(c["professor_id"], f"Class: {c.get('name')}")
            
    # Scan Exams
    async for e in db.exams.find({}, {"professor_id": 1, "title": 1}):
        if e.get("professor_id"):
            add_ref(e["professor_id"], f"Exam: {e.get('title')}")

    # Check if these IDs exist in users
    existing_user_ids = {str(u["_id"]) for u in existing_users}
    orphaned_prof_ids = []
    
    for pid, info in prof_ids.items():
        if pid not in existing_user_ids:
            print(f"Orphaned Professor ID: {pid} (References: {info['count']})")
            print(f"  Sample Sources: {list(info['sources'])[:3]}")
            orphaned_prof_ids.append(pid)
            
    print(f"\nFound {len(missing_users)} missing users referenced by email.")
    print(f"Found {len(orphaned_prof_ids)} orphaned Professor IDs (missing email link).")
    
    if len(missing_users) > 0 or len(orphaned_prof_ids) > 0:
        print("\n--- RECOVERY OPTIONS ---")
        print("1. Restore users found by email (run with 'RESTORE_EMAILS')")
        print("2. Restore a specific Professor ID with an email (run with 'RESTORE_PROF <id> <email>')")
        
        import sys
        if len(sys.argv) > 1:
            if sys.argv[1] == "RESTORE_EMAILS":
                 print("\nRestoring users by email...")
                 default_hash = get_password_hash("password123")
                 count = 0
                 for email, info in missing_users.items():
                    # Check if exists again to be safe
                    if await db.users.find_one({"email": email}):
                        print(f"Skipping {email} (already exists)")
                        continue
                        
                    new_user = {
                        "email": email,
                        "full_name": info["name"],
                        "hashed_password": default_hash,
                        "role": info["role"],
                        "is_active": True,
                        "auth_provider": "local",
                        "restored_at": datetime.utcnow()
                    }
                    await db.users.insert_one(new_user)
                    count += 1
                 print(f"Restored {count} users.")
                 
            elif sys.argv[1] == "RESTORE_PROF" and len(sys.argv) > 3:
                pid = sys.argv[2]
                email = sys.argv[3]
                print(f"\nRestoring Professor {pid} as {email}...")
                
                if await db.users.find_one({"email": email}):
                    print("Error: Email already exists!")
                    return
                
                try:
                    obj_id = ObjectId(pid)
                    new_user = {
                        "_id": obj_id,
                        "email": email,
                        "full_name": "Restored Professor",
                        "hashed_password": get_password_hash("password123"),
                        "role": "professor",
                        "is_active": True,
                        "auth_provider": "local",
                        "restored_at": datetime.utcnow()
                    }
                    await db.users.insert_one(new_user)
                    print("Success! Professor account restored with original ID.")
                except Exception as e:
                    print(f"Error restoring professor: {e}")

    else:
        print("No missing users found based on references.")

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(recover_users())
