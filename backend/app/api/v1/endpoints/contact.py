from fastapi import APIRouter, Depends, HTTPException, Body
from app.db.mongodb import get_database
from app.core.security import get_current_user
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter()

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    user_id: Optional[str] = None

class ContactMessageOut(ContactMessageCreate):
    _id: str
    created_at: datetime

@router.post("/", response_model=dict)
async def create_contact_message(
    message_in: ContactMessageCreate
):
    """
    Submit a contact message.
    """
    db = await get_database()
    
    new_message = {
        "name": message_in.name,
        "email": message_in.email,
        "message": message_in.message,
        "user_id": message_in.user_id,
        "created_at": datetime.utcnow(),
        "status": "new",
        "seen_at": None
    }
    
    await db["contact_messages"].insert_one(new_message)
    
    return {"message": "Message received successfully"}

@router.get("/", response_model=List[dict])
async def read_contact_messages(
    current_user: dict = Depends(get_current_user),
):
    """
    Get all contact messages (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    # Auto-delete messages seen more than 7 days ago
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    await db["contact_messages"].delete_many({
        "status": "seen",
        "seen_at": {"$lt": seven_days_ago}
    })
    
    messages = await db["contact_messages"].find().sort("created_at", -1).to_list(100)
    
    # Convert _id to string
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        
    return messages

@router.patch("/{id}/seen", response_model=dict)
async def mark_message_seen(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a contact message as seen (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    result = await db["contact_messages"].update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "seen", "seen_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
        
    return {"message": "Message marked as seen"}

@router.delete("/{id}", response_model=dict)
async def delete_contact_message(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a contact message (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    result = await db["contact_messages"].delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
        
    return {"message": "Message deleted successfully"}
