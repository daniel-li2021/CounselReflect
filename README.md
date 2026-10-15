# CounselReflect

**An LLM evaluation platform for inspecting conversational model outputs.** CounselReflect brings predefined evaluators, literature-derived rubrics, and custom criteria into a web dashboard, Chrome extension, and batch CLI. Its current evaluation domain is counseling-style and emotional-support dialogue.

The workflow is **transcript → criteria → evaluation → turn-level evidence**: inspect scores, labels, rationales, and the text they refer to, then refine evaluation criteria. These are automated research signals. They do not establish clinical effectiveness, diagnostic validity, or that a response is safe to use in care.

## See the platform

### Web dashboard

![CounselReflect dashboard showing a saved evaluation example with metric results and turn-level inspection](docs/screenshots/dashboard.png)

### Chrome extension

![CounselReflect extension report interface showing the same saved evaluation example](docs/screenshots/extension.png)

Both screenshots render the actual local UI using a subset of the [saved sample2 results](cli/samples/results/sample2_results.json). They are offline replays, not fresh model runs. The extension image shows its sidebar UI in a standalone local preview; host-page extraction is not demonstrated. [Capture sources and reproduction notes](docs/screenshots/README.md).

## What you can evaluate

- **Predefined evaluators:** inspect reflection, empathy, emotion, support strategies, toxicity, and factuality using model-specific outputs. Availability depends on the evaluator's models, credentials, and runtime.
- **Literature-derived rubrics:** score dialogue against criteria with source references. A research citation supports the rubric's origin; it does not validate the automated judge.
- **Custom criteria:** draft and refine metrics, review example outputs, and lock a profile for reuse.
- **Evidence review:** inspect turn-level results and available explanations alongside the transcript; preserve metric and provider/model context in the report.
- **Multiple entry points:** use the web dashboard, the extension's ChatGPT/Claude/Gemini integrations, or the CLI for batch evaluation.

## Architecture overview

```mermaid
flowchart TD
    W[Web dashboard · React / TypeScript] --> S[Shared UI, state, API services and result transformation]
    X[Chrome extension · sidebar UI] --> S
    H[ChatGPT / Claude / Gemini page] --> C[Content script · transcript extraction]
    C <-->|Chrome runtime messaging| X
    S --> A[FastAPI backend]
    CLI[Python batch CLI] --> A
    A --> P[Predefined evaluator registry]
    A --> L[Literature rubric evaluation]
    A --> U[Custom metric profiles]
    L --> R[Provider adapters]
    U --> R
    P --> M[Local / hosted models and external services]
    P --> R
    R --> V[OpenAI / Gemini / Claude / Ollama]
    A --> O[Structured results · conversation / utterance / segment]
    O --> S
    O --> CLI
```

The [shared package](shared/README.md) keeps the dashboard and extension aligned. The [API](api/main.py) exposes `/predefined_metrics`, `/literature`, `/customize_pipeline`, `/models`, `/summary`, and `/share_import`; the [provider registry](api/providers/README.md) separates judge providers from evaluator implementations. Optional generated summaries interpret results and require separate scrutiny. Depending on the selected evaluator and provider, transcript text can be sent to external services.

## Evaluation examples and evidence

These examples describe **committed artifacts**, not independently reproduced benchmarks or platform-wide accuracy. Model outputs, class probabilities, and rubric scores have different meanings and should not be combined into a clinical quality score.

| Example | Saved evidence | What it shows and its limits |
| --- | --- | --- |
| Inspect a problematic chatbot response | [Input](cli/samples/sample2.json) and [results](cli/samples/results/sample2_results.json), recorded February 26, 2026, with provider/model metadata `openai` / `gpt-4o-mini` | The response has PAIR reflection score **≈0.00029/1** while the local toxicity evaluator labels it **Safe**. Different evaluators detect different properties: a low toxicity signal does not establish safe advice. This is one saved example, not an accuracy estimate. Provider metadata identifies the run configuration; individual evaluators may use other models/services. |
| Check factuality evaluator errors | [Machine-readable results](models/factscore/evaluation/fact_evaluation_complete_results.json) and [report](models/factscore/docs/FACT_EVALUATION_REPORT.md) | At threshold **0.5**, saved results report **76.67% accuracy** and **85.42% F1** on **493/549** examples; the report attributes 56 exclusions to missing ground truth. The confusion matrix includes **110 false positives** and **5 false negatives**. This historical factuality experiment does not validate medical advice or the current deployed evaluator. |
| Inspect class-level performance | [Support-strategy classification report](models/emotional_support_strategy/MODEL_REPORT.md) | The report contains **2,895** labeled examples, **0.57 accuracy**, and **0.50 macro F1**. Question F1 is **0.81**, while reflection-of-feelings F1 is **0.27**. This exposes uneven performance; the report alone does not establish split provenance, deployed-checkpoint identity, or generalization to new conversations. |

For evaluator implementation and extension points, see the [evaluator guide](api/evaluators/README.md). Any release claim needs a specified dataset, split, evaluator/checkpoint and judge configuration, error analysis, and reproducible run evidence. No clinical outcome study is established by the artifacts linked here.

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python**: Version 3.9 or higher (see `api/pyproject.toml`)
- **Node.js**: 22.12+ or a compatible newer LTS release (includes npm)
- **Make** (optional, for using the Makefile commands)

## 🛠️ Installation & Setup

The project includes automated scripts to set up the development environment for all modules.

### Quick Setup

In the root directory, run:

```bash
make setup
# OR if you don't have make:
./setup.sh
```

This script will:

1.  Check for required tools (Python, Node.js).
2.  Create virtual environments for Python modules (root, api, cli).
3.  Install Python dependencies.
4.  Install Node.js dependencies for the frontend and extension.

### Individual Module Installation (Manual)

If you prefer to install modules individually:

- **API**: `cd api && python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`
- **CLI**: `cd cli && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- **Frontend**: `cd frontend && npm install`
- **Extension**: `cd extension && npm install`

## 💻 Usage

You can use `make` commands to run different parts of the application.

### Backend API

Starts the FastAPI server (default: http://localhost:8000).

```bash
make run-api
```

### Web Frontend

Starts the development server for the web dashboard.

```bash
make run-frontend
```

### CLI Tool

Runs the command-line interface.

```bash
make run-cli
```

### Chrome Extension

To use the **CounselReflect** extension:

1.  **Build the extension**:

    ```bash
    make build-extension
    ```

    (Or `cd extension && npm run build`)

2.  **Load in Chrome**:

    - Open Chrome and navigate to `chrome://extensions/`.
    - Enable **Developer mode** (top right toggle).
    - Click **Load unpacked**.
    - Select the `extension/dist` directory.

3.  **Navigate to an LLM**: Go to [Gemini](https://gemini.google.com), [ChatGPT](https://chatgpt.com), or [Claude](https://claude.ai) to see the sidebar in action.

## 📂 Project Structure

```
├── api/            # Python FastAPI backend
├── cli/            # Python Command Line Interface
├── extension/      # Chrome Extension (React/TypeScript)
├── frontend/       # Web Dashboard (React/TypeScript)
├── shared/         # Shared React components, state, types, and API services
├── models/         # Evaluator training, experiments, reports, and upstream components
├── docs/           # Product screenshots and capture provenance
├── setup.sh        # Main setup script
├── Makefile        # Command shortcuts
└── README.md       # Project documentation
```
## 📜 License

The code written by the CounselReflect team is released under the [MIT License](LICENSE).

MIT covers **only our own code**. This repository also bundles, wraps, or depends on third-party components (vendored libraries, model code, pretrained and fine-tuned models, and the datasets they were trained or evaluated on, mainly under `models/` and `api/evaluators/lib/`). Each of those keeps its own license or terms, which take precedence for the corresponding parts. Before using any third-party component or any model built on third-party data, you are responsible for checking and complying with the upstream terms, especially for commercial use.

## LLM Assistance Disclosure

This repository was developed with assistance from large language models (LLMs), including support for code drafting, refactoring, and debugging. LLM assistance does not establish evaluator accuracy or clinical validity; the evaluation artifacts above define the evidence available in this repository.
