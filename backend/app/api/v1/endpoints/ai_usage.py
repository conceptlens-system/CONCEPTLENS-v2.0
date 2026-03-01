from fastapi import APIRouter, Depends, HTTPException
from app.db.mongodb import get_database
from app.core.security import get_current_user
from typing import List, Dict
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/metrics", response_model=Dict)
async def get_ai_usage_metrics(
    days: int = 30,
    current_user: dict = Depends(get_current_user),
):
    """
    Get aggregated AI usage metrics for the Admin Dashboard.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Total questions generated in the period
    pipeline_total = [
        {"$match": {"timestamp": {"$gte": cutoff_date}}},
        {"$group": {"_id": None, "total_questions": {"$sum": "$questions_generated"}}}
    ]
    total_result = await db["ai_usage_logs"].aggregate(pipeline_total).to_list(1)
    total_questions = total_result[0]["total_questions"] if total_result else 0
    
    # 2. Daily breakdown for charts
    pipeline_daily = [
        {"$match": {"timestamp": {"$gte": cutoff_date}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$timestamp"},
                    "month": {"$month": "$timestamp"},
                    "day": {"$dayOfMonth": "$timestamp"}
                },
                "questions": {"$sum": "$questions_generated"},
                "requests": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    daily_results = await db["ai_usage_logs"].aggregate(pipeline_daily).to_list(days)
    
    formatted_daily = [
        {
            "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
            "questions": r["questions"],
            "requests": r["requests"]
        } for r in daily_results
    ]
    
    # 3. Top Users Leaderboard
    pipeline_users = [
        {"$match": {"timestamp": {"$gte": cutoff_date}}},
        {"$group": {
            "_id": "$user_id", 
            "total_questions": {"$sum": "$questions_generated"},
            "total_requests": {"$sum": 1},
            "last_active": {"$max": "$timestamp"}
        }},
        {"$sort": {"total_questions": -1}},
        {"$limit": 10}
    ]
    top_users = await db["ai_usage_logs"].aggregate(pipeline_users).to_list(10)
    
    # Optional: fetch user details for the leaderboard if needed
    for u in top_users:
        user_doc = await db["users"].find_one({"_id": u["_id"]})
        u["user_email"] = user_doc["email"] if user_doc else "Unknown"
        u["user_name"] = user_doc.get("full_name", "Unknown") if user_doc else "Unknown"
        u["_id"] = str(u["_id"]) # Cast ObjectId to string for JSON serialization
        u["last_active"] = u["last_active"].isoformat() if "last_active" in u and u["last_active"] else None
        
    return {
        "period_days": days,
        "total_questions": total_questions,
        "daily_usage": formatted_daily,
        "top_users": top_users
    }
