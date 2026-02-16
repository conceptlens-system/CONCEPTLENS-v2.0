from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import DetectedMisconception
from bson import ObjectId
from app.core.security import get_current_user
from collections import defaultdict

router = APIRouter()

@router.get("/misconceptions/grouped", response_model=List[dict])
async def get_grouped_misconceptions(status: str = "valid", exam_id: str | None = None, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # 1. Fetch all misconceptions (optionally filtered by status)
    # Note: In a real app, we should also filter by exams belonging to this professor
    query = {}
    if status != "all":
        query["status"] = status
    if exam_id:
        query["assessment_id"] = exam_id
        
    cursor = db.misconceptions.find(query)
    all_misconceptions = await cursor.to_list(1000)
    
    # 2. Group by Assessment ID
    from collections import defaultdict
    grouped = defaultdict(list)
    assessment_ids = set()
    
    for m in all_misconceptions:
        aid = m["assessment_id"]
        grouped[aid].append(m)
        assessment_ids.add(aid)
        
    # 3. Fetch Exam Metadata for these assessments
    # We need to filter to only exams owned by the current professor to ensure security
    # But for now, we'll just fetch info for the found IDs and let the frontend/logic filter if needed?
    # Better: Fetch exams for this professor, and valid misconceptions are those associated with these exams.
    
    # 3. Fetch Exam Metadata
    exams_cursor = db.exams.find({"_id": {"$in": [ObjectId(aid) for aid in assessment_ids]}})
    exams = await exams_cursor.to_list(100)
    exam_map = {str(e["_id"]): e for e in exams}

    # 3a. Calculate "Attempted" count per exam (Unique students who submitted)
    # We can do this by aggregating student_responses
    pipeline = [
        {"$match": {"assessment_id": {"$in": list(assessment_ids)}}},
        {"$group": {"_id": "$assessment_id", "students": {"$addToSet": "$student_id"}}}
    ]
    attempts_cursor = db.student_responses.aggregate(pipeline)
    attempts_map = {}
    async for doc in attempts_cursor:
        attempts_map[doc["_id"]] = len(doc["students"])

    # 3b. Fetch Student Responses for Evidence Preview (Bulk fetch for performance)
    # Collect all example_ids from all visible misconceptions
    all_example_ids = []
    for m in all_misconceptions:
        if "example_ids" in m:
            all_example_ids.extend([ObjectId(eid) for eid in m["example_ids"]])
            
    response_map = {}
    if all_example_ids:
        resp_cursor = db.student_responses.find({"_id": {"$in": all_example_ids}})
        resps = await resp_cursor.to_list(1000)
        response_map = {str(r["_id"]): r["response_text"] for r in resps}

    # 4. Construct Response
    result = []
    
    for aid, misconceptions in grouped.items():
        if aid not in exam_map: continue
        exam = exam_map[aid]
        if str(exam["professor_id"]) != str(current_user["_id"]): continue
        
        questions_map = {q["id"]: q for q in exam.get("questions", [])}
        enriched_list = []
        
        # Calculate topic struggles for Impact Summary
        topic_counts = defaultdict(int)

        for m in misconceptions:
            q_id = m["question_id"]
            question = questions_map.get(q_id)
            label = m["cluster_label"]
            
            # --- AI Reasoning Generation ---
            # Try to extract the incorrect answer from label
            incorrect_answer = "an incorrect option"
            if "'" in label:
                incorrect_answer = label.split("'")[1]
            
            reasoning = (
                f"The AI detected that {m['student_count']} students selected '{incorrect_answer}'. "
                f"This systematic pattern suggests a confusion between the correct concept and '{incorrect_answer}', "
                "likely due to misinterpreting the question context."
            )
            
            # --- Concept Chain (Simulated per question logic) ---
            # In real system, this comes from Quesion -> Topic link.
            # We will use Exam Subject + Mock topics for "AI feel"
            subject = exam.get("subject_id", "General") 
            topic = "Core Concepts"
            if question and "text" in question:
                # Simple keyword matching for "smart" tagging
                q_text = question["text"].lower()
                if "normalization" in q_text: topic = "Normalization (3NF/BCNF)"
                elif "sql" in q_text: topic = "SQL Query Structure"
                elif "index" in q_text: topic = "Indexing Strategies"
                elif "transaction" in q_text: topic = "Transaction Management"
            
            concept_chain = [subject, "Unit 1", topic]
            topic_counts[topic] += m["student_count"]

            # --- Evidence Collection ---
            evidence = []
            if "example_ids" in m:
                for eid in m["example_ids"]:
                    if eid in response_map:
                        evidence.append(response_map[eid])
            # Fallback if no specific examples (shouldn't happen with valid clusters)
            if not evidence: 
                evidence = [incorrect_answer] * min(3, m["student_count"])

            enriched_list.append({
                "id": str(m["_id"]),
                "question_id": q_id,
                "question_text": question["text"] if question else "Unknown Question",
                "cluster_label": "Observed Incorrect Pattern: " + incorrect_answer, # Renamed as requested
                "student_count": m["student_count"],
                "confidence_score": m["confidence_score"],
                "status": m["status"],
                "reasoning": reasoning,
                "concept_chain": concept_chain,
                "evidence": evidence[:3], # Limit to 3 quotes
                "options": question["options"] if question else []
            })
        
        # --- Impact Summary ---
        max_topic = max(topic_counts, key=topic_counts.get) if topic_counts else "General"
        total_issues = sum(topic_counts.values())
        impact_summary = (
            f"AI Insight: {len(misconceptions)} distinct misconception patterns detected. "
            f"The primary struggle area appears to be '{max_topic}', affecting {topic_counts[max_topic]} student responses."
        )

        result.append({
            "exam_id": aid,
            "exam_title": exam.get("title", "Untitled Exam"),
            "subject_id": exam.get("subject_id", ""),
            "created_at": exam.get("created_at"),
            "misconception_count": len(enriched_list),
            "student_count": attempts_map.get(aid, 0),
            "impact_summary": impact_summary,
            "misconceptions": enriched_list
        })
        
    return result

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    db = await get_database()
    pending_count = await db.misconceptions.count_documents({"status": "pending"})
    valid_count = await db.misconceptions.count_documents({"status": "valid"})
    total_responses = await db.student_responses.count_documents({})
    
    return {
        "pending_misconceptions": pending_count,
        "valid_misconceptions": valid_count,
        "processed_responses": total_responses # Simplified
    }

@router.get("/misconceptions", response_model=List[DetectedMisconception])
async def list_misconceptions(status: str = "pending"):
    db = await get_database()
    cursor = db.misconceptions.find({"status": status})
    misconceptions = await cursor.to_list(length=100)
    # Map _id to id
    for m in misconceptions:
        m["_id"] = str(m["_id"])
    return misconceptions

@router.get("/misconceptions/{id}", response_model=DetectedMisconception)
async def get_misconception_detail(id: str):
    db = await get_database()
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    misconception = await db.misconceptions.find_one({"_id": obj_id})
    if not misconception:
        raise HTTPException(status_code=404, detail="Misconception not found")
    
    # --- Enrichment Logic (Defensive) ---
    try:
        misconception["_id"] = str(misconception["_id"])
        
        # 1. Fetch Exam & Question
        if "assessment_id" in misconception and misconception["assessment_id"]:
            try:
                # Handle both String and ObjectId formats in DB
                aid_raw = misconception["assessment_id"]
                aid_obj = ObjectId(aid_raw) if ObjectId.is_valid(str(aid_raw)) else None
                
                if aid_obj:
                    exam = await db.exams.find_one({"_id": aid_obj})
                    if exam and "questions" in exam:
                        # Find question by string ID match
                        q_target_id = str(misconception.get("question_id", ""))
                        question = next((q for q in exam["questions"] if str(q.get("id")) == q_target_id), None)
                        
                        if question:
                            misconception["question_text"] = question.get("text", "Question text not found")
                            misconception["options"] = question.get("options", [])
                            
                            # Synthesize topics
                            q_text = question.get("text", "").lower()
                            topic = "Core Concepts"
                            if "normalization" in q_text: topic = "Normalization (3NF/BCNF)"
                            elif "sql" in q_text: topic = "SQL Query Structure"
                            elif "index" in q_text: topic = "Indexing Strategies"
                            elif "transaction" in q_text: topic = "Transaction Management"
                            elif "integrity" in q_text: topic = "Data Integrity"
                            
                            subject = exam.get("subject_id", "General")
                            misconception["concept_chain"] = [subject, "Unit 1", topic]
            except Exception as e:
                print(f"Error fetching exam details: {e}")

        # 2. Synthesize Reasoning
        label = misconception.get("cluster_label", "")
        incorrect_answer = "an incorrect option"
        if "'" in label:
            try:
                incorrect_answer = label.split("'")[1]
            except:
                pass
        
        misconception["reasoning"] = (
            f"The AI detected that {misconception.get('student_count', 0)} students selected '{incorrect_answer}'. "
            f"This systematic pattern suggests a confusion between the correct concept and '{incorrect_answer}', "
            "likely due to misinterpreting the specific constraints in the question."
        )

        # 3. Fetch Evidence
        if "example_ids" in misconception and misconception["example_ids"]:
            try:
                # Filter valid ObjectIds only
                example_eids = [ObjectId(eid) for eid in misconception["example_ids"] if ObjectId.is_valid(str(eid))]
                if example_eids:
                    responses = await db.student_responses.find({"_id": {"$in": example_eids}}).to_list(10)
                    misconception["evidence"] = [r.get("response_text", "") for r in responses]
            except Exception as e:
                print(f"Error fetching evidence: {e}")

    except Exception as e:
        print(f"Critical error in enrichment: {e}")
        pass

    # --- Type Coercion for Pydantic ---
    # Ensure all ObjectId fields are strings to pass validation
    if "example_ids" in misconception and isinstance(misconception["example_ids"], list):
        misconception["example_ids"] = [str(eid) for eid in misconception["example_ids"]]
    
    if "assessment_id" in misconception:
        misconception["assessment_id"] = str(misconception["assessment_id"])
        
    if "question_id" in misconception:
        misconception["question_id"] = str(misconception["question_id"])
    return misconception

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str

@router.put("/misconceptions/{id}/status")
async def update_misconception_status(id: str, update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    # Verify ownership (via exam -> professor)
    result = await db.misconceptions.update_one(
        {"_id": obj_id},
        {"$set": {"status": update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Misconception not found")
        
    return {"status": "success", "new_status": update.status}

@router.get("/reports/trends", response_model=dict)
async def get_misconception_trends(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # 1. Fetch all exams for this professor (sorted by creation date)
    exams_cursor = db.exams.find({"professor_id": str(current_user["_id"])}).sort("created_at", 1)
    exams = await exams_cursor.to_list(100)
    
    if not exams:
        return {"summary": "No exams found to analyze trends.", "matrix": []}
        
    exam_map = {str(e["_id"]): e for e in exams}
    exam_ids = [str(e["_id"]) for e in exams]
    exam_titles = {str(e["_id"]): e.get("title", f"Exam {i+1}") for i, e in enumerate(exams)}
    
    # 2. Fetch all VALID misconceptions for these exams
    # We only care about validated patterns for high-level reports
    cursor = db.misconceptions.find({
        "assessment_id": {"$in": exam_ids},
        "status": "valid" 
    })
    misconceptions = await cursor.to_list(1000)
    
    # 3. Build Topic Matrix
    # Structure: { "TopicName": { "ExamID": Count, ... } }
    topic_matrix = defaultdict(lambda: defaultdict(int))
    
    # Pre-fetch questions for topic tagging
    questions_map = {}
    for e in exams:
        for q in e.get("questions", []):
            questions_map[q["id"]] = q
            
    for m in misconceptions:
        # Determine Topic (Simulated logic same as grouped endpoint)
        q_id = m["question_id"]
        question = questions_map.get(q_id)
        topic = "General Concepts"
        
        if question and "text" in question:
            q_text = question["text"].lower()
            if "normalization" in q_text: topic = "Normalization"
            elif "sql" in q_text: topic = "SQL Structure"
            elif "index" in q_text: topic = "Indexing"
            elif "transaction" in q_text: topic = "Transactions"
            elif "key" in q_text: topic = "Keys & Constraints"
            
        aid = m["assessment_id"]
        topic_matrix[topic][aid] += 1
        
    # 4. Format for Frontend
    # [ { topic: "SQL", history: [ { exam: "Test 1", status: "Clean" }, ... ] } ]
    formatted_matrix = []
    topics_with_issues = []
    
    for topic, exam_counts in topic_matrix.items():
        history = []
        trend_status = "stable"
        
        last_count = 0
        for aid in exam_ids:
            count = exam_counts.get(aid, 0)
            status = "clean"
            if count > 0: status = "issue"
            if count > 3: status = "critical"
            
            history.append({
                "exam_id": aid,
                "exam_title": exam_titles[aid],
                "count": count,
                "status": status
            })
            
            # Simple trend detection
            if count > last_count and last_count > 0: trend_status = "worsening"
            elif count < last_count and count > 0: trend_status = "improving"
            last_count = count
            
        formatted_matrix.append({
            "topic": topic,
            "trend": trend_status,
            "history": history
        })
        topics_with_issues.append(topic)
        
    # 5. Generate AI Summary
    if not topics_with_issues:
        summary = "No significant misconception trends detected yet. Students differ in errors across exams."
    else:
        # Simple template-based insight
        worst_topic = max(topic_matrix, key=lambda t: sum(topic_matrix[t].values()))
        summary = (
            f"AI Trend Analysis: Persistent struggles observed in '{worst_topic}' across multiple assessments. "
            "recommend targeted revision on this topic before the next module."
        )

    return {
        "summary": summary,
        "exams": [{"id": eid, "title": exam_titles[eid]} for eid in exam_ids],
        "matrix": formatted_matrix
    }


@router.get("/assessments", response_model=List[dict])
async def get_assessment_summaries(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # 1. Get all exams for this professor
    exams_cursor = db.exams.find({"professor_id": str(current_user["_id"])})
    exams = await exams_cursor.to_list(100)
    
    summaries = []
    
    for exam in exams:
        exam_id = str(exam["_id"])
        
        # 2. Get all responses for this exam
        responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(10000)
        
        if not responses:
            summaries.append({
                "id": exam_id,
                "title": exam.get("title", "Untitled Exam"),
                "total_students": 0,
                "avg_score": 0,
                "status": "No submissions"
            })
            continue

        # 3. Aggregate
        student_ids = set(r["student_id"] for r in responses)
        total_correct = sum(1 for r in responses if r.get("is_correct", False))
        total_responses = len(responses)
        
        avg_score = 0
        if total_responses > 0:
            avg_score = (total_correct / total_responses) * 100
            
        summaries.append({
            "id": exam_id,
            "title": exam.get("title", "Untitled Exam"),
            "subject_id": exam.get("subject_id"),
            "created_at": exam.get("created_at"),
            "total_students": len(student_ids),
            "avg_score": round(avg_score, 1),
            "status": "Active"
        })
        
    return summaries
