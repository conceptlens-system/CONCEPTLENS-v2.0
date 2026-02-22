import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db

async def seed_institutions():
    await connect_to_mongo()
    
    institutions = [
        {"name": "Indian Institute of Technology Bombay", "type": "University", "location": "Mumbai", "domains": ["Engineering", "Science"], "subscription_status": "Active"},
        {"name": "Indian Institute of Technology Delhi", "type": "University", "location": "New Delhi", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Indian Institute of Technology Madras", "type": "University", "location": "Chennai", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Indian Institute of Science", "type": "University", "location": "Bangalore", "domains": ["Science", "Research"], "subscription_status": "Active"},
        {"name": "Delhi University", "type": "University", "location": "New Delhi", "domains": ["Arts", "Science", "Commerce"], "subscription_status": "Active"},
        {"name": "Jawaharlal Nehru University", "type": "University", "location": "New Delhi", "domains": ["Arts", "Research"], "subscription_status": "Active"},
        {"name": "Banaras Hindu University", "type": "University", "location": "Varanasi", "domains": ["Arts", "Science"], "subscription_status": "Active"},
        {"name": "University of Mumbai", "type": "University", "location": "Mumbai", "domains": ["Arts", "Commerce"], "subscription_status": "Active"},
        {"name": "Anna University", "type": "University", "location": "Chennai", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Birla Institute of Technology and Science", "type": "University", "location": "Pilani", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Vellore Institute of Technology", "type": "University", "location": "Vellore", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Manipal Academy of Higher Education", "type": "University", "location": "Manipal", "domains": ["Medical", "Engineering"], "subscription_status": "Active"},
        {"name": "Amity University", "type": "University", "location": "Noida", "domains": ["Various"], "subscription_status": "Active"},
        {"name": "Gujarat Technological University", "type": "University", "location": "Ahmedabad", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Savitribai Phule Pune University", "type": "University", "location": "Pune", "domains": ["Various"], "subscription_status": "Active"},
        {"name": "Osmania University", "type": "University", "location": "Hyderabad", "domains": ["Various"], "subscription_status": "Active"},
        {"name": "Aligarh Muslim University", "type": "University", "location": "Aligarh", "domains": ["Various"], "subscription_status": "Active"},
        {"name": "Jamia Millia Islamia", "type": "University", "location": "New Delhi", "domains": ["Various"], "subscription_status": "Active"},
        {"name": "Visvesvaraya Technological University", "type": "University", "location": "Belgaum", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Thapar Institute of Engineering and Technology", "type": "University", "location": "Patiala", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "SRM Institute of Science and Technology", "type": "University", "location": "Chennai", "domains": ["Engineering"], "subscription_status": "Active"},
        {"name": "Indian Institute of Management Ahmedabad", "type": "University", "location": "Ahmedabad", "domains": ["Management"], "subscription_status": "Active"},
        {"name": "Indian Institute of Management Bangalore", "type": "University", "location": "Bangalore", "domains": ["Management"], "subscription_status": "Active"},
        {"name": "Indian Institute of Management Calcutta", "type": "University", "location": "Kolkata", "domains": ["Management"], "subscription_status": "Active"},
        {"name": "Kendriya Vidyalaya Sangathan", "type": "School", "location": "New Delhi", "domains": ["School"], "subscription_status": "Active"},
        {"name": "Delhi Public School", "type": "School", "location": "Various", "domains": ["School"], "subscription_status": "Active"},
    ]
    
    database = db.client["conceptlens"]
    print(f"Seeding {len(institutions)} institutions...")
    
    # Optional: Clear existing if you want a fresh start
    # await database["institutions"].delete_many({})

    for inst in institutions:
        existing = await database["institutions"].find_one({"name": inst["name"]})
        if not existing:
            await database["institutions"].insert_one(inst)
            print(f"Added: {inst['name']}")
        else:
            print(f"Skipped (Exists): {inst['name']}")

    await close_mongo_connection()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(seed_institutions())
