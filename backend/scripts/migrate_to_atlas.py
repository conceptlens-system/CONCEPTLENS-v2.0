import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from tqdm import tqdm

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

# Configuration
LOCAL_MONGO_URL = "mongodb://localhost:27017"
ATLAS_MONGO_URL = settings.MONGODB_URL
DB_NAME = settings.DATABASE_NAME

async def migrate():
    print("--- STARTING MIGRATION ---")
    print(f"Source:      {LOCAL_MONGO_URL}")
    print(f"Destination: {ATLAS_MONGO_URL.split('@')[-1]}") # Hide credentials
    print(f"Database:    {DB_NAME}")
    
    # Connect to clients
    local_client = AsyncIOMotorClient(LOCAL_MONGO_URL)
    atlas_client = AsyncIOMotorClient(ATLAS_MONGO_URL)
    
    local_db = local_client[DB_NAME]
    atlas_db = atlas_client[DB_NAME]
    
    try:
        # Get all collection names
        collections = await local_db.list_collection_names()
        print(f"\nFound {len(collections)} collections to migrate: {collections}")
        
        for col_name in collections:
            print(f"\nMigrating collection: {col_name}...")
            
            # Get documents from source
            cursor = local_db[col_name].find({})
            documents = await cursor.to_list(length=None)
            
            if not documents:
                print(f"   Skipping {col_name} (0 documents)")
                continue
            
            print(f"   Found {len(documents)} documents.")
            
            # Insert into destination
            # Use ordered=False to continue if some documents already exist (duplicates)
            try:
                result = await atlas_db[col_name].insert_many(documents, ordered=False)
                print(f"   ✅ Successfully migrated {len(result.inserted_ids)} documents.")
            except Exception as e:
                # Handle BulkWriteError for duplicates
                if "E11000 duplicate key error" in str(e):
                    print(f"   ⚠️  Some documents already existed (skipped duplicates).")
                else:
                    print(f"   ❌ Error migrating {col_name}: {e}")
                    
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
    finally:
        local_client.close()
        atlas_client.close()
        print("\n--- MIGRATION COMPLETE ---")

if __name__ == "__main__":
    # check if tqdm is installed, if not just run without it logic (but code above uses print)
    # The print statements above are sufficient.
    asyncio.run(migrate())
