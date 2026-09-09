const OpenAI = require('openai');
require('dotenv').config();

/**
 * AI provider: Google Gemini through its OpenAI-compatible endpoint.
 *
 * Gemini speaks the OpenAI wire protocol, so the `openai` SDK is used
 * unchanged -- only the base URL, the model names and the key differ.
 * Free tier, no card: https://aistudio.google.com/apikey
 */

const BASE_URL = process.env.GEMINI_BASE_URL
  || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

/**
 * pgvector's HNSW index tops out at 2000 dimensions and database/init.sql
 * builds one, so Gemini's 3072-dimension default must be narrowed. This value
 * must match the vector(N) column width in the schema.
 */
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);

/**
 * Thrown when an AI feature is used without a configured key. Carries a status
 * so the global error handler in app.js turns it into a 503 rather than a 500.
 */
class AiUnavailableError extends Error {
  constructor() {
    super('AI features are unavailable: GEMINI_API_KEY is not configured.');
    this.name = 'AiUnavailableError';
    this.status = 503;
  }
}

const isAiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Built on first use, not at import time. Constructing the client eagerly meant
 * a missing key threw while `require`-ing this module, taking down the whole
 * API instead of just the AI endpoints.
 */
let client = null;
const getClient = () => {
  if (!isAiEnabled()) throw new AiUnavailableError();
  if (!client) {
    client = new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: BASE_URL });
  }
  return client;
};

const clean = (text) => String(text).replace(/\s+/g, ' ').trim().substring(0, 8000);

/**
 * Generate an embedding vector for text.
 * @param {string} text
 * @returns {Promise<Array<number>>} EMBEDDING_DIMENSIONS-long vector
 */
const generateEmbedding = async (text) => {
  const openai = getClient();
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: clean(text),
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw new Error('Failed to generate embedding', { cause: error });
  }
};

/**
 * Generate article-style content from a prompt.
 * @param {{topic: string, tone?: string, length?: string}} options
 * @returns {Promise<{title: string, body: string}>}
 */
const generateContent = async ({ topic, tone = 'neutral', length = 'medium' }) => {
  const openai = getClient();
  const words = { short: 150, medium: 400, long: 800 }[length] || 400;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a content writer. Reply with strict JSON only, no code fences: ' +
            '{"title": string, "body": string}. The body is markdown.',
        },
        {
          role: 'user',
          content: `Write a ${tone} article of roughly ${words} words about: ${topic}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw);
    if (!parsed.title || !parsed.body) throw new Error('missing title or body');
    return { title: String(parsed.title), body: String(parsed.body) };
  } catch (error) {
    console.error('Error generating content:', error.message);
    throw new Error('Failed to generate content', { cause: error });
  }
};

/**
 * pgvector accepts a bracketed literal, not a JS array.
 */
const formatEmbeddingForDB = (embedding) => `[${embedding.join(',')}]`;

/**
 * Title carries more signal than body, so it is weighted by repetition.
 */
const prepareContentForEmbedding = (title, body) =>
  `${title} ${title} ${body}`.substring(0, 8000);

module.exports = {
  generateEmbedding,
  generateContent,
  formatEmbeddingForDB,
  prepareContentForEmbedding,
  isAiEnabled,
  AiUnavailableError,
  EMBEDDING_DIMENSIONS,
};
