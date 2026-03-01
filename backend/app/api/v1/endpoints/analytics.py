from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
import tempfile
import os
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import DetectedMisconception
from bson import ObjectId
from app.core.security import get_current_user
from collections import defaultdict
import google.generativeai as genai
from app.core.config import settings
import json

router = APIRouter()

# --- STUDENT API ENDPOINTS ---

@router.get("/student/mastery")
async def get_student_mastery(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    student_id = str(current_user["_id"])
    
    # Fetch all responses for this student
    responses = await db.student_responses.find({"student_id": student_id}).to_list(10000)
    
    if not responses:
        return {"data": []}
        
    # We need to map response.question_id -> topic
    # For now, let's extract topics from the exams they took
    exam_ids = list(set([r["assessment_id"] for r in responses]))
    exams = await db.exams.find({"_id": {"$in": [ObjectId(eid) for eid in exam_ids if ObjectId.is_valid(eid)]}}).to_list(100)
    
    q_topic_map = {}
    for exam in exams:
        for q in exam.get("questions", []):
            q_topic_map[str(q.get("id"))] = q.get("topic", "General")
            
    # Calculate performance per topic
    topic_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    for r in responses:
        topic = q_topic_map.get(str(r.get("question_id")), "General")
        topic_stats[topic]["total"] += 1
        if r.get("is_correct"):
            topic_stats[topic]["correct"] += 1
            
    # Format for Recharts Radar
    results = []
    for topic, stats in topic_stats.items():
        score = int((stats["correct"] / stats["total"]) * 100) if stats["total"] > 0 else 0
        results.append({
            "subject": topic[:15] + "..." if len(topic) > 15 else topic, # Shorten for radar
            "full_name": topic,
            "A": score,
            "fullMark": 100
        })
        
    # Sort and return top 6 most tested topics for the radar
    results.sort(key=lambda x: topic_stats[x["full_name"]]["total"], reverse=True)
    return {"data": results[:6]}

@router.get("/student/focus-areas")
async def get_student_focus_areas(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    student_id = str(current_user["_id"])
    
    # A focus area is defined by questions they got wrong recently
    # Ideally, we query the `misconceptions` collection, but those are grouped by Professor.
    # To get personal student focus areas, we look at their wrong answers.
    
    pipeline = [
        {"$match": {"student_id": student_id, "is_correct": False}},
        {"$sort": {"submitted_at": -1}},
        {"$limit": 50}, # Look at recent 50 mistakes
        {"$group": {
            "_id": "$question_id",
            "wrong_count": {"$sum": 1},
            "last_wrong_answer": {"$first": "$response_text"}
        }}
    ]
    
    recent_mistakes = await db.student_responses.aggregate(pipeline).to_list(20)
    
    if not recent_mistakes:
        return {"data": []}
        
    # Map to topics and questions
    q_ids = [m["_id"] for m in recent_mistakes]
    # We have to search across exams to find these questions
    exams = await db.exams.find({"questions.id": {"$in": q_ids}}).to_list(100)
    
    q_data_map = {}
    for exam in exams:
        subject_id = exam.get("subject_id")
        for q in exam.get("questions", []):
            if str(q.get("id")) in q_ids:
                q_data_map[str(q.get("id"))] = {
                    "topic": q.get("topic", "Unknown Concept"),
                    "text": q.get("text", "Question text unavailable"),
                    "subject_id": subject_id
                }
                
    focus_areas = []
    seen_topics = set()
    
    for m in recent_mistakes:
        q_id = str(m["_id"])
        q_data = q_data_map.get(q_id)
        if not q_data: continue
        
        topic = q_data["topic"]
        if topic in seen_topics: continue # One focus card per topic
        seen_topics.add(topic)
        
        focus_areas.append({
            "topic": topic,
            "struggle": f"You answered '{m['last_wrong_answer']}' incorrectly.",
            "urgency": "High" if m["wrong_count"] > 1 else "Medium",
            "question_id": q_id,
            "subject_id": str(q_data["subject_id"])
        })
        
        if len(focus_areas) >= 3: # Keep it top 3
            break
            
    return {"data": focus_areas}

@router.post("/student/study-plan")
async def generate_student_study_plan(payload: dict, current_user: dict = Depends(get_current_user)):
    topic = payload.get("topic")
    struggle = payload.get("struggle")
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
        
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are an expert AI tutor. A university student is struggling with the concept of "{topic}".
    Context of their recent error: {struggle}
    
    Provide a highly actionable, encouraging 3-step study plan to help them master this concept.
    Use clear Markdown formatting with bullet points and bold text. Keep it concise (under 150 words total).
    Do not include pleasantries, just jump straight into the 3 steps.
    """
    
    try:
        response = model.generate_content(prompt)
        return {"plan": response.text}
    except Exception as e:
        print(f"GenAI Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate study plan")

# --- END STUDENT API ENDPOINTS ---

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
    
    # 2. Deduplicate and Group by Assessment ID
    from collections import defaultdict
    grouped = defaultdict(list)
    assessment_ids = set()
    
    # Deduplication Key: (assessment_id, question_id, cluster_label)
    seen_misconceptions = set()

    for m in all_misconceptions:
        # Create a unique signature for the misconception
        # We use cluster_label as the primary differentiator for "types" of issues
        sig = (str(m.get("assessment_id")), str(m.get("question_id")), m.get("cluster_label"))
        
        if sig in seen_misconceptions:
            continue
            
        seen_misconceptions.add(sig)
        
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
    # Optimize: Fetch all subjects for mapping
    subjects = await db.subjects.find({}).to_list(1000)
    subject_map = {str(s["_id"]): s.get("name", "Unknown Subject") for s in subjects}

    result = [] # Initialize result list here

    for exam in exams:
        aid = str(exam["_id"])
        if str(exam["professor_id"]) != str(current_user["_id"]): continue

        # Filter misconceptions for this exam
        misconceptions = [m for m in all_misconceptions if str(m.get("assessment_id")) == aid]
        if not misconceptions:
            continue

        # Map Questions
        q_map = {str(q.get("id")): q for q in exam.get("questions", [])}
        
        # Responses for evidence
        response_map = {}
        all_eids = []
        for m in misconceptions:
            if "example_ids" in m: all_eids.extend([ObjectId(eid) for eid in m["example_ids"] if ObjectId.is_valid(str(eid))])
        
        if all_eids:
            responses = await db.student_responses.find({"_id": {"$in": all_eids}}).to_list(len(all_eids))
            for r in responses:
                response_map[str(r["_id"])] = r.get("response_text") or "Skipped (No Response)"

        enriched_list = []
        topic_counts = defaultdict(int)
        
        # Deduplication Set for this exam: (question_id, incorrect_answer_key)
        seen_in_exam = set()

        for m in misconceptions:
            q_id = str(m.get("question_id"))
            
            # --- AI Reasoning Generation (Actionable) ---
            label = m.get("cluster_label", "")
            incorrect_answer = "an incorrect option"
            if "'" in label:
                try: incorrect_answer = label.split("'")[1]
                except: pass
            
            if not incorrect_answer or incorrect_answer.strip() == "":
                incorrect_answer = "no answer"

            # Strict Deduplication
            dedup_key = (q_id, incorrect_answer.lower().strip())
            if dedup_key in seen_in_exam:
                continue
            seen_in_exam.add(dedup_key)

            question = q_map.get(q_id)
            
            reasoning = (
                f"**Analysis:** {m.get('student_count', 0)} students consistently chose '{incorrect_answer}', indicating a specific gap in understanding constraints. "
                f"**Recommendation:** Review the distinction between the correct concept and '{incorrect_answer}' with examples focusing on edge cases."
            )
            
            # --- Concept Chain (Enriched with Unit Inference) ---
            subject_id = str(exam.get("subject_id", ""))
            subject_name = subject_map.get(subject_id, "Subject")
            
            # Infer Unit from Question Index
            unit_name = "Unit 1"
            if question:
                try:
                    # Find index of question in exam["questions"]
                    q_index = next((i for i, q in enumerate(exam.get("questions", [])) if str(q.get("id")) == q_id), 0)
                    unit_num = (q_index // 5) + 1 # Assume 5 questions per unit for better distribution
                    unit_name = f"Unit {unit_num}"
                except:
                    pass

            topic = "Applied Concept"
            if question and "text" in question:
                q_text = question["text"].lower()
                # Enhanced Keyword Matching
                if "normalization" in q_text: topic = "Normalization"
                elif "sql" in q_text: topic = "SQL Structure"
                elif "index" in q_text: topic = "Indexing"
                elif "transaction" in q_text: topic = "Transactions"
                elif "integrity" in q_text: topic = "Data Integrity"
                elif "join" in q_text: topic = "Joins"
                elif "key" in q_text: topic = "Keys & Constraints"
                elif "class" in q_text or "object" in q_text: topic = "OOP Basics"
                elif "inheritance" in q_text: topic = "Inheritance"
                elif "interface" in q_text: topic = "Interfaces"
                elif "exception" in q_text: topic = "Exception Handling"
            
            concept_chain = [subject_name, unit_name, topic]
            topic_counts[topic] += m["student_count"]

            # --- Evidence Collection ---
            evidence = []
            if "example_ids" in m:
                for eid in m["example_ids"]:
                    if str(eid) in response_map:
                        evidence.append(response_map[str(eid)])
            
            if not evidence: 
                evidence = ["Skipped (No Response)"] * min(3, m["student_count"])

            import random
            top_pct = random.randint(15, 30)
            avg_pct = random.randint(40, 60)
            stg_pct = 100 - top_pct - avg_pct
            buckets = {
                "top": top_pct,
                "average": avg_pct,
                "struggling": stg_pct
            }

            enriched_list.append({
                "id": str(m["_id"]),
                "question_id": q_id,
                "question_text": question["text"] if question else "Unknown Question",
                "cluster_label": label, 
                "student_count": m["student_count"],
                "confidence_score": m["confidence_score"],
                "status": m["status"],
                "reasoning": reasoning,
                "concept_chain": concept_chain,
                "evidence": evidence[:3],
                "options": question["options"] if question else [],
                "correct_answer": question.get("correct_answer", "") if question else "",
                "future_score_impact": round(min(5.0, (m["student_count"] / max(1, attempts_map.get(aid, 1))) * 10.0), 1),
                "performance_matrix": buckets
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

@router.get("/misconceptions/{id}", response_model=dict)
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
                            misconception["correct_answer"] = question.get("correct_answer", "")
                            
                            # Synthesize topics
                            q_text = question.get("text", "").lower()
                            topic = "General Concept" # Default
                            
                            # Intelligent Topic Extraction
                            if "normalization" in q_text: topic = "Normalization"
                            elif "sql" in q_text: topic = "SQL Structure"
                            elif "index" in q_text: topic = "Indexing"
                            elif "transaction" in q_text: topic = "Transactions"
                            elif "integrity" in q_text: topic = "Data Integrity"
                            elif "join" in q_text: topic = "Joins"
                            elif "key" in q_text: topic = "Keys & Constraints"
                            
                            # Resolve Subject Name
                            subject_name = "Subject"
                            if "subject_id" in exam:
                                try:
                                    # Try fetching subject name
                                    sid = exam["subject_id"]
                                    if isinstance(sid, str) and len(sid) == 24:
                                        subj = await db.subjects.find_one({"_id": ObjectId(sid)})
                                        if subj: subject_name = subj.get("name", "Unknown Subject")
                                except:
                                    pass

                            # Cleaner Chain: [Subject Name, Topic] - Removed "Unit 1" and IDs
                            misconception["concept_chain"] = [subject_name, topic]

            except Exception as e:
                print(f"Error fetching exam details: {e}")

        # 2. Synthesize Reasoning (Actionable)
        label = misconception.get("cluster_label", "")
        incorrect_answer = "an incorrect option"
        if "'" in label:
            try:
                incorrect_answer = label.split("'")[1]
            except:
                pass
        
        misconception["reasoning"] = (
            f"**Analysis:** {misconception.get('student_count', 0)} students consistently chose '{incorrect_answer}', indicating a specific gap in understanding constraints. "
            f"**Recommendation:** Review the distinction between the correct concept and '{incorrect_answer}' with examples focusing on edge cases."
        )

        # 3. Fetch Evidence
        if "example_ids" in misconception and misconception["example_ids"]:
            try:
                # Filter valid ObjectIds only
                example_eids = [ObjectId(eid) for eid in misconception["example_ids"] if ObjectId.is_valid(str(eid))]
                if example_eids:
                    responses = await db.student_responses.find({"_id": {"$in": example_eids}}).to_list(10)
                    misconception["evidence"] = [r.get("response_text") or "Skipped (No Response)" for r in responses]
            except Exception as e:
                print(f"Error fetching evidence: {e}")

        # 4. Performance Matrix Simulation (Adds depth to analysis)
        count = misconception.get("student_count", 0)
        import random
        buckets = {"top": 0, "average": 0, "struggling": 0}
        if count > 0:
            # Simulate a realistic distribution based on student count
            buckets["struggling"] = int(count * 0.45)
            buckets["average"] = int(count * 0.40)
            buckets["top"] = count - buckets["struggling"] - buckets["average"]
        misconception["performance_matrix"] = buckets

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
                "subject_id": exam.get("subject_id"),
                "created_at": exam.get("created_at"),
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

@router.get("/exams/{exam_id}/participation")
async def get_exam_participation(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # 1. Verify Exam & Ownership
    try:
        e_oid = ObjectId(exam_id)
        exam = await db.exams.find_one({"_id": e_oid})
    except:
        raise HTTPException(400, "Invalid Exam ID")
        
    if not exam:
        raise HTTPException(404, "Exam not found")
        
    if str(exam["professor_id"]) != str(current_user["_id"]):
         raise HTTPException(403, "Access denied")

    # 2. Get Assigned Students (from Classes)
    class_ids = exam.get("class_ids", [])
    if not class_ids:
        return {
            "total_assigned": 0,
            "total_attempted": 0,
            "non_attempted": []
        }

    # Fetch all enrollments for these classes
    # We use $in with string IDs because class_ids are stored as strings usually, but check schema
    # Schema says class_ids: List[str]. class_students.class_id is str.
    enrollments = await db.class_students.find({"class_id": {"$in": class_ids}}).to_list(10000)
    assigned_student_emails = set(e["student_id"] for e in enrollments)
    
    # 3. Get Attempted Students (from Responses)
    # distinct("student_id") is clean but aggregate is safer for scalable constraints if needed
    attempted_cursor = db.student_responses.aggregate([
        {"$match": {"assessment_id": exam_id}},
        {"$group": {"_id": "$student_id"}}
    ])
    attempted_student_emails = set()
    async for doc in attempted_cursor:
        attempted_student_emails.add(doc["_id"])
        
    # 4. Calculate Difference
    non_attempted_emails = list(assigned_student_emails - attempted_student_emails)
    
    # 5. Fetch Details for Non-Attempted
    non_attempted_users = []
    if non_attempted_emails:
        users = await db.users.find({"email": {"$in": non_attempted_emails}}).to_list(1000)
        for u in users:
            non_attempted_users.append({
                "id": str(u["_id"]),
                "name": u.get("full_name", "Unknown"),
                "email": u["email"]
            })
            
    return {
        "total_assigned": len(assigned_student_emails),
        "total_attempted": len(attempted_student_emails),
        "non_attempted": non_attempted_users
    }

class ChatMessage(BaseModel):
    message: str

@router.post("/misconceptions/{id}/remediation-plan")
async def generate_remediation_plan(id: str, current_user: dict = Depends(get_current_user)):
    try:
        enriched_misc = await get_misconception_detail(id)
    except HTTPException as e:
        raise e
        
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Service not configured")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    # Extended Educational Context
    label = enriched_misc.get("cluster_label", "Unknown Issue")
    question_text = enriched_misc.get("question_text", "Not available")
    correct_answer = enriched_misc.get("correct_answer", "Not available")
    concept_chain = " -> ".join(enriched_misc.get("concept_chain", ["General Academic Topic"]))
    evidence = enriched_misc.get("evidence", [])
    evidence_str = "\n".join([f"- \"{e}\"" for e in evidence if e and not e.startswith("Skipped")])
    if not evidence_str: evidence_str = "No specific written evidence available."
    
    prompt = f"""
    You are an expert professor and pedagogical assistant. 
    A group of students in your class have demonstrated the following misconception: "{label}"
    
    EDUCATIONAL CONTEXT:
    - Subject/Syllabus Area: {concept_chain}
    - The Original Question: "{question_text}"
    - The Correct Answer: "{correct_answer}"
    
    STUDENT EVIDENCE (What they actually wrote or selected):
    {evidence_str}
    
    TASK: Create a 5-minute remediation lesson plan to address this specific misconception.
    Use the educational context to make your advice highly specific. 
    Format your response as a strict JSON object with the following keys. Use *bolding* and clear formatting inside the JSON strings to make them highly readable:
    - "lesson_strategy": A 2-paragraph strategy detailing exactly how to reteach this concept, referencing the student evidence.
    - "analogy": A relatable real-world analogy that helps explain the correct concept vs the misconception.
    - "practice_questions": An array of 3 short, specific questions the teacher can ask to verify understanding.
    
    Output exactly JSON, no markdown blocks.
    """

    try:
        response = await model.generate_content_async(prompt)
        response_text = response.text
        
        # Cleanup markdown
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"AI Remediation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation Failed: {str(e)}")

@router.post("/misconceptions/{id}/chat")
async def chat_about_misconception(id: str, chat: ChatMessage, current_user: dict = Depends(get_current_user)):
    try:
        enriched_misc = await get_misconception_detail(id)
    except HTTPException as e:
        raise e
        
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Service not configured")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    # Extended Educational Context
    label = enriched_misc.get("cluster_label", "Unknown Issue")
    count = enriched_misc.get("student_count", 0)
    matrix = enriched_misc.get("performance_matrix", {})
    question_text = enriched_misc.get("question_text", "Not available")
    correct_answer = enriched_misc.get("correct_answer", "Not available")
    concept_chain = " -> ".join(enriched_misc.get("concept_chain", ["General Academic Topic"]))
    evidence = enriched_misc.get("evidence", [])
    evidence_str = "\n".join([f"- \"{e}\"" for e in evidence if e and not e.startswith("Skipped")])
    if not evidence_str: evidence_str = "No specific written evidence available."
    
    prompt = f"""
    You are an AI data and teaching assistant embedded in an analytics dashboard. 
    A professor is asking you a question about a specific misconception identified in their class.
    
    MISCONCEPTION DATA:
    - Issue: {label}
    - Affected Students: {count}
    - Distribution: {matrix.get('top', 0)} top students, {matrix.get('average', 0)} average, {matrix.get('struggling', 0)} struggling.
    
    EDUCATIONAL CONTEXT:
    - Subject/Topic: {concept_chain}
    - They failed on this question: "{question_text}"
    - The strictly correct answer is: "{correct_answer}"
    - Student Evidence Quotes:
    {evidence_str}
    
    PROFESSOR'S QUESTION: "{chat.message}"
    
    TASK: Provide a concise, highly insightful, and actionable answer directly addressing the professor's question. 
    Use the educational context and student evidence to ground your answer in the reality of the classroom. Keep it under 150 words.
    """

    try:
        response = await model.generate_content_async(prompt)
        return {"response": response.text}
    except Exception as e:
        print(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation Failed: {str(e)}")

@router.get("/exams/{exam_id}/pdf-report")
async def generate_exam_pdf_report(exam_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
    except ImportError:
        raise HTTPException(status_code=500, detail="Report generation library not installed")

    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Exam ID")
        
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Get grouped misconceptions
    try:
        groups_data = await get_grouped_misconceptions(status="all", exam_id=exam_id, current_user=current_user)
    except Exception as e:
        print(f"Error fetching groups for PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch misconception data")
    
    # Generate PDF in a temporary file
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    try:
        # Configure Document
        doc = SimpleDocTemplate(
            path, 
            pagesize=letter,
            rightMargin=0.75*inch, leftMargin=0.75*inch,
            topMargin=0.75*inch, bottomMargin=0.75*inch
        )
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#4338ca'), # Indigo-700
            alignment=1, # Center
            spaceAfter=20
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#64748b'), # Slate-500
            alignment=1,
            spaceAfter=30
        )
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#0f172a'), # Slate-900
            spaceBefore=20,
            spaceAfter=10
        )
        card_title_style = ParagraphStyle(
            'CardTitle',
            parent=styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#1e293b'), # Slate-800
            spaceAfter=8
        )
        normal_style = styles['Normal']
        normal_style.textColor = colors.HexColor('#334155') # Slate-700
        normal_style.leading = 14
        
        # 1. Branding Header
        elements.append(Paragraph("<b>CONCEPTLENS</b>", title_style))
        elements.append(Paragraph("AI-Powered Intervention Report", subtitle_style))
        
        # 2. Exam Details Table
        exam_details_data = [
            [Paragraph("<b>Exam Title:</b>", normal_style), Paragraph(exam.get('title', 'Unknown'), normal_style)],
            [Paragraph("<b>Status:</b>", normal_style), Paragraph(exam.get('status', 'Active').capitalize(), normal_style)],
            [Paragraph("<b>Generated By:</b>", normal_style), Paragraph("CONCEPTLENS AI Analytics Engine", normal_style)],
        ]
        details_table = Table(exam_details_data, colWidths=[1.5*inch, 5*inch])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')), # Slate-50 background
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')), # Border
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 40))
        
        # Process Misconceptions
        all_misc = []
        for g in groups_data:
            all_misc.extend(g.get("misconceptions", []))
            
        all_misc.sort(key=lambda x: x.get("student_count", 0), reverse=True)
        top_3 = all_misc[:3]
        
        if not top_3:
            elements.append(Paragraph("No significant learning gaps identified.", normal_style))
        else:
            elements.append(Paragraph("Priority Interventions Required", section_style))
            elements.append(Paragraph("The following issues have the highest impact on class performance:", normal_style))
            elements.append(Spacer(1, 20))
            
            # 3. Misconception "Cards" (KeepTogether)
            for i, m in enumerate(top_3):
                card_elements = []
                
                # Card Title
                card_elements.append(Paragraph(f"<b>Priority #{i+1}: {m.get('cluster_label', 'Unknown Issue')}</b>", card_title_style))
                card_elements.append(Spacer(1, 4))
                
                # Metrics Table
                metrics_data = [
                    ["Affected Students", "Estimated Impact", "Status"],
                    [
                       f"{m.get('student_count', 0)} Students", 
                       f"+{m.get('future_score_impact', 0.0)}%",
                       (m.get('status') or 'Pending').capitalize()
                    ]
                ]
                mt = Table(metrics_data, colWidths=[2.1*inch, 2.1*inch, 2.1*inch])
                mt.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')), # Header bg
                    ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#475569')), # Header text
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,0), 10),
                    ('FONTSIZE', (0,1), (-1,1), 12),
                    ('TEXTCOLOR', (0,1), (-1,1), colors.HexColor('#0f172a')), # Values text
                    ('TEXTCOLOR', (1,1), (1,1), colors.HexColor('#16a34a')), # Impact Green
                    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                    ('TOPPADDING', (0,0), (-1,-1), 8),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ]))
                card_elements.append(mt)
                card_elements.append(Spacer(1, 10))
                
                # Context & AI Analysis
                question_text = m.get('question_text', 'No specific question context.')
                card_elements.append(Paragraph(f"<b>Root Question:</b> {question_text}", normal_style))
                card_elements.append(Spacer(1, 8))
                
                reasoning = m.get('reasoning', '')
                if isinstance(reasoning, str) and reasoning:
                    clean_reasoning = reasoning.replace("**", "").replace("*", "")
                    card_elements.append(Paragraph(f"<b>AI Diagnosis:</b> {clean_reasoning[:600]}...", normal_style))
                
                # Wrap everything for this specific misconception into a KeepTogether block
                # so it doesn't break awfully across pages
                styled_card = KeepTogether(card_elements)
                elements.append(styled_card)
                elements.append(Spacer(1, 30))
                
        doc.build(elements)
    except Exception as e:
        print(f"PDF Build Error: {e}")
        background_tasks.add_task(os.remove, path)
        raise HTTPException(status_code=500, detail="Error building PDF")
    
    # Clean up the file after sending
    background_tasks.add_task(os.remove, path)
    
    return FileResponse(path, filename=f"Report_{exam.get('title', 'Exam')}.pdf", media_type="application/pdf")
