const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = '';
const openai = require('../src/config/openai');

test('formatEmbeddingForDB produces a pgvector literal', () => {
  assert.equal(openai.formatEmbeddingForDB([0.1, -0.2, 0.3]), '[0.1,-0.2,0.3]');
});

test('prepareContentForEmbedding weights the title and caps length', () => {
  const out = openai.prepareContentForEmbedding('Title', 'Body');
  assert.equal(out, 'Title Title Body');
  assert.ok(openai.prepareContentForEmbedding('x'.repeat(9000), 'y').length <= 8000);
});

test('embedding width stays within the pgvector HNSW limit of 2000', () => {
  // The schema builds an HNSW index, which refuses more than 2000 dimensions.
  assert.ok(openai.EMBEDDING_DIMENSIONS <= 2000);
});

test('AI is reported unavailable when no key is configured', () => {
  assert.equal(openai.isAiEnabled(), false);
});

test('generateEmbedding fails with a 503, not a crash, when unconfigured', async () => {
  // Regression: the client used to be constructed at import time, so a missing
  // key took down the whole process rather than just the AI endpoints.
  await assert.rejects(() => openai.generateEmbedding('hello'), (err) => {
    assert.equal(err.status, 503);
    return true;
  });
});

test('generateContent fails with a 503 when unconfigured', async () => {
  await assert.rejects(() => openai.generateContent({ topic: 'x' }), (err) => {
    assert.equal(err.status, 503);
    return true;
  });
});
