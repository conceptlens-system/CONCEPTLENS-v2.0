from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection

app = FastAPI(
    title="CONCEPTLENS API",
    description="Backend for ConceptLens Education Analytics Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse

# "Nuclear Option" CORS Middleware to guarantee access
class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            response = JSONResponse(content={"message": "Preflight OK"})
        else:
            try:
                response = await call_next(request)
            except Exception as exc:
                print(f"Middleware caught error: {exc}")
                response = JSONResponse(status_code=500, content={"detail": str(exc)})

        # Dynamically allow the requesting origin
        origin = request.headers.get("origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(ForceCORSMiddleware)


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to CONCEPTLENS API", "status": "active"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = traceback.format_exc()
    print("########## BACKEND ERROR ##########")
    print(error_msg)
    print("###################################")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": error_msg},
    )