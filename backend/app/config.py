"""Environment-driven settings."""
import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "orbitx")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
    DEFAULT_USER_ID = int(os.getenv("DEFAULT_USER_ID", "1"))
    # single source of truth, exposed to the frontend at GET /meta/limits
    PROXIMITY_MAX_OBJECTS = int(os.getenv("PROXIMITY_MAX_OBJECTS", "40"))
    PROXIMITY_DEFAULT_OBJECTS = int(os.getenv("PROXIMITY_DEFAULT_OBJECTS", "30"))
    POSITIONS_MAX = int(os.getenv("POSITIONS_MAX", "1000"))

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{quote_plus(self.DB_PASSWORD)}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )


settings = Settings()
