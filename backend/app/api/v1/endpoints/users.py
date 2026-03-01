from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import ProfessorRequest, ProfessorRequestCreate, Institution
from bson import ObjectId

router = APIRouter()

@router.post("/request-access", response_model=ProfessorRequest, status_code=201)
async def request_access(request: ProfessorRequestCreate):
    db = await get_database()
    
    # Check if request already exists
    existing = await db.professor_requests.find_one({"email": request.email, "status": "PENDING"})
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending for this email.")
        
    # Check if user already exists
    user = await db.users.find_one({"email": request.email})
    if user:
         raise HTTPException(status_code=400, detail="User with this email already exists.")

    req_dict = request.dict()
    req_dict["status"] = "PENDING"
    from datetime import datetime, timezone
    req_dict["created_at"] = datetime.now(timezone.utc)
    
    result = await db.professor_requests.insert_one(req_dict)
    
    created = await db.professor_requests.find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/requests", response_model=List[ProfessorRequest])
async def list_requests():
    db = await get_database()
    cursor = db.professor_requests.find({"status": "PENDING"})
    requests = await cursor.to_list(length=100)
    for r in requests:
        r["_id"] = str(r["_id"])
    return requests

# Admin endpoint to approve (Mock implementation for now, or real via admin panel)
@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str):
    db = await get_database()
    try:
        oid = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    req = await db.professor_requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req["status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is {req['status']}")
        
    # Handle new institution creation if requested
    institution_id = req.get("institution_id")
    if req.get("new_institution_name"):
        new_inst = {
            "name": req["new_institution_name"],
            "type": "College", # Defaulting to College as per focus
            "location": f"{req.get('city', '')}, {req.get('state', '')}".strip(", "),
            "state": req.get("state"),
            "city": req.get("city"),
            "domains": [],
            "subscription_status": "Active",
            "joined_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        }
        inst_result = await db.institutions.insert_one(new_inst)
        institution_id = str(inst_result.inserted_id)

    # Create User
    from app.core.security import get_password_hash
    # Generate random temp password or handle via email (mocking simple hash here)
    # Since prompt says "Admin reviews request", we assume Admin sets it or system generates.
    # We will create user as Professor.
    
    user_dict = {
        "email": req["email"],
        "full_name": req["full_name"],
        "hashed_password": get_password_hash("professor123"), # Default logic for now
        "role": "professor",
        "institution_id": institution_id,
        "department": req.get("department", req.get("subject_expertise")), # Mapping expertise to department/subjects
        "subjects": [req["subject_expertise"]],
        "designation": req.get("designation"),
        "employee_id": req.get("employee_id"),
        "linkedin_url": req.get("linkedin_url"),
        "auth_provider": "local",
        "is_active": True
    }
    
    await db.users.insert_one(user_dict)
    await db.professor_requests.update_one({"_id": oid}, {"$set": {"status": "APPROVED"}})
    
    return {"message": "Professor approved and user created (pass: professor123)"}

@router.post("/", status_code=201)
async def create_professor(data: dict = Body(...)):
    # Direct admin creation
    db = await get_database()
    
    # Check email
    if await db.users.find_one({"email": data["email"]}):
        raise HTTPException(status_code=400, detail="User already exists")
        
    from app.core.security import get_password_hash
    user_dict = {
        "email": data["email"],
        "full_name": data["full_name"],
        "hashed_password": get_password_hash(data["password"]),
        "role": "professor",
        "institution_id": data["institution_id"],
        "department": data.get("department", ""),
        "subjects": [],
        "auth_provider": "local",
        "is_active": True
    }
    await db.users.insert_one(user_dict)
    return {"message": "Professor created"}

@router.get("/", response_model=List[dict])
async def list_users(role: str = None):
    db = await get_database()
    query = {}
    if role:
        query["role"] = role
    else:
        # If no role specified, exclude admin by default or return all. Up to you. Let's return all.
        pass
        
    cursor = db.users.find(query)
    users = await cursor.to_list(length=100)
    for u in users:
        u["_id"] = str(u["_id"])
        # Remove hashed password from response
        if "hashed_password" in u:
            del u["hashed_password"]
    return users

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    db = await get_database()
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Check if user exists
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Optional: Check for dependencies (classes, etc.)?
    # For now, just delete the user.
    
    result = await db.users.delete_one({"_id": oid})
    
    return {"message": "User deleted"}
