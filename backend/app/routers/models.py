"""
Models router — proxy for listing available LLM models.
"""

from fastapi import APIRouter
from app import llm_client

router = APIRouter()


@router.get("/", response_model=list[str])
async def list_models():
    """Return available model IDs from the configured LLM endpoint."""
    return await llm_client.list_models()
