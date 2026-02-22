from fastapi import APIRouter, HTTPException, Body
from app.db.mongodb import get_database
from app.models.schemas import TeacherValidation
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter()

@router.post("/misconceptions/{id}/validate")
async def validate_misconception(id: str, payload: dict = Body(...)):
    # payload: { "action": "approve" | "reject" | "rename", "new_label": ... }
    db = await get_database()
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    action = payload.get("action")
    allowed_actions = ["approve", "reject", "rename", "prioritize", "deprioritize"]
    if action not in allowed_actions:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    update_data = {"last_updated": datetime.now(timezone.utc)}

    # Handle Status Changes
    if action == "approve":
        update_data["status"] = "valid"
    elif action == "reject":
        update_data["status"] = "rejected"
    elif action == "rename":
        update_data["status"] = "valid" # Assume rename implies approval
        if "new_label" in payload:
            update_data["cluster_label"] = payload["new_label"]
            
    # Handle Priority Toggle
    elif action == "prioritize":
        update_data["is_priority"] = True
    elif action == "deprioritize":
        update_data["is_priority"] = False
        
    result = await db.misconceptions.update_one({"_id": obj_id}, {"$set": update_data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Misconception not found")
        
    # Log Validation
    # In real app, get teacher_id from auth token
    await db.teacher_validations.insert_one({
        "misconception_id": str(obj_id),
        "teacher_id": "mock_teacher_1",
        "action": action,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Return new state
    return {
        "status": "success", 
        "action": action,
        "updates": update_data
    }
