from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone

class Question(BaseModel):
    id: str
    text: str
    type: str = "mcq" # mcq, one_word, etc
    options: List[str] = []
    correct_answer: str
    topic_id: str
    marks: int = 1

class ExamCreate(BaseModel):
    title: str
    subject_id: str
    professor_id: Optional[str] = None
    questions: List[Question]
    duration_minutes: int
    schedule_start: datetime
    exam_access_end_time: Optional[datetime] = None
    anti_cheat_config: dict = {"fullscreen": True, "tab_switch": True}
    class_ids: List[str] = [] # List of Class IDs this exam is assigned to

class Exam(BaseModel):
    id: str = Field(alias="_id")
    title: str
    subject_id: str
    professor_id: str
    questions: List[Question]
    duration_minutes: int
    schedule_start: datetime
    exam_access_end_time: Optional[datetime] = None
    anti_cheat_config: dict = {"fullscreen": True, "tab_switch": True}
    class_ids: List[str] = [] # List of Class IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_validated: bool = False # Teacher must approve

    results_published: bool = False # Teacher must publish for students to see marks

    attempted: Optional[bool] = False # Dynamic field for student view

class SubjectCreate(BaseModel):
    name: str
    semester: Optional[str] = None
    branches: List[str] = []
    sections: List[str] = []
    syllabus: List[dict] = [] # [{unit: "1", topics: [...]}]

class Subject(BaseModel):
    id: str = Field(alias="_id")
    name: str # e.g. DBMS
    semester: Optional[str] = None
    branches: List[str] = []
    sections: List[str] = []
    syllabus: List[dict] # [{unit: "1", topics: [...]}]
    professor_id: Optional[str] = None
