from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.db.mongodb import get_database
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

@router.get("/global", response_model=List[Dict[str, Any]])
async def get_global_leaderboard(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Fetch the top students globally across the platform based on points."""
    try:
        db = await get_database()
        
        # We only want to rank students
        pipeline = [
            {"$match": {"role": "student"}},
            {"$sort": {"points": -1}},
            {"$limit": limit},
            {"$project": {
                "_id": {"$toString": "$_id"},
                "full_name": 1,
                "points": {"$ifNull": ["$points", 0]}
            }}
        ]
        
        top_students = await db["users"].aggregate(pipeline).to_list(limit)
        return top_students

    except Exception as e:
        print(f"Error fetching global leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")


@router.get("/class/{class_id}", response_model=List[Dict[str, Any]])
async def get_class_leaderboard(
    class_id: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Fetch the top students specifically enrolled in a given class."""
    try:
        db = await get_database()
        
        # First verify the class exists
        class_doc = await db["classes"].find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
            
        student_ids = class_doc.get("students", [])
        if not student_ids:
            return []
            
        # Convert string IDs back to ObjectId for querying
        object_ids = [ObjectId(si) if isinstance(si, str) else si for si in student_ids]

        pipeline = [
            {"$match": {
                "_id": {"$in": object_ids},
                "role": "student"
            }},
            {"$sort": {"points": -1}},
            {"$limit": limit},
            {"$project": {
                "_id": {"$toString": "$_id"},
                "full_name": 1,
                "points": {"$ifNull": ["$points", 0]}
            }}
        ]
        
        class_top_students = await db["users"].aggregate(pipeline).to_list(limit)
        return class_top_students

    except Exception as e:
        print(f"Error fetching class leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")
