"""
Application configuration — reads from environment / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_base_url: str = "http://localhost:11434/v1"
    llm_api_key: str = "ollama"
    database_url: str = "sqlite+aiosqlite:///./promptlab.db"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
