# Product screenshot provenance

These images show the local CounselReflect UI replaying committed evaluation outputs. They do not show a fresh evaluation, a live deployment, or clinical validation.

- `dashboard.png`: web report with the chatbot turn selected and its metric details visible.
- `extension.png`: extension sidebar report in a standalone Vite preview at a supported sidebar width. Chrome runtime is stubbed for rendering; no host-page extraction, messaging, or installed-extension behavior is validated by this image.
- Input: [`cli/samples/sample2.json`](../../cli/samples/sample2.json).
- Results: [`cli/samples/results/sample2_results.json`](../../cli/samples/results/sample2_results.json), recorded February 26, 2026; run metadata names OpenAI / `gpt-4o-mini`, while individual evaluators can use other models or services.
- Selected subset: `empathy_er`, `pair`, and `toxicity`. Other saved predefined and literature results are omitted. Scores are read unchanged and passed through the application's existing result transformer; displayed rounding follows the UI.
- The example contains a deliberately problematic response. Its low toxicity score is not an endorsement of the advice.
- No real API keys are supplied. API metadata responses are local fixtures, narrative generation is disabled with an empty cached summary, and all external requests are blocked. “Connected” reflects fixture state, not a live credential check.
- Source timestamps lack a timezone. The capture treats the timestamp as UTC solely to make rendering deterministic.
- The bottom banner is a capture annotation added before taking the screenshot. It is not part of the shipped product UI.

## Reproduce

Use the repository's existing Node dependencies and a locally installed Google Chrome. From the repository root, run these two local servers in separate terminals:

```bash
npm ci --ignore-scripts
npm run dev -w frontend -- --host 127.0.0.1 --port 5173 --strictPort
```

```bash
cd extension
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
```

Then, from the repository root:

```bash
node scripts/capture_product_screenshots.mjs
```

The script uses isolated browser contexts, restores saved report state, checks the source example's PAIR score and toxicity label, and requires both pages to render without browser errors before saving screenshots. It does not require the backend, model downloads, or paid inference. System fonts are used because external font requests are blocked.
