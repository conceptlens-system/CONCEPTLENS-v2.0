from fastapi import APIRouter
from app.api.v1.endpoints import ingest, analytics, teacher, subjects, exams, auth, institutes, professors, classes, notifications, contact, syllabus, ai_exams

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["teacher"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(institutes.router, prefix="/institutes", tags=["institutes"])
api_router.include_router(professors.router, prefix="/professors", tags=["professors"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(contact.router, prefix="/contact", tags=["contact"])
api_router.include_router(syllabus.router, prefix="/syllabus", tags=["syllabus"])
api_router.include_router(ai_exams.router, prefix="/ai-exams", tags=["ai-exams"])
