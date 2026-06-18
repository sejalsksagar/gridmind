from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    CORS_ORIGINS: str = "http://localhost:5173"
    MAPPLS_API_KEY: str = ""  # MapmyIndia REST API key (server-side)
    DEBUG: bool = False

    class Config:
        env_file = ".env"

settings = Settings()