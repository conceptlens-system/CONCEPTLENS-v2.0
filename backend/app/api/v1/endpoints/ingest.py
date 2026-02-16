from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from app.models.schemas import StudentResponseCreate, StudentResponse
from app.db.mongodb import get_database
from app.kiro.job_runner import trigger_analysis_job

router = APIRouter()

@router.post("/responses", status_code=202)
async def ingest_responses(responses: List[StudentResponseCreate], background_tasks: BackgroundTasks):
    db = await get_database()
    
    # Insert raw responses
    
    # Check for duplicate attempt (Student + Assessment) uniqueness
    student_id = responses[0].student_id
    assessment_id = responses[0].assessment_id
    
    existing = await db.student_responses.find_one({
        "student_id": student_id, 
        "assessment_id": assessment_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Exam already submitted. Multiple attempts are not allowed.")

    # Fetch Exam to get correct answers
    from bson import ObjectId
    try:
        exam = await db.exams.find_one({"_id": ObjectId(assessment_id)})
    except:
        exam = None
        
    correct_answers = {}
    if exam:
        for q in exam.get("questions", []):
            correct_answers[q["id"]] = q["correct_answer"]

    response_dicts = []
    for r in responses:
        data = r.dict()
        # Grading Logic
        if exam:
            q_id = data["question_id"]
            correct_text = correct_answers.get(q_id, "").strip().lower()
            student_text = data["response_text"].strip().lower()
            # Simple exact match (case-insensitive)
            # For more complex types, we'd need more logic
            is_correct = (student_text == correct_text)
            data["is_correct"] = is_correct
        else:
             data["is_correct"] = False # Default if exam not found
             
        data["processed"] = False
        response_dicts.append(data)

    result = await db.student_responses.insert_many(response_dicts)
    
    # Trigger Analysis in Background (KIRO)
    # Group by assessment/question to optimize batching
    assessment_ids = list(set([r.assessment_id for r in responses]))
    
    for aid in assessment_ids:
        background_tasks.add_task(trigger_analysis_job, assessment_id=aid)
    
    return {"message": f"Ingested {len(result.inserted_ids)} responses. Analysis queued."}
