import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db

async def verify_system():
    print("--- CONNECTING TO DATABASE ---")
    try:
        await connect_to_mongo()
        database = db.client["conceptlens"]
        
        # 1. Check Admin User
        admin = await database["users"].find_one({"email": "admin@conceptlens.edu"})
        print("\n[USER CHECK]")
        if admin:
            print(f"✅ Admin Found: {admin['email']}")
            print(f"   Role: {admin.get('role')}")
            print(f"   Active: {admin.get('is_active')}")
            print(f"   ID: {admin['_id']}")
        else:
            print("❌ Admin User NOT FOUND in 'users' collection.")

        # 2. Check Institutions
        inst_count = await database["institutions"].count_documents({})
        print("\n[INSTITUTION CHECK]")
        print(f"ℹ️ Total Institutions: {inst_count}")
        if inst_count > 0:
            sample = await database["institutions"].find_one()
            print(f"   Sample: {sample['name']} ({sample['type']})")

        # 3. Check Professors
        prof_count = await database["professors"].count_documents({})
        print("\n[PROFESSOR CHECK]")
        print(f"ℹ️ Total Professors: {prof_count}")

    except Exception as e:
        print(f"\n❌ DATABASE ERROR: {e}")
    finally:
        await close_mongo_connection()
        print("\n--- CHECK COMPLETE ---")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(verify_system())
