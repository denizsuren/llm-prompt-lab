"""
Pydantic schemas for request/response validation.
"""

import datetime
from pydantic import BaseModel, field_validator


# ── Experiment ────────────────────────────────────────────────────────────────

class ExperimentCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class ExperimentRead(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ExperimentDetail(ExperimentRead):
    variants: list["VariantRead"] = []


# ── PromptVariant ─────────────────────────────────────────────────────────────

class VariantCreate(BaseModel):
    label: str
    system_prompt: str | None = None
    user_prompt: str

    @field_validator("user_prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("user_prompt must not be blank")
        return v


class VariantRead(BaseModel):
    id: int
    experiment_id: int
    label: str
    system_prompt: str | None
    user_prompt: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ── Run ───────────────────────────────────────────────────────────────────────

class RunCreate(BaseModel):
    variant_id: int
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 512


class RunRead(BaseModel):
    id: int
    variant_id: int
    model_name: str
    output: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    score: float | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class RunScore(BaseModel):
    score: float

    @field_validator("score")
    @classmethod
    def score_range(cls, v: float) -> float:
        if not (1.0 <= v <= 5.0):
            raise ValueError("score must be between 1 and 5")
        return v


# ── Statistics ────────────────────────────────────────────────────────────────

class VariantStats(BaseModel):
    variant_id: int
    label: str
    run_count: int
    avg_score: float | None
    avg_latency_ms: float | None
    avg_tokens: float | None


class ExperimentStats(BaseModel):
    experiment_id: int
    variants: list[VariantStats]
