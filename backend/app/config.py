"""
Application configuration — reads from environment / .env file.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_base_url: str = "http://localhost:11434/v1"
    llm_api_key: str = "ollama"
    database_url: str = "sqlite+aiosqlite:///./promptlab.db"
    # Stored as a comma-separated string in .env, e.g.:
    # CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    cors_origins: str = "http://localhost:5173"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: object) -> str:
        # Accept both a plain string and a JSON list ["...", "..."]
        if isinstance(v, list):
            return ",".join(v)
        return str(v)

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
