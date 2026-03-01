from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.db.mongodb import get_database
from app.core.security import get_current_user
from datetime import datetime

router = APIRouter()

class GlobalSettings(BaseModel):
    ai_features_enabled: bool = True
    maintenance_mode: bool = False
    max_upload_size_mb: int = 10
    system_notification: str = ""

@router.get("/", response_model=Dict[str, Any])
async def get_settings(current_user: dict = Depends(get_current_user)):
    """
    Get global platform settings. Only Admin can view full config,
    but we might expose a public version later. For now, admin only.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    settings = await db["global_settings"].find_one({"_id": "global_config"})
    
    if not settings:
        # Default settings if none exist
        settings = GlobalSettings().dict()
        settings["_id"] = "global_config"
        settings["updated_at"] = datetime.utcnow()
        await db["global_settings"].insert_one(settings)
        
    return settings

@router.put("/", response_model=Dict[str, Any])
async def update_settings(
    settings_in: GlobalSettings,
    current_user: dict = Depends(get_current_user)
):
    """
    Update global platform settings. Admin only.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    update_data = settings_in.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db["global_settings"].update_one(
        {"_id": "global_config"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully", "data": update_data}
