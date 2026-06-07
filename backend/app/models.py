"""
SQLAlchemy ORM models for Prompt Lab.

Domain:
  Experiment  — a named group of prompt variants under test
  PromptVariant — one version of a prompt belonging to an experiment
  Run         — a single execution: one variant against one model
"""

import datetime
from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    variants: Mapped[list["PromptVariant"]] = relationship(
        "PromptVariant", back_populates="experiment", cascade="all, delete-orphan"
    )


class PromptVariant(Base):
    __tablename__ = "prompt_variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    experiment: Mapped["Experiment"] = relationship(
        "Experiment", back_populates="variants"
    )
    runs: Mapped[list["Run"]] = relationship(
        "Run", back_populates="variant", cascade="all, delete-orphan"
    )


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("prompt_variants.id", ondelete="CASCADE"), nullable=False
    )
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    output: Mapped[str] = mapped_column(Text, nullable=False)
    # Latency in milliseconds
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    # Approximate token counts (may be 0 if API doesn't expose them)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    # User-assigned score 1–5 (null until rated)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    variant: Mapped["PromptVariant"] = relationship("PromptVariant", back_populates="runs")
