"""
Runs router — execute prompts against LLMs, store results, rate outputs,
and compute per-experiment statistics.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Run, PromptVariant, Experiment
from app.schemas import RunCreate, RunRead, RunScore, ExperimentStats, VariantStats
from app import llm_client

router = APIRouter()


@router.post("/", response_model=RunRead, status_code=status.HTTP_201_CREATED)
async def execute_run(body: RunCreate, db: AsyncSession = Depends(get_db)):
    """Execute a prompt variant against a model and persist the result."""
    result = await db.execute(
        select(PromptVariant).where(PromptVariant.id == body.variant_id)
    )
    variant = result.scalar_one_or_none()
    if variant is None:
        raise HTTPException(status_code=404, detail="Prompt variant not found")

    try:
        llm_resp = await llm_client.complete(
            model=body.model_name,
            system_prompt=variant.system_prompt,
            user_prompt=variant.user_prompt,
            temperature=body.temperature,
            max_tokens=body.max_tokens,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LLM request failed: {exc}",
        )

    run = Run(
        variant_id=variant.id,
        model_name=body.model_name,
        output=llm_resp.content,
        latency_ms=llm_resp.latency_ms,
        prompt_tokens=llm_resp.prompt_tokens,
        completion_tokens=llm_resp.completion_tokens,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


@router.get("/", response_model=list[RunRead])
async def list_runs(
    variant_id: int | None = None,
    experiment_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List runs, optionally filtered by variant or experiment."""
    query = select(Run).order_by(Run.created_at.desc())

    if variant_id is not None:
        query = query.where(Run.variant_id == variant_id)
    elif experiment_id is not None:
        # Join through variants to filter by experiment
        query = (
            query.join(PromptVariant, Run.variant_id == PromptVariant.id)
            .where(PromptVariant.experiment_id == experiment_id)
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{run_id}", response_model=RunRead)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.patch("/{run_id}/score", response_model=RunRead)
async def score_run(run_id: int, body: RunScore, db: AsyncSession = Depends(get_db)):
    """Assign a 1–5 score to a completed run."""
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    run.score = body.score
    await db.commit()
    await db.refresh(run)
    return run


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    await db.delete(run)
    await db.commit()


@router.get("/stats/{experiment_id}", response_model=ExperimentStats)
async def experiment_stats(experiment_id: int, db: AsyncSession = Depends(get_db)):
    """
    Return aggregated statistics per variant for a given experiment.
    Used by the scoring dashboard.
    """
    # Verify experiment exists
    exp_result = await db.execute(
        select(Experiment).where(Experiment.id == experiment_id)
    )
    if exp_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Aggregate metrics per variant
    agg = await db.execute(
        select(
            PromptVariant.id.label("variant_id"),
            PromptVariant.label.label("label"),
            func.count(Run.id).label("run_count"),
            func.avg(Run.score).label("avg_score"),
            func.avg(Run.latency_ms).label("avg_latency_ms"),
            func.avg(Run.completion_tokens).label("avg_tokens"),
        )
        .join(Run, Run.variant_id == PromptVariant.id, isouter=True)
        .where(PromptVariant.experiment_id == experiment_id)
        .group_by(PromptVariant.id, PromptVariant.label)
        .order_by(PromptVariant.id)
    )

    rows = agg.all()
    variants = [
        VariantStats(
            variant_id=r.variant_id,
            label=r.label,
            run_count=r.run_count or 0,
            avg_score=r.avg_score,
            avg_latency_ms=r.avg_latency_ms,
            avg_tokens=r.avg_tokens,
        )
        for r in rows
    ]

    return ExperimentStats(experiment_id=experiment_id, variants=variants)
