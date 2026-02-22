from fastapi import APIRouter, HTTPException, status, Depends, Body
from app.models.schemas import UserCreate, UserLogin, User, Token, ChangePasswordRequest
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.db.mongodb import get_database
from fastapi.responses import JSONResponse
from bson import ObjectId

router = APIRouter()

@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db = Depends(get_database)):
    # Check if user exists
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    
    # Enforce Student Role & Local Auth
    user_dict["role"] = "student"
    user_dict["auth_provider"] = "local"
    user_dict["institution_id"] = None # Students join via codes later
    
    # Insert
    new_user = await db["users"].insert_one(user_dict)
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    return created_user

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db = Depends(get_database)):
    user = await db["users"].find_one({"email": user_in.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Check if user uses Google Auth
    if user.get("auth_provider") == "google":
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use Google Sign-In for this account"
        )

    if not verify_password(user_in.password, user.get("hashed_password")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(
        subject=str(user["_id"]),
        role=user.get("role", "teacher"),
        name=user.get("full_name", "User")
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.get("role", "teacher"),
        "name": user.get("full_name", user.get("email"))
    }

@router.post("/google", response_model=Token)
async def google_login(payload: dict = Body(...), db = Depends(get_database)):
    email = payload.get("email")
    name = payload.get("name")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid payload")

    user = await db["users"].find_one({"email": email})
    
    if not user:
        # Create new Professor user for Google Login
        user_dict = {
            "email": email,
            "full_name": name,
            "role": "professor", # Default to professor for Google Sign-In
            "auth_provider": "google",
            "is_active": True,
            "institution_id": None # Can be updated later
        }
        result = await db["users"].insert_one(user_dict)
        user_id = str(result.inserted_id)
        role = "professor"
    else:
        user_id = str(user["_id"])
        role = user.get("role", "professor")
        
        # Link Google if not already linked (optional, but good for UX)
        if user.get("auth_provider") != "google":
             await db["users"].update_one({"_id": user["_id"]}, {"$set": {"auth_provider": "google"}})

    access_token = create_access_token(
        subject=user_id,
        role=role,
        name=name or email
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "name": name or email
    }

@router.post("/forgot-password")
async def forgot_password(payload: dict = Body(...), db = Depends(get_database)):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
        
    user = await db["users"].find_one({"email": email})
    # Security: Always return success even if email not found
    if not user:
        return {"message": "If account exists, reset instructions sent."}
        
    # Generate Token
    import secrets
    from datetime import datetime, timedelta, timezone
    
    token = secrets.token_urlsafe(32)
    token_hash = get_password_hash(token)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token_hash": token_hash, "reset_token_expiry": expires}}
    )
    
    # MOCK EMAIL SERVICE
    print(f"\n[MOCK EMAIL] To: {email}")
    print(f"[MOCK EMAIL] Reset Link: http://localhost:3000/reset-password?token={token}\n")
    
    return {"message": "If account exists, reset instructions sent."}

@router.post("/reset-password")
async def reset_password(payload: dict = Body(...), db = Depends(get_database)):
    token = payload.get("token")
    new_password = payload.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Missing data")
        
    # In a real app, we'd query by hash, but since we use bcrypt which is slow and salted, 
    # we can't search directly. We have to iterate or (better) store a lookup key.
    # For this strict requirement without changing schema too much, let's try a different approach:
    # We really should have stored a plain lookup token or used a different hashing mechanism for lookup.
    # BUT, to stick to "bcrypt", we have to scan users with unexpired tokens? No, that's bad.
    # Correction: For "ForgotPassword", typically you send a signed JWT or a random string. 
    # If we store hash, user must provide email? No, the link has the token.
    # OK, for production performance, we'll assume the URL also has the EMAIL, 
    # OR we just store the token plainly? No, user said "Store hashed token".
    # Solution: We need to find the user.
    # Let's iterate users who have a reset_token_expiry > now.
    
    from datetime import datetime, timezone
    potential_users = await db["users"].find({
        "reset_token_expiry": {"$gt": datetime.now(timezone.utc)}
    }).to_list(1000)
    
    target_user = None
    for u in potential_users:
        if u.get("reset_token_hash") and verify_password(token, u["reset_token_hash"]):
            target_user = u
            break
            
    if not target_user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    # Reset Password
    new_hash = get_password_hash(new_password)
    await db["users"].update_one(
        {"_id": target_user["_id"]},
        {"$set": {
            "hashed_password": new_hash, 
            "reset_token_hash": None, 
            "reset_token_expiry": None
        }}
    )
    
    return {"message": "Password updated successfully"}

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest, 
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_database)
):
    user_id = current_user["_id"]
    
    # 1. Verify Current Password
    # current_user has "hashed_password" because get_current_user returns full doc (usually)
    # But wait, looking at security.py usually it might not. 
    # Let's double check if we need to fetch user again or if current_user has it.
    # In step 18, `read_users_me` says "current_user is the full user document from security.py". 
    # However, for safety, let's fetch the fresh user doc including password hash to be sure.
    user = await db["users"].find_one({"_id": user_id})
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    # 2. Update to New Password
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    new_hash = get_password_hash(payload.new_password)
    
    await db["users"].update_one(
        {"_id": user_id},
        {"$set": {"hashed_password": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

# --- Profile Management ---



@router.get("/profile/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    # current_user is the full user document from security.py
    user = current_user
    user["_id"] = str(user["_id"])
    return user

@router.put("/profile", response_model=User)
async def update_user_profile(
    profile_data: dict = Body(...), 
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_database)
):
    user_id = current_user["_id"]
    
    # Filter allowed fields
    allowed = ["full_name", "bio", "phone", "skills", "research_interests", "office_hours", "linkedin_url", "academic_history", "institution_id", "contact_number", "department", "branch", "institute_name"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db["users"].update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db["users"].find_one({"_id": user_id})
    updated["_id"] = str(updated["_id"])
    return updated

@router.get("/profile/{user_id}", response_model=User)
async def read_user_profile(user_id: str, db = Depends(get_database)):
    if ObjectId.is_valid(user_id):
        query = {"_id": ObjectId(user_id)}
    else:
        # Fallback: Try Lookup by Email (for legacy requests)
        query = {"email": user_id}

    user = await db["users"].find_one(query)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user["_id"] = str(user["_id"])
    # Security: Don't return sensitive fields to public
    user.pop("hashed_password", None)
    user.pop("reset_token_hash", None)
    return user
