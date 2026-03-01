from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from app.db.mongodb import get_database
from app.core.security import get_current_user
from typing import List, Dict, Any
from datetime import datetime
import json
import io

router = APIRouter()

async def get_security_config(db) -> Dict[str, Any]:
    config_doc = await db["system_settings"].find_one({"_id": "security"})
    if not config_doc:
        default_config = {
            "_id": "security",
            "rate_limit_requests": 100,
            "rate_limit_window_minutes": 15,
            "banned_ips": [],
            "maintenance_mode": False,
            "updated_at": datetime.utcnow()
        }
        await db["system_settings"].insert_one(default_config)
        return default_config
    return config_doc

@router.get("/security")
async def fetch_security_config(current_user: dict = Depends(get_current_user)):
    """Fetch global security configurations (rate limits, IPs)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    return await get_security_config(db)

@router.put("/security")
async def update_security_config(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    """Update global security configurations"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    # Simple validation
    update_data = {}
    if "rate_limit_requests" in payload:
        update_data["rate_limit_requests"] = int(payload["rate_limit_requests"])
    if "rate_limit_window_minutes" in payload:
        update_data["rate_limit_window_minutes"] = int(payload["rate_limit_window_minutes"])
    if "banned_ips" in payload and isinstance(payload["banned_ips"], list):
        update_data["banned_ips"] = payload["banned_ips"]
    if "maintenance_mode" in payload:
        update_data["maintenance_mode"] = bool(payload["maintenance_mode"])
        
    update_data["updated_at"] = datetime.utcnow()
        
    await db["system_settings"].update_one(
        {"_id": "security"},
        {"$set": update_data},
        upsert=True
    )
    
    # Log the update
    try:
        user_id = current_user.get("_id") or current_user.get("id")
        await db["audit_logs"].insert_one({
            "timestamp": datetime.utcnow(),
            "actor_id": user_id,
            "actor_email": current_user.get("email"),
            "action": "UPDATE_SECURITY_CONFIG",
            "resource": "system_settings",
            "details": f"Updated settings: {list(update_data.keys())}"
        })
    except Exception as e:
        print(f"Audit log failed: {e}")

    return {"message": "Security configuration updated successfully"}

@router.get("/backup")
async def trigger_database_backup(current_user: dict = Depends(get_current_user)):
    """
    Generate a JSON snapshot of critical collections (Users, Institutions, Exams)
    and return it as a downloadable file. Keep it lightweight.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    # Fetch data
    users_cursor = db["users"].find({}, {"password_hash": 0}) # Exclude passwords for safety
    institutions_cursor = db["institutions"].find()
    exams_cursor = db["exams"].find()
    
    snapshot = {
        "metadata": {
            "version": "1.0",
            "generated_at": datetime.utcnow().isoformat(),
            "trigger_user": current_user.get("email"),
        },
        "collections": {
            "users": [doc async for doc in users_cursor],
            "institutions": [doc async for doc in institutions_cursor],
            "exams": [doc async for doc in exams_cursor],
        }
    }
    
    # Need to convert ObjectIds and Datetimes recursively for JSON serialization
    def serialize_mongo_types(obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        if hasattr(obj, '__class__') and obj.__class__.__name__ == 'ObjectId':
            return str(obj)
        if isinstance(obj, dict):
            return {k: serialize_mongo_types(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [serialize_mongo_types(i) for i in obj]
        return obj

    sanitized_snapshot = serialize_mongo_types(snapshot)
    
    # Create an in-memory JSON file
    json_bytes = json.dumps(sanitized_snapshot, indent=2).encode('utf-8')
    stream = io.BytesIO(json_bytes)
    
    # Audit log the backup
    try:
        user_id = current_user.get("_id") or current_user.get("id")
        await db["audit_logs"].insert_one({
            "timestamp": datetime.utcnow(),
            "actor_id": user_id,
            "actor_email": current_user.get("email"),
            "action": "TRIGGER_BACKUP",
            "resource": "database",
            "details": f"Generated JSON snapshot of core collections"
        })
    except Exception as e:
        print(f"Audit log failed: {e}")

    # Return as a streaming response for download
    filename = f"conceptlens_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(
        stream,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
