"""
Experiments router — CRUD for experiments and their prompt variants.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Experiment, PromptVariant
from app.schemas import (
    ExperimentCreate,
    ExperimentRead,
    ExperimentDetail,
    VariantCreate,
    VariantRead,
)

router = APIRouter()


# ── Experiments ───────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ExperimentRead])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).order_by(Experiment.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ExperimentRead, status_code=status.HTTP_201_CREATED)
async def create_experiment(body: ExperimentCreate, db: AsyncSession = Depends(get_db)):
    exp = Experiment(name=body.name, description=body.description)
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


@router.get("/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(experiment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Experiment)
        .options(selectinload(Experiment.variants))
        .where(Experiment.id == experiment_id)
    )
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.delete("/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(experiment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    await db.delete(exp)
    await db.commit()


# ── Prompt Variants ───────────────────────────────────────────────────────────

@router.get("/{experiment_id}/variants", response_model=list[VariantRead])
async def list_variants(experiment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PromptVariant)
        .where(PromptVariant.experiment_id == experiment_id)
        .order_by(PromptVariant.created_at)
    )
    return result.scalars().all()


@router.post(
    "/{experiment_id}/variants",
    response_model=VariantRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_variant(
    experiment_id: int, body: VariantCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    variant = PromptVariant(
        experiment_id=experiment_id,
        label=body.label,
        system_prompt=body.system_prompt,
        user_prompt=body.user_prompt,
    )
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


@router.delete(
    "/{experiment_id}/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_variant(
    experiment_id: int, variant_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PromptVariant).where(
            PromptVariant.id == variant_id,
            PromptVariant.experiment_id == experiment_id,
        )
    )
    variant = result.scalar_one_or_none()
    if variant is None:
        raise HTTPException(status_code=404, detail="Variant not found")
    await db.delete(variant)
    await db.commit()
