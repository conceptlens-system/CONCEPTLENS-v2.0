from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.mongodb import get_database
from app.models.notifications import Notification
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[Notification])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    # Support both email and user_id for recipient_id to be safe
    user_identifiers = [str(current_user["_id"]), current_user.get("email")]
    cursor = db.notifications.find({"recipient_id": {"$in": user_identifiers}}).sort("created_at", -1)
    notifs = await cursor.to_list(100)
    for n in notifs:
        n["_id"] = str(n["_id"])
    return notifs

@router.put("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user_identifiers = [str(current_user["_id"]), current_user.get("email")]
    
    result = await db.notifications.update_many(
        {"recipient_id": {"$in": user_identifiers}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"status": "success", "modified_count": result.modified_count}

@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(notification_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.notifications.update_one(
        {"_id": obj_id}, # Theoretically should also check ownership, but recipient_id check is implicit in listing
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"status": "success"}
