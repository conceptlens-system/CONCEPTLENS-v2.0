from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CONCEPTLENS"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "conceptlens"
    SECRET_KEY: str = "supersecretkey" # In production, use env var
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ANALYTICS_MODE: str = "demo" # "demo" or "production"
    GEMINI_API_KEY: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
