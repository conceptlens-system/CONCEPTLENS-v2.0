from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List
from app.db.mongodb import get_database
from app.models.exams import Exam, ExamCreate
from app.core.security import get_current_user
from bson import ObjectId
from datetime import datetime, timezone
from app.models.notifications import Notification

router = APIRouter()

def ensure_utc(exam_doc):
    if exam_doc.get("schedule_start") and exam_doc["schedule_start"].tzinfo is None:
        exam_doc["schedule_start"] = exam_doc["schedule_start"].replace(tzinfo=timezone.utc)
    if exam_doc.get("exam_access_end_time") and exam_doc["exam_access_end_time"].tzinfo is None:
        exam_doc["exam_access_end_time"] = exam_doc["exam_access_end_time"].replace(tzinfo=timezone.utc)
    if exam_doc.get("created_at") and exam_doc["created_at"].tzinfo is None:
        exam_doc["created_at"] = exam_doc["created_at"].replace(tzinfo=timezone.utc)
    return exam_doc

@router.get("/", response_model=List[Exam])
async def list_exams(professor_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    query = {}
    
    if current_user["role"] == "professor":
        query["professor_id"] = str(current_user["_id"])
    elif current_user["role"] == "student":
        enrollments = await db.class_students.find({"student_id": current_user["email"]}).to_list(100)
        class_ids = [e["class_id"] for e in enrollments]
        query["class_ids"] = {"$in": class_ids}
        query["is_validated"] = True # Only show validated exams to students
    else:
        if professor_id:
             query["professor_id"] = professor_id
        
    cursor = db.exams.find(query).sort("created_at", -1)
    exams = await cursor.to_list(length=100)
    
    # If student, check for attempts
    if current_user["role"] == "student":
        student_id = current_user.get("email") # or _id depending on what is stored in responses
        exam_ids = [str(e["_id"]) for e in exams]
        
        # simple check: distinct assessment_ids for this student
        attempts = await db.student_responses.distinct("assessment_id", {"student_id": student_id, "assessment_id": {"$in": exam_ids}})
        attempted_set = set(attempts)
        
        for e in exams:
            e["_id"] = str(e["_id"])
            ensure_utc(e)
            e["attempted"] = e["_id"] in attempted_set
    else:
        for e in exams:
            e["_id"] = str(e["_id"])
            ensure_utc(e)
            
    return exams

@router.post("/", response_model=Exam)
async def create_exam(exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    print("----- CREATE EXAM ENDPOINT HIT (DEFENSIVE MODE) -----")
    try:
        # 1. Convert to Dict
        new_exam = exam.dict()
        print("Received Payload Keys:", new_exam.keys())

        # 2. Defensive Cleaning (The "500 Killer")
        # Ensure no _id is passed to Mongo (it generates its own)
        if "_id" in new_exam:
            print("Removing leaked _id from payload")
            del new_exam["_id"]
        if "id" in new_exam:
            del new_exam["id"]
            
        # Clean Nested Questions
        if "questions" in new_exam:
            for q in new_exam["questions"]:
                if "_id" in q: del q["_id"]
                # Ensure generic topic if missing
                if "topic_id" not in q or not q["topic_id"]:
                    q["topic_id"] = "general"

        # 3. Set System Fields
        new_exam["professor_id"] = str(current_user["_id"])
        new_exam["is_validated"] = False 
        new_exam["created_at"] = datetime.now(timezone.utc)
        
        # 4. Insert
        print("Inserting sanitized exam into DB...")
        db = await get_database()
        result = await db.exams.insert_one(new_exam)
        print(f"Insertion Success! ID: {result.inserted_id}")
        
        # 5. Retrieve & Return
        created = await db.exams.find_one({"_id": result.inserted_id})
        created["_id"] = str(created["_id"])
        ensure_utc(created)
        
        return created

    except Exception as e:
        import traceback
        print("!!!!! FATAL CREATE EXAM ERROR !!!!!")
        traceback.print_exc()
        # Return 500 but with detail so user sees it
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

@router.get("/{exam_id}", response_model=Exam)
async def get_exam(exam_id: str):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    exam["_id"] = str(exam["_id"])
    ensure_utc(exam)
    return exam

@router.put("/{exam_id}", response_model=Exam)
async def update_exam(exam_id: str, exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Update with new data
    update_data = exam.dict()
    update_data["professor_id"] = str(current_user["_id"])
    
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    return updated

@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    await db.exams.delete_one({"_id": obj_id})
    
    return {"message": "Exam deleted successfully"}

@router.patch("/{exam_id}/validate", response_model=Exam)
async def validate_exam(exam_id: str, is_validated: bool = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"is_validated": is_validated}}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    ensure_utc(updated)
    return updated

@router.post("/{exam_id}/publish", response_model=Exam)
async def publish_exam_results(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Update Exam
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"results_published": True}}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)

    # Notify Students (Who have attempted)
    # 1. Find all students who submitted responses
    responses = await db.student_responses.distinct("student_id", {"assessment_id": exam_id})
    
    notifications = []
    for student_id in responses:
        # Check if notification already exists to avoid spam? No, duplicate publish might be update.
        notif = {
            "recipient_id": student_id,
            "type": "RESULT_PUBLISHED",
            "title": "Exam Results Released",
            "message": f"Results for '{existing_exam['title']}' have been published. Check your marks now.",
            "link": f"/student/exams/{exam_id}/result",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        notifications.append(notif)
    
    if notifications:
        await db.notifications.insert_many(notifications)
    return updated

@router.get("/{exam_id}/students", response_model=List[dict])
async def get_exam_students(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Get all responses for this exam
    responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(1000)
    
    # Extract unique student emails (assuming student_id is email)
    student_ids = list(set([r["student_id"] for r in responses]))
    
    # Fetch student details (mock or from future users collection if exists, currently just returning email/id)
    # Ideally checking class_students or users collection
    # For now, we return valid data structure for the frontend
    
    students_list = []
    for sid in student_ids:
        # Try to find name from enrollments if possible, else use ID
        name = sid.split("@")[0] if "@" in sid else sid
        students_list.append({
            "id": sid,
            "name": name, 
            "email": sid,
            "status": "Completed"
        })
        
    return students_list

@router.get("/{exam_id}/students_scores", response_model=List[dict])
async def get_exam_students_scores(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Map Question ID to Marks
    question_marks = {q["id"]: q.get("marks", 1) for q in existing_exam.get("questions", [])}
    total_marks = sum(question_marks.values())

    # Get all responses for this exam
    responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(10000)
    
    # Group by student
    student_scores = {} # student_id -> score
    
    for r in responses:
        sid = r["student_id"]
        qid = r["question_id"]
        is_correct = r.get("is_correct", False)
        
        if sid not in student_scores:
            student_scores[sid] = 0
            
        if is_correct:
            student_scores[sid] += question_marks.get(qid, 0)
    
    # Format output
    result_list = []
    for sid, score in student_scores.items():
        # Clean ID/Name
        name = sid.split("@")[0] if "@" in sid else sid
        
        result_list.append({
            "id": sid,
            "name": name, 
            "email": sid,
            "score": score,
            "total_marks": total_marks,
            "status": "Completed"
        })
        
    return result_list

@router.get("/{exam_id}/my_result")
async def get_my_result(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
         raise HTTPException(status_code=403, detail="Only students can view their results")

    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Get Exam
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Check if results published
    if not existing_exam.get("results_published", False):
        raise HTTPException(status_code=403, detail="Results not yet published")

    # Calculate Score
    student_id = current_user["email"]
    
    question_marks = {q["id"]: q.get("marks", 1) for q in existing_exam.get("questions", [])}
    total_marks = sum(question_marks.values())
    
    responses = await db.student_responses.find({
        "assessment_id": exam_id, 
        "student_id": student_id
    }).to_list(1000)
    
    score = 0
    correct_count = 0
    
    for r in responses:
        qid = r["question_id"]
        is_correct = r.get("is_correct", False)
        if is_correct:
            score += question_marks.get(qid, 0)
            correct_count += 1
            
    # Create Response Map
    response_map = {r["question_id"]: r for r in responses}
    
    detailed_questions = []
    for q in existing_exam.get("questions", []):
        qid = q["id"]
        response = response_map.get(qid)
        
        q_data = {
            "id": qid,
            "text": q["text"],
            "type": q.get("type", "mcq"),
            "options": q.get("options", []),
            "marks": q.get("marks", 1),
            "correct_answer": q.get("correct_answer"),
            "user_answer": response.get("response_text") if response else None,
            "is_correct": response.get("is_correct", False) if response else False,
            "explanation": q.get("explanation")
        }
        detailed_questions.append(q_data)
            
    return {
        "score": score,
        "total_marks": total_marks,
        "correct_questions": correct_count,
        "total_questions": len(existing_exam.get("questions", [])),
        "responses_count": len(responses),
        "questions": detailed_questions
    }
