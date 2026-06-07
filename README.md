# LLM Prompt Lab

A developer tool for benchmarking, comparing, and iterating on LLM prompts — locally, without vendor lock-in.

---

## Why This Exists

When working with local LLMs (via Ollama, LM Studio, or any OpenAI-compatible server), it's easy to lose track of which prompt wording worked best, which model was faster, and whether a revised system prompt actually made a difference. Prompt Lab gives you a structured workspace to run controlled A/B tests on prompt variants, score the outputs, and see aggregated statistics over time.

---

## Key Features

- **Experiments** — Organise related prompt variants under a named experiment
- **Prompt Variants** — Write multiple versions of a prompt (system + user) and compare them side by side
- **One-click runs** — Execute a variant against any Ollama/OpenAI-compatible model, with latency and token counts recorded automatically
- **Star scoring** — Rate outputs 1–5 to track which variant consistently produces better results
- **Stats dashboard** — Per-variant averages for score, latency, and token count, visualised as bar and radar charts
- **Zero config persistence** — SQLite database, no external DB required
- **Model-agnostic** — Works with any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, etc.)

---

## Tech Stack

| Layer      | Technology                       |
|------------|----------------------------------|
| Frontend   | React 18 + Vite + TypeScript     |
| Charts     | Recharts                         |
| Backend    | FastAPI (Python 3.11+)           |
| ORM        | SQLAlchemy 2 (async)             |
| Database   | SQLite via aiosqlite             |
| HTTP Client| httpx (async)                    |
| Tests      | pytest + pytest-asyncio          |

---

## Architecture

```
llm-prompt-lab/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan
│   │   ├── config.py        # Pydantic settings (reads .env)
│   │   ├── database.py      # SQLAlchemy async engine + session
│   │   ├── models.py        # ORM: Experiment, PromptVariant, Run
│   │   ├── schemas.py       # Pydantic request/response types
│   │   ├── llm_client.py    # Async OpenAI-compat HTTP client
│   │   └── routers/
│   │       ├── experiments.py  # CRUD for experiments & variants
│   │       ├── runs.py         # Execute, score, aggregate stats
│   │       └── models.py       # Proxy model list from LLM server
│   ├── tests/
│   │   └── test_api.py      # 10 async integration tests
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx           # Route tree
    │   ├── api.ts            # Axios wrappers for every endpoint
    │   ├── types.ts          # Shared TypeScript interfaces
    │   ├── components/
    │   │   ├── Layout.tsx        # Sidebar navigation shell
    │   │   ├── NewExperimentModal.tsx
    │   │   ├── NewVariantModal.tsx
    │   │   ├── StarRating.tsx
    │   │   └── StatsCharts.tsx   # Recharts bar + radar
    │   └── pages/
    │       ├── ExperimentsPage.tsx
    │       ├── ExperimentDetailPage.tsx  # Variants / Runs / Stats tabs
    │       └── RunsPage.tsx
    ├── vite.config.ts
    └── .env.example
```

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) (or any OpenAI-compatible server) — optional, needed to actually run prompts

### 1. Clone

```bash
git clone https://github.com/denizsuren/llm-prompt-lab.git
cd llm-prompt-lab
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -e ".[dev]"          # installs all deps including greenlet

cp .env.example .env
# Edit .env if your LLM server runs on a different port/path
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_BASE_URL=http://localhost:8000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable        | Default                         | Description                              |
|-----------------|---------------------------------|------------------------------------------|
| `LLM_BASE_URL`  | `http://localhost:11434/v1`     | Base URL of any OpenAI-compatible server |
| `LLM_API_KEY`   | `ollama`                        | API key (use any string for Ollama)      |
| `DATABASE_URL`  | `sqlite+aiosqlite:///./promptlab.db` | SQLite path                         |
| `CORS_ORIGINS`  | `http://localhost:5173`         | Allowed frontend origins (comma list)    |

### Frontend (`frontend/.env`)

| Variable             | Default                    | Description        |
|----------------------|----------------------------|--------------------|
| `VITE_API_BASE_URL`  | `http://localhost:8000`    | Backend URL        |

---

## Running Locally

### Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

### Start the frontend

```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

### Start Ollama (optional)

```bash
ollama serve
ollama pull llama3.2   # or any model you prefer
```

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

All 10 tests run against an in-memory SQLite database with the LLM client mocked — no external service required.

```
tests/test_api.py::test_health PASSED
tests/test_api.py::test_create_experiment PASSED
tests/test_api.py::test_experiment_name_required PASSED
tests/test_api.py::test_list_experiments PASSED
tests/test_api.py::test_get_experiment_not_found PASSED
tests/test_api.py::test_create_variant PASSED
tests/test_api.py::test_delete_experiment_cascades PASSED
tests/test_api.py::test_run_execution_and_scoring PASSED
tests/test_api.py::test_score_out_of_range PASSED
tests/test_api.py::test_experiment_stats PASSED
```

---

## API Reference

### Experiments

| Method | Path                                    | Description                  |
|--------|-----------------------------------------|------------------------------|
| GET    | `/api/experiments/`                     | List all experiments         |
| POST   | `/api/experiments/`                     | Create experiment            |
| GET    | `/api/experiments/{id}`                 | Get experiment with variants |
| DELETE | `/api/experiments/{id}`                 | Delete (cascades to variants + runs) |
| GET    | `/api/experiments/{id}/variants`        | List variants                |
| POST   | `/api/experiments/{id}/variants`        | Create variant               |
| DELETE | `/api/experiments/{id}/variants/{vid}`  | Delete variant               |

### Runs

| Method | Path                         | Description                     |
|--------|------------------------------|---------------------------------|
| POST   | `/api/runs/`                 | Execute a variant (calls LLM)   |
| GET    | `/api/runs/`                 | List runs (filter by variant/experiment) |
| GET    | `/api/runs/{id}`             | Get single run                  |
| PATCH  | `/api/runs/{id}/score`       | Rate output 1–5                 |
| DELETE | `/api/runs/{id}`             | Delete run                      |
| GET    | `/api/runs/stats/{exp_id}`   | Aggregated stats per variant    |

### Models

| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | `/api/models/` | List models from the LLM endpoint        |

Full interactive docs available at `/docs` when the backend is running.

---

## Design Decisions

- **SQLite over PostgreSQL**: This is a local developer tool. SQLite keeps setup to zero — no credentials, no service to start. The async SQLAlchemy 2 layer means switching to PostgreSQL later requires only a connection string change.
- **OpenAI-compatible API**: Rather than Ollama-specific code, the LLM client targets the `/v1/chat/completions` schema. This works with Ollama, LM Studio, vLLM, and the real OpenAI API with no changes.
- **FastAPI + httpx**: Both are async-native, keeping the backend non-blocking even during long LLM calls.
- **No auth**: Auth genuinely doesn't add value for a single-developer local tool. The CORS setting provides basic access control for the local use case.
- **Star ratings as floats**: Stored as floats to allow future half-star precision or programmatic scoring without a migration.

---

## Possible Future Improvements

- **Prompt templates with variables** — `{{topic}}` placeholders filled at run time
- **Side-by-side diff viewer** — Visual character diff between two variant outputs
- **Automated scoring** — Use a second LLM as evaluator (G-Eval / LLM-as-judge)
- **Export to CSV/JSON** — For further analysis in notebooks
- **Streaming output** — Show token generation in real time
- **Docker Compose** — One-command startup for teams

---

## Screenshots

> Start the app locally and navigate to `http://localhost:5173`.
> Screenshots can be added to the `screenshots/` folder after capturing them.

---

## Author

**Deniz Süren**  
Computer Engineering student at Hacettepe University  
GitHub: [github.com/denizsuren](https://github.com/denizsuren)  
LinkedIn: [linkedin.com/in/denizsuren](https://linkedin.com/in/denizsuren)
