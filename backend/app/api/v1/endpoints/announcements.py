from fastapi import APIRouter, Depends, HTTPException, Body
from app.db.mongodb import get_database
from app.core.security import get_current_user
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    type: str = Field(..., description="Must be 'info', 'warning', or 'critical'")
    active: bool = True

class AnnouncementOut(AnnouncementCreate):
    _id: str
    created_at: datetime
    created_by: str

@router.post("/", response_model=dict)
async def create_announcement(
    announcement_in: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new global announcement (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    new_announcement = {
        "title": announcement_in.title,
        "message": announcement_in.message,
        "type": announcement_in.type,
        "active": announcement_in.active,
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("email")
    }
    
    await db["announcements"].insert_one(new_announcement)
    
    # Also log this action
    await db["audit_logs"].insert_one({
        "action": "CREATE_ANNOUNCEMENT",
        "actor": current_user.get("email"),
        "resource": "announcements",
        "details": f"Created announcement: {announcement_in.title}",
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Announcement created successfully"}

@router.get("/", response_model=List[dict])
async def read_announcements(
    active_only: bool = False
):
    """
    Get all announcements. Anyone can read active announcements.
    """
    db = await get_database()
    
    query = {"active": True} if active_only else {}
    announcements = await db["announcements"].find(query).sort("created_at", -1).to_list(100)
    
    for ann in announcements:
        ann["_id"] = str(ann["_id"])
        
    return announcements

@router.patch("/{id}/toggle", response_model=dict)
async def toggle_announcement(
    id: str,
    active: bool = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
):
    """
    Toggle announcement active status (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    result = await db["announcements"].update_one(
        {"_id": ObjectId(id)},
        {"$set": {"active": active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    # Log this action
    await db["audit_logs"].insert_one({
        "action": "TOGGLE_ANNOUNCEMENT",
        "actor": current_user.get("email"),
        "resource": f"announcement:{id}",
        "details": f"Toggled active state to {active}",
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Status updated successfully"}

@router.delete("/{id}", response_model=dict)
async def delete_announcement(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete an announcement (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    result = await db["announcements"].delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    # Log this action
    await db["audit_logs"].insert_one({
        "action": "DELETE_ANNOUNCEMENT",
        "actor": current_user.get("email"),
        "resource": f"announcement:{id}",
        "details": "Deleted announcement",
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Announcement deleted successfully"}
