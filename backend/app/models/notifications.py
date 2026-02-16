from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None, **kwargs):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

class Notification(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    recipient_id: str # User ID (email or objectId string depending on implementation, prefer user_id)
    type: str # JOIN_REQUEST, STATUS_UPDATE, EXAM_SUBMISSION
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class NotificationCreate(BaseModel):
    recipient_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
