from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import Class, ClassCreate, ClassJoinRequest, Announcement, AnnouncementCreate
from app.models.notifications import Notification
from app.core.security import get_current_user
from bson import ObjectId
import secrets
import string
from datetime import datetime, timezone

router = APIRouter()

def generate_class_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

@router.post("/", response_model=Class)
async def create_class(class_in: ClassCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "professor":
        raise HTTPException(status_code=403, detail="Only professors can create classes")
        
    db = await get_database()
    
    # Generate Unique Code
    code = generate_class_code()
    # Ensure uniqueness (simple check)
    while await db.classes.find_one({"class_code": code}):
        code = generate_class_code()
        
    class_dict = {
        "name": class_in.name,
        "subject_id": class_in.subject_id,
        "institution_id": current_user.get("institution_id"),
        "professor_id": str(current_user["_id"]),
        "class_code": code,
        "created_at": datetime.now(timezone.utc)
    }

    res = await db.classes.insert_one(class_dict)
    created = await db.classes.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/", response_model=List[Class])
async def list_classes(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if current_user["role"] == "professor":
        cursor = db.classes.find({"professor_id": str(current_user["_id"])})
    elif current_user["role"] == "student":
        # Find classes where student is enrolled
        # We need a 'class_students' collection map as per prompt
        enrollments = await db.class_students.find({"student_id": current_user["email"]}).to_list(100)
        class_ids = [ObjectId(e["class_id"]) for e in enrollments]
        cursor = db.classes.find({"_id": {"$in": class_ids}})
    else:
        return []
        
    classes = await cursor.to_list(100)
    result = []
    for c in classes:
        try:
            c["_id"] = str(c["_id"])
            result.append(c)
        except Exception as e:
            print(f"Error processing class: {e}")
            continue
    return result

@router.post("/join")
async def join_class(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can join classes")
        
    code = payload.get("class_code")
    if not code:
        raise HTTPException(status_code=400, detail="Class code required")
        
    db = await get_database()
    class_obj = await db.classes.find_one({"class_code": code})
    
    if not class_obj:
        raise HTTPException(status_code=404, detail="Invalid Class Code")
        
    # Check if already joined
    is_joined = await db.class_students.find_one({
        "class_id": str(class_obj["_id"]),
        "student_id": current_user["email"]
    })
    if is_joined:
        return {"message": "Already enrolled in this class"}

    # Check for pending request
    is_pending = await db.class_join_requests.find_one({
        "class_id": str(class_obj["_id"]),
        "student_id": current_user["email"]
    })
    if is_pending:
        return {"message": "Request to join is already pending"}

    # Create Request
    req = {
        "student_id": current_user["email"],
        "student_user_id": str(current_user["_id"]),
        "student_name": current_user.get("full_name", current_user.get("name", "Student")),
        "class_id": str(class_obj["_id"]),
        "status": "PENDING",
        "requested_at": datetime.now(timezone.utc)
    }
    await db.class_join_requests.insert_one(req)
    
    # Notify Professor
    # professor_id is in class_obj
    prof_id = class_obj["professor_id"]
    await db.notifications.insert_one({
        "recipient_id": prof_id,
        "type": "JOIN_REQUEST",
        "title": "New Class Join Request",
        "message": f"{current_user.get('full_name', 'A student')} requested to join {class_obj['name']}",
        "link": f"/professor/classes/{str(class_obj['_id'])}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Join request sent. Waiting for professor approval."}

@router.get("/{class_id}/requests", response_model=List[ClassJoinRequest])
async def list_requests(class_id: str, current_user: dict = Depends(get_current_user)):
    # Verify ownership
    db = await get_database()
    c = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not c or c["professor_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
        
    cursor = db.class_join_requests.find({"class_id": class_id, "status": "PENDING"})
    reqs = await cursor.to_list(100)
    for r in reqs:
        r["_id"] = str(r["_id"])
    return reqs

@router.post("/{class_id}/requests/{request_id}/approve")
async def approve_join(class_id: str, request_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    # Verify ownership logic
    c = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not c or c["professor_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
        
    req = await db.class_join_requests.find_one({"_id": ObjectId(request_id)})
    if not req: 
        raise HTTPException(404, "Request not found")
        
    # Add to class_students
    await db.class_students.insert_one({
        "class_id": class_id,
        "student_id": req["student_id"],
        "joined_at": datetime.now(timezone.utc)
    })
    
    # Update request status
    await db.class_join_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "APPROVED"}}
    )
    
    # Notify Student
    # req has student_user_id
    if req.get("student_user_id"):
        await db.notifications.insert_one({
            "recipient_id": req["student_user_id"],
            "type": "STATUS_UPDATE",
            "title": "Class Request Approved",
            "message": f"Your request to join {c['name']} has been approved.",
            "link": f"/student/classes/{class_id}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"message": "Student approved"}

@router.post("/{class_id}/requests/{request_id}/reject")
async def reject_join(class_id: str, request_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    # Verify ownership logic
    c = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not c or c["professor_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
        
    req = await db.class_join_requests.find_one({"_id": ObjectId(request_id)})
    if not req: 
        raise HTTPException(404, "Request not found")

    # Update request status
    await db.class_join_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "REJECTED"}}
    )

    # Notify Student
    if req.get("student_user_id"):
        await db.notifications.insert_one({
            "recipient_id": req["student_user_id"],
            "type": "STATUS_UPDATE",
            "title": "Class Request Rejected",
            "message": f"Your request to join {c['name']} has been rejected.",
            "link": "#", 
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
    return {"message": "Student rejected"}

@router.get("/{class_id}", response_model=Class)
async def get_class(class_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(class_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    c = await db.classes.find_one({"_id": obj_id})
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Access Control: Professor (Owner) or Student (Enrolled)
    # Simplified for now: allow if professor owner OR if student part of class
    has_access = False
    if str(c["professor_id"]) == str(current_user["_id"]):
        has_access = True
    elif current_user["role"] == "student":
        is_enrolled = await db.class_students.find_one({"class_id": class_id, "student_id": current_user["email"]})
        if is_enrolled:
            has_access = True
            
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    c["_id"] = str(c["_id"])
    return c

@router.get("/{class_id}/students")
async def get_class_students(class_id: str, current_user: dict = Depends(get_current_user)):
    # Return list of students (with details) pending/approved
    db = await get_database()
    c = await db.classes.find_one({"_id": ObjectId(class_id)})
    
    # Only Professor should see full list usually, or maybe students see classmates? 
    # Prompt implies Professor Panel context.
    if str(c["professor_id"]) != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")
         
    # Get approved students
    enrollments = await db.class_students.find({"class_id": class_id}).to_list(1000)
    student_emails = [e["student_id"] for e in enrollments]
    
    # Fetch details from users collection
    students = await db.users.find({"email": {"$in": student_emails}}).to_list(1000)
    
    # Clean up
    results = []
    for s in students:
        results.append({
            "id": str(s["_id"]),
            "full_name": s.get("full_name", "Unknown"),
            "email": s["email"],
            "role": s.get("role", "student")
        })
        
    return results

@router.delete("/{class_id}/students/{student_id}")
async def remove_student(class_id: str, student_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        c_oid = ObjectId(class_id)
        s_oid = ObjectId(student_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify Class Ownership
    c = await db.classes.find_one({"_id": c_oid})
    if not c:
        raise HTTPException(404, "Class not found")
        
    if str(c["professor_id"]) != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Find Student to get email
    student_user = await db.users.find_one({"_id": s_oid})
    if not student_user:
        raise HTTPException(404, "Student not found")
        
    student_email = student_user["email"]
    
    # Remove from class_students
    # Note: student_id in class_students implies email based on join logic
    result = await db.class_students.delete_one({
        "class_id": class_id,
        "student_id": student_email
    })
    
    if result.deleted_count == 0:
        # Check if maybe they were added by ID? (Legacy check, but schema says email)
        # Just return success if already gone? Or 404. 
        # Better to return 404 to be specific.
        raise HTTPException(404, "Student not found in this class")

    return {"message": "Student removed successfully"}

@router.delete("/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(class_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    c = await db.classes.find_one({"_id": obj_id})
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
        
    if str(c["professor_id"]) != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Delete Class
    await db.classes.delete_one({"_id": obj_id})
    
    # Cleanup related data (students, requests)
    await db.class_students.delete_many({"class_id": class_id})
    await db.class_join_requests.delete_many({"class_id": class_id})
    
    return {"message": "Class deleted successfully"}

# --- Announcements ---

@router.post("/{class_id}/announcements", response_model=Announcement)
async def create_announcement(class_id: str, announcement: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(class_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership (Professor only)
    c = await db.classes.find_one({"_id": obj_id})
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")

    if str(c["professor_id"]) != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Create Announcement
    new_announcement = {
        "class_id": class_id,
        "professor_id": str(current_user["_id"]),
        "title": announcement.title,
        "content": announcement.content,
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.announcements.insert_one(new_announcement)
    created = await db.announcements.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])

    # Notify Students
    # 1. Get all students in class
    enrollments = await db.class_students.find({"class_id": class_id}).to_list(1000)
    student_emails = [e["student_id"] for e in enrollments]
    
    # We need user_ids ideally, but if not available we rely on email mapping if notifications support it.
    # Notifications schema uses `recipient_id`.
    # Let's find user IDs for these emails to be safe, or just use email if system supports it.
    # Backend `notifications.py` uses `find({"recipient_id": {"$in": user_identifiers}})` where identifiers include email.
    # So using email as recipient_id should work for our simple system.
    
    notifications = []
    for email in student_emails:
        notif = {
            "recipient_id": email,
            "type": "ANNOUNCEMENT",
            "title": f"Announcement: {c['name']}",
            "message": f"{announcement.title}",
            "link": f"/student/classes/{class_id}", # Or announcements tab
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        notifications.append(notif)
        
    if notifications:
        await db.notifications.insert_many(notifications)

    return created

@router.get("/{class_id}/announcements", response_model=List[Announcement])
async def list_announcements(class_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # Access: Member or Professor
    c = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not c:
         raise HTTPException(404, "Class not found")
         
    has_access = False
    if str(c["professor_id"]) == str(current_user["_id"]):
        has_access = True
    else:
        # Check enrollment
        is_enrolled = await db.class_students.find_one({"class_id": class_id, "student_id": current_user["email"]})
        if is_enrolled:
            has_access = True
            
    if not has_access:
        raise HTTPException(403, "Access denied")

    cursor = db.announcements.find({"class_id": class_id}).sort("created_at", -1)
    announcements = await cursor.to_list(100)
    for a in announcements:
        a["_id"] = str(a["_id"])
        
    return announcements
