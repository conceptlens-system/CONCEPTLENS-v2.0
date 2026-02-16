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
    if action not in ["approve", "reject", "rename"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Update Status
    new_status = "valid" if action == "approve" else "rejected"
    if action == "rename":
        new_status = "valid" # Assume rename implies approval
        
    update_data = {"status": new_status, "last_updated": datetime.now(timezone.utc)}
    if action == "rename" and "new_label" in payload:
        update_data["cluster_label"] = payload["new_label"]
        
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
    
    return {"status": "success", "new_state": new_status}
