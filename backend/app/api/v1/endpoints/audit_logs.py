from fastapi import APIRouter, Depends, HTTPException
from app.db.mongodb import get_database
from app.core.security import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[dict])
async def read_audit_logs(
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a stream of recent system activities (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    # Fetch logs sorted by newest first
    logs = await db["audit_logs"].find().sort("timestamp", -1).limit(limit).to_list(limit)
    
    for log in logs:
        log["_id"] = str(log["_id"])
        
    return logs
