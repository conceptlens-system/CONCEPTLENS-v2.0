from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List
from app.db.mongodb import get_database
from app.models.exams import Subject, SubjectCreate
from bson import ObjectId
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Subject])
async def list_subjects(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    # Filter by professor_id
    user_id = str(current_user["_id"])
    cursor = db.subjects.find({"professor_id": user_id})
    subjects = await cursor.to_list(length=100)
    for s in subjects:
        s["_id"] = str(s["_id"])
    return subjects

@router.post("/", response_model=Subject)
async def create_subject(subject: SubjectCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user_id = str(current_user["_id"])
    
    # Check if exists for THIS professor
    existing = await db.subjects.find_one({"name": subject.name, "professor_id": user_id})
    if existing:
         raise HTTPException(status_code=400, detail="Subject already exists")

    new_subject = subject.dict()
    new_subject["professor_id"] = user_id
    result = await db.subjects.insert_one(new_subject)
    
    created_subject = await db.subjects.find_one({"_id": result.inserted_id})
    created_subject["_id"] = str(created_subject["_id"])
    
    return created_subject

@router.put("/{subject_id}/syllabus", response_model=Subject)
async def update_syllabus(subject_id: str, syllabus: List[dict] = Body(...), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user_id = str(current_user["_id"])
    
    try:
        obj_id = ObjectId(subject_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Ensure ownership
    result = await db.subjects.update_one(
        {"_id": obj_id, "professor_id": user_id},
        {"$set": {"syllabus": syllabus}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found or access denied")
        
    updated = await db.subjects.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    return updated

@router.patch("/{subject_id}", response_model=Subject)
async def update_subject_metadata(subject_id: str, updates: dict = Body(...), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user_id = str(current_user["_id"])
    
    try:
        obj_id = ObjectId(subject_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Allowed fields to update
    allowed_fields = {"name", "semester", "branches", "sections"}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await db.subjects.update_one(
        {"_id": obj_id, "professor_id": user_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found or access denied")
        
    updated = await db.subjects.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    return updated

@router.delete("/{subject_id}", response_model=dict)
async def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user_id = str(current_user["_id"])
    try:
        obj_id = ObjectId(subject_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.subjects.delete_one({"_id": obj_id, "professor_id": user_id})
    if result.deleted_count == 0:
         raise HTTPException(status_code=404, detail="Subject not found or access denied")
         
    return {"message": "Subject deleted successfully"}
