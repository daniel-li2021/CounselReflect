// Offline UI capture: render committed outputs; never send an evaluation request.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const saved = readJson('cli/samples/results/sample2_results.json');
const transcript = readJson('cli/samples/sample2.json');
const timestamp = Date.parse(`${saved.timestamp}Z`); // Fixed display clock for the capture only.
const definitions = [
  { name: 'empathy_er', label: 'Empathy (Emotional Reaction)', category: 'Empathy', target: 'therapist' },
  { name: 'pair', label: 'PAIR Reflection Scorer', category: 'Communication', target: 'therapist' },
  { name: 'toxicity', label: 'Toxicity', category: 'Safety', target: 'both' },
];
const metricNames = definitions.map((metric) => metric.name);
const response = {
  results: Object.fromEntries(metricNames.map((name) => [name, saved.evaluator_results.results[name]])),
  status: 'success', timestamp,
};
assert.equal(response.results.pair.per_utterance[1].metrics.pair.value, 0.0002861774410121143);
assert.equal(response.results.toxicity.per_utterance[1].metrics.is_toxic.label, 'Safe');
const conversation = {
  id: 'saved-evaluation-example', title: 'Saved evaluation example',
  messages: transcript.conversation.map((turn, index) => ({
    id: `msg-${index}`, role: turn.speaker === 'Therapist' ? 'Chatbot' : 'Client', content: turn.text,
  })),
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [surface, port, width, height] of [
    ['dashboard', 5173, 1440, 1250], ['extension', 5174, 760, 1400],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light' });
    const errors = [];
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    await context.addInitScript(() => {
      // Standalone sidebar preview has no host tab. This stub supplies no transcript or scores.
      window.chrome = { runtime: {
        onMessage: { addListener() {}, removeListener() {} },
        sendMessage(_message, callback) { callback?.({}); },
      } };
    });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      let json;
      if (url.pathname === '/api/access/status') json = { required: false };
      else if (url.pathname === '/api/models/server-keys-status') json = { openai: true };
      else if (url.pathname === '/api/models') json = {
        providers: { openai: [{ id: saved.model, name: saved.model, provider: saved.provider }] }, total_models: 1,
      };
      else if (url.pathname === '/api/predefined_metrics/metrics') json = { metrics: definitions, total: definitions.length, by_category: {} };
      else if (url.pathname === '/api/literature/metrics') json = { metrics: [], total: 0 };
      else return route.fulfill({ status: 503, json: { detail: 'Disabled in offline screenshot capture' } });
      return route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:${port}/${surface === 'dashboard' ? 'intro' : 'sidebar.html'}`);
    await page.evaluate(async ({ root, response, conversation, saved, timestamp, definitions, metricNames }) => {
      const { transformStandardizedResponse } = await import(`/@fs${root}/shared/src/services/transformers/evaluationTransformer.ts`);
      const results = transformStandardizedResponse(response, conversation.messages.length);
      sessionStorage.setItem('conversation', JSON.stringify(conversation));
      sessionStorage.setItem('counselreflectEvaluationSnapshot', JSON.stringify({
        version: 1, conversationId: conversation.id, conversationMessageCount: conversation.messages.length,
        status: 'Complete', results, savedAt: timestamp,
        runMetadata: {
          metricNames, metricLabelMap: Object.fromEntries(definitions.map((m) => [m.name, m.label])),
          selectedMetricCount: metricNames.length, provider: saved.provider, model: saved.model,
          metricGroups: { predefined: metricNames, literature: [], custom: [] }, savedAt: timestamp,
        },
      }));
      sessionStorage.setItem('counselreflectMetricsState', JSON.stringify({
        version: 1, selectedPredefinedMetrics: definitions, selectedLiteratureMetrics: [],
        customizedMetrics: [], selectedCustomizedMetrics: [], lockedProfile: null,
      }));
      localStorage.setItem('selectedProvider', saved.provider);
      localStorage.setItem('selectedModel', saved.model);
      localStorage.setItem('counselreflectUserConsentAccepted', 'true');
      // This explanatory capture note is authored text, not a generated model summary.
      localStorage.setItem(`counselreflect_summary_${timestamp}`, JSON.stringify({
        overall_performance: 'Offline replay of saved sample2 results. Narrative generation is disabled for this capture.',
        strengths: [], areas_for_improvement: [], key_insights: [],
      }));
    }, { root, response, conversation, saved, timestamp, definitions, metricNames });
    await page.goto(`http://127.0.0.1:${port}/${surface === 'dashboard' ? 'results' : 'sidebar.html'}`);

    if (surface === 'dashboard') await page.getByText('Saved evaluation example', { exact: true }).first().waitFor();
    await page.getByRole('combobox').filter({ has: page.locator('option[value="pair"]') }).selectOption('pair');
    if (surface === 'dashboard') {
      await page.getByRole('row').filter({ hasText: 'Chatbot' }).click();
      await page.locator('#results-turns').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -85));
    }
    if (surface === 'extension') await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector('main')?.scrollTo(0, 0);
    });
    await page.evaluate(() => {
      const banner = document.createElement('div');
      banner.textContent = 'OFFLINE REPLAY · Saved sample2 results · No live evaluation';
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:9px;text-align:center;background:#12304c;color:white;font:13px sans-serif';
      document.body.append(banner);
    });
    // Let fonts, charts and CSS entrance animations settle before capture.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    assert.deepEqual(errors, [], `${surface} browser errors`);
    mkdirSync(resolve(root, 'docs/screenshots'), { recursive: true });
    await page.screenshot({ path: resolve(root, `docs/screenshots/${surface}.png`), animations: 'disabled' });
    console.log(`${surface}: captured saved results with no browser errors`);
    await context.close();
  }
} finally {
  await browser.close();
}
