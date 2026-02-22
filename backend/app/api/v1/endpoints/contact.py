from fastapi import APIRouter, Depends, HTTPException, Body
from app.db.mongodb import get_database
from app.core.security import get_current_user
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

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
    message_data = message_in.dict()
    message_data["created_at"] = datetime.utcnow()
    
    db = await get_database()
    await db["contact_messages"].insert_one(message_data)
    
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
    messages = await db["contact_messages"].find().sort("created_at", -1).to_list(100)
    
    # Convert _id to string
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        
    return messages
