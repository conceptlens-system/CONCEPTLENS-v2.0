from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field
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

# --- Institution Models ---
class InstitutionBase(BaseModel):
    name: str
    type: str  # University, School, College
    location: str
    state: Optional[str] = None
    city: Optional[str] = None
    domains: List[str] = []
    subscription_status: str = "Active"

class InstitutionCreate(InstitutionBase):
    pass

class Institution(InstitutionBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- Professor Models ---
class ProfessorBase(BaseModel):
    full_name: str
    email: EmailStr
    department: str
    subjects: List[str] = []
    institution_id: str 

class ProfessorCreate(ProfessorBase):
    password: str 

class Professor(ProfessorBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[str] = None 

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- User Models ---
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    role: str = "student" 

    # Profile Fields (Optional)
    contact_number: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = None
    institute_name: Optional[str] = None # Text field as requested
    degree: Optional[str] = None # For Students (e.g. B.Tech)
    current_semester: Optional[int] = None # For Students (e.g. 1)
    
    bio: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    research_interests: List[str] = [] # For Professors
    office_hours: Optional[str] = None # For Professors
    linkedin_url: Optional[str] = None
    academic_history: Optional[str] = None
    
    # NEW fields for Professor verification:
    designation: Optional[str] = None
    employee_id: Optional[str] = None

    institution_id: Optional[str] = None
    auth_provider: str = "email" # email, google
    reset_token_hash: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    contact_number: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    branch: Optional[str] = None
    institute_name: Optional[str] = None
    degree: Optional[str] = None
    current_semester: Optional[int] = None
    linkedin_url: Optional[str] = None
    academic_history: Optional[str] = None
    research_interests: Optional[List[str]] = None
    office_hours: Optional[str] = None
    profile_picture: Optional[str] = None
class User(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    
# --- Student Response Models (for Ingest) ---
class StudentResponseCreate(BaseModel):
    student_id: str
    assessment_id: str
    question_id: str
    response_text: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

class StudentResponse(StudentResponseCreate):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    is_correct: bool = False
    processed: bool = False
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- Misconception Models (for Analytics) ---
class MisconceptionStatus: 
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"

class DetectedMisconception(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    assessment_id: str
    question_id: str
    cluster_label: str
    student_count: int
    confidence_score: float
    example_ids: List[str]
    status: str = "pending"
    is_priority: bool = False # Instructional Priority Flag
    
    # Enriched Fields (Optional)
    question_text: Optional[str] = None
    options: Optional[List[Any]] = None 
    reasoning: Optional[str] = None
    concept_chain: Optional[List[str]] = None
    evidence: Optional[List[str]] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# --- Onboarding & Request Models ---
class ProfessorRequest(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    full_name: str
    email: EmailStr
    institution_id: Optional[str] = None
    new_institution_name: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    subject_expertise: str
    
    department: str
    designation: str
    employee_id: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    status: str = "PENDING" # PENDING, APPROVED, REJECTED
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ProfessorRequestCreate(BaseModel):
    full_name: str
    email: EmailStr
    institution_id: Optional[str] = None
    new_institution_name: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    subject_expertise: str
    department: str
    designation: str
    employee_id: Optional[str] = None
    linkedin_url: Optional[str] = None

# --- Class Management Models ---
class Class(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str # e.g. "DBMS - Sem 3"
    subject_id: str
    institution_id: Optional[str] = None
    professor_id: str
    class_code: str # Unique 6-char code
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ClassCreate(BaseModel):
    name: str
    subject_id: str

class ClassJoinRequest(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    student_id: str # User ID (email or objectId string)
    student_user_id: Optional[str] = None # Actual User ObjectId string
    student_name: str
    class_id: str
    status: str = "PENDING" # PENDING, APPROVED, REJECTED
    requested_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- Teacher Validation Models ---
class TeacherValidation(BaseModel):
    misconception_id: str
    status: str 
    teacher_notes: Optional[str] = None

# --- Announcement Models ---
class Announcement(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    class_id: str
    professor_id: str
    title: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AnnouncementCreate(BaseModel):
    title: str
    content: str
