import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PRODUCTION_AI_URL,
  validateUrl,
  computeConfig,
  writeConfigFile,
} from './generate-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('generate-config: Scenario 1: VERCEL_ENV=preview with a valid Preview URL', () => {
  const previewUrl = 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp';
  const config = computeConfig({
    VERCEL_ENV: 'preview',
    NILEGUIDE_AI_BASE_URL: previewUrl,
  });

  assert.equal(config.environment, 'preview');
  assert.equal(config.aiBaseUrl, previewUrl);
  assert.match(config.generatedScript, /environment:\s*"preview"/);
  assert.match(config.generatedScript, new RegExp(previewUrl));
});

test('generate-config: Scenario 2: VERCEL_ENV=preview with a missing URL — build must fail', () => {
  assert.throws(
    () => {
      computeConfig({
        VERCEL_ENV: 'preview',
        NILEGUIDE_AI_BASE_URL: '',
      });
    },
    {
      message: /NILEGUIDE_AI_BASE_URL is missing or empty/,
    }
  );
});

test('generate-config: Scenario 3: VERCEL_ENV=preview must never resolve to mini-rag-alpha.vercel.app', () => {
  assert.throws(
    () => {
      computeConfig({
        VERCEL_ENV: 'preview',
        NILEGUIDE_AI_BASE_URL: 'https://mini-rag-alpha.vercel.app/api/v1/nlp',
      });
    },
    {
      message: /Preview builds cannot point to the Production AI backend/,
    }
  );
});

test('generate-config: Scenario 4: VERCEL_ENV=production resolves strictly to Production API', () => {
  const config = computeConfig({
    VERCEL_ENV: 'production',
  });

  assert.equal(config.environment, 'production');
  assert.equal(config.aiBaseUrl, PRODUCTION_AI_URL);
  assert.match(config.generatedScript, /environment:\s*"production"/);
});

test('generate-config: Scenario 5: Production configuration rejects the Preview API URL', () => {
  assert.throws(
    () => {
      computeConfig({
        VERCEL_ENV: 'production',
        NILEGUIDE_AI_BASE_URL: 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp',
      });
    },
    {
      message: /Production build rejected: NILEGUIDE_AI_BASE_URL contains a Preview URL/,
    }
  );
});

test('generate-config: Scenario 6: Development configuration preserves local behavior', () => {
  const config = computeConfig({
    VERCEL_ENV: 'development',
  });

  assert.equal(config.environment, 'development');
  assert.equal(config.aiBaseUrl, PRODUCTION_AI_URL);
});

test('generate-config: Scenario 8: Runtime script tag exists in src/index.html <head> before <body>', () => {
  const indexHtmlPath = path.resolve(__dirname, '../src/index.html');
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  const scriptTag = '<script src="/nileguide-config.js"></script>';
  assert.ok(htmlContent.includes(scriptTag), 'index.html must include script tag for nileguide-config.js');

  const headCloseIndex = htmlContent.indexOf('</head>');
  const scriptIndex = htmlContent.indexOf(scriptTag);
  const bodyIndex = htmlContent.indexOf('<body>');

  assert.ok(scriptIndex > -1, 'Script tag present');
  assert.ok(scriptIndex < headCloseIndex, 'Script tag is inside <head>');
  assert.ok(headCloseIndex < bodyIndex, '<head> closes before <body> opens');
});

test('generate-config: Scenario 10: No generated secrets or credentials', () => {
  const config = computeConfig({
    VERCEL_ENV: 'preview',
    NILEGUIDE_AI_BASE_URL: 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp',
  });

  const script = config.generatedScript;
  assert.ok(!script.toLowerCase().includes('secret'), 'Script does not contain secret');
  assert.ok(!script.toLowerCase().includes('token'), 'Script does not contain token');
  assert.ok(!script.toLowerCase().includes('apikey'), 'Script does not contain apikey');
  assert.ok(!script.toLowerCase().includes('bearer'), 'Script does not contain bearer');
});
