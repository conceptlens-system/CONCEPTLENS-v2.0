import asyncio
from app.db.mongodb import get_database
from app.kiro.analyzers.clustering import cluster_responses
from app.models.schemas import StudentResponse, DetectedMisconception
from datetime import datetime

async def trigger_analysis_job(assessment_id: str):
    print(f"[KIRO] Starting analysis for assessment: {assessment_id}")
    db = await get_database()
    
    # 1. Fetch unprocessed responses
    cursor = db.student_responses.find({"assessment_id": assessment_id, "processed": False, "is_correct": False})
    raw_responses = await cursor.to_list(length=1000)
    
    if not raw_responses:
        print("[KIRO] No new incorrect responses to analyze.")
        return

    # Convert to Pydantic models for the analyzer
    responses_models = []
    for r in raw_responses:
        r["_id"] = str(r["_id"])
        responses_models.append(StudentResponse(**r))
        
    print(f"[KIRO] Analyze {len(responses_models)} responses...")

    # 2. Group by Question
    from collections import defaultdict
    by_question = defaultdict(list)
    for r in responses_models:
        print(f"[KIRO] Response: {r.id} | Q: {r.question_id}") # LOG GROUPING
        by_question[r.question_id].append(r)
        
    # 3. Run Clustering
    new_misconceptions = []
    for q_id, resps in by_question.items():
        print(f"[KIRO] Clustering Q: {q_id} with {len(resps)} items") # LOG CLUSTERING START
        clusters = cluster_responses(resps, assessment_id, q_id)
        new_misconceptions.extend(clusters)
        
    # 4. Save to DB
    if new_misconceptions:
        # Add timestamps
        for m in new_misconceptions:
            m["created_at"] = datetime.utcnow()
            m["last_updated"] = datetime.utcnow()
            
        await db.misconceptions.insert_many(new_misconceptions)
        print(f"[KIRO] Saved {len(new_misconceptions)} new misconceptions.")
        
    # 5. Mark responses as processed
    response_ids = [r.id for r in responses_models]
    # Note: simple loop for update, can be optimized
    # For now, just leave them or batch update if IDs were ObjectIds
    
    print(f"[KIRO] Analysis complete for assessment: {assessment_id}")
