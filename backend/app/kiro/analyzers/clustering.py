import difflib
from typing import List, Dict
from app.models.schemas import StudentResponse, DetectedMisconception
from collections import defaultdict

def cluster_responses(responses: List[StudentResponse], assessment_id: str, question_id: str) -> List[dict]:
    """
    Groups similar incorrect responses into misconceptions.
    Uses SequenceMatcher for similarity.
    """
    if not responses:
        return []

    # Simple Greedy Clustering
    # 1. Take a response, find all similar enough to it.
    # 2. Group them.
    # 3. Repeat for remaining.

    ungrouped = responses[:]
    clusters = []
    
    from app.core.config import settings
    
    SIMILARITY_THRESHOLD = 0.6
    MIN_STUDENTS = 1 if settings.ANALYTICS_MODE == "demo" else 2

    while ungrouped:
        seed = ungrouped.pop(0)
        current_cluster = [seed]
        
        # Find similar
        remaining = []
        for other in ungrouped:
            similarity = difflib.SequenceMatcher(None, seed.response_text.lower(), other.response_text.lower()).ratio()
            print(f"[KIRO] Similarity: '{seed.response_text}' vs '{other.response_text}' = {similarity}") # LOG SIMILARITY
            if similarity >= SIMILARITY_THRESHOLD:
                current_cluster.append(other)
            else:
                remaining.append(other)
        
        ungrouped = remaining
        
        # Create Cluster Object if size > MIN_STUDENTS
        if len(current_cluster) >= MIN_STUDENTS:
            if len(current_cluster) == 1:
                cluster_label = f"Potential misconception: '{seed.response_text}'"
            else:
                cluster_label = f"Misconception similar to: '{seed.response_text}'"
                
            clusters.append({
                "assessment_id": assessment_id,
                "question_id": question_id,
                "cluster_label": cluster_label,
                "student_count": len(current_cluster),
                "confidence_score": 0.5 + (len(current_cluster) * 0.05), # Naive score
                "example_ids": [str(r.id) for r in current_cluster[:5]],
                "status": "pending"
            })
            
    return clusters
