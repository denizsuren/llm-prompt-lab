"""
Backend tests for LLM Prompt Lab.

These tests use an in-memory SQLite database and mock the LLM client
so they run without any external service.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.database import Base, get_db
from app.llm_client import LLMResponse

# ── Test database setup ───────────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine, expire_on_commit=False, class_=AsyncSession
)


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        from app import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Helper ────────────────────────────────────────────────────────────────────

async def create_experiment(client, name="Test Exp", description="desc"):
    resp = await client.post("/api/experiments/", json={"name": name, "description": description})
    assert resp.status_code == 201
    return resp.json()


async def create_variant(client, experiment_id, label="Variant A", user_prompt="Hello?"):
    resp = await client.post(
        f"/api/experiments/{experiment_id}/variants",
        json={"label": label, "user_prompt": user_prompt},
    )
    assert resp.status_code == 201
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_experiment(client):
    resp = await client.post(
        "/api/experiments/",
        json={"name": "My Experiment", "description": "Testing prompts"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Experiment"
    assert data["id"] > 0


@pytest.mark.asyncio
async def test_experiment_name_required(client):
    resp = await client.post("/api/experiments/", json={"name": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_experiments(client):
    await create_experiment(client, "Exp 1")
    await create_experiment(client, "Exp 2")
    resp = await client.get("/api/experiments/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_experiment_not_found(client):
    resp = await client.get("/api/experiments/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_variant(client):
    exp = await create_experiment(client)
    resp = await client.post(
        f"/api/experiments/{exp['id']}/variants",
        json={
            "label": "Control",
            "system_prompt": "You are a helpful assistant.",
            "user_prompt": "What is 2+2?",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["label"] == "Control"
    assert data["experiment_id"] == exp["id"]


@pytest.mark.asyncio
async def test_delete_experiment_cascades(client):
    exp = await create_experiment(client)
    await create_variant(client, exp["id"])
    del_resp = await client.delete(f"/api/experiments/{exp['id']}")
    assert del_resp.status_code == 204
    # Verify experiment is gone
    get_resp = await client.get(f"/api/experiments/{exp['id']}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_run_execution_and_scoring(client):
    exp = await create_experiment(client)
    variant = await create_variant(client, exp["id"], user_prompt="Summarise AI in one sentence.")

    fake_llm = LLMResponse(
        content="AI is the simulation of human intelligence by machines.",
        latency_ms=312.5,
        prompt_tokens=15,
        completion_tokens=12,
    )

    with patch("app.routers.runs.llm_client.complete", new=AsyncMock(return_value=fake_llm)):
        run_resp = await client.post(
            "/api/runs/",
            json={"variant_id": variant["id"], "model_name": "llama3.2"},
        )

    assert run_resp.status_code == 201
    run = run_resp.json()
    assert run["output"] == fake_llm.content
    assert run["latency_ms"] == pytest.approx(312.5)
    assert run["score"] is None

    # Score it
    score_resp = await client.patch(f"/api/runs/{run['id']}/score", json={"score": 4.0})
    assert score_resp.status_code == 200
    assert score_resp.json()["score"] == 4.0


@pytest.mark.asyncio
async def test_score_out_of_range(client):
    exp = await create_experiment(client)
    variant = await create_variant(client, exp["id"])

    fake_llm = LLMResponse("ok", 100.0, 5, 5)
    with patch("app.routers.runs.llm_client.complete", new=AsyncMock(return_value=fake_llm)):
        run_resp = await client.post(
            "/api/runs/",
            json={"variant_id": variant["id"], "model_name": "llama3.2"},
        )
    run_id = run_resp.json()["id"]

    bad_score = await client.patch(f"/api/runs/{run_id}/score", json={"score": 6.0})
    assert bad_score.status_code == 422


@pytest.mark.asyncio
async def test_experiment_stats(client):
    exp = await create_experiment(client)
    variant = await create_variant(client, exp["id"])

    fake_llm = LLMResponse("response", 200.0, 10, 8)
    with patch("app.routers.runs.llm_client.complete", new=AsyncMock(return_value=fake_llm)):
        r1 = await client.post(
            "/api/runs/", json={"variant_id": variant["id"], "model_name": "llama3.2"}
        )
        r2 = await client.post(
            "/api/runs/", json={"variant_id": variant["id"], "model_name": "llama3.2"}
        )

    await client.patch(f"/api/runs/{r1.json()['id']}/score", json={"score": 4.0})
    await client.patch(f"/api/runs/{r2.json()['id']}/score", json={"score": 2.0})

    stats_resp = await client.get(f"/api/runs/stats/{exp['id']}")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["experiment_id"] == exp["id"]
    v_stats = stats["variants"][0]
    assert v_stats["run_count"] == 2
    assert v_stats["avg_score"] == pytest.approx(3.0)
