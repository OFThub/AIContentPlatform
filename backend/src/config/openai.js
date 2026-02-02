const OpenAI = require('openai');
require('dotenv').config();

/**
 * OpenAI Service for AI-Powered Features
 * 
 * Bu serviste:
 * - Text embedding generation (semantic search için)
 * - Content similarity calculation
 * - Semantic search queries
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text
 * 
 * OpenAI'nin ada-002 modeli:
 * - 1536 dimensional vector
 * - Cost-effective
 * - Semantic meaning'i yakalıyor
 * 
 * @param {string} text - Text to embed
 * @returns {Array<number>} - 1536-dimensional vector
 */
const generateEmbedding = async (text) => {
  try {
    // Clean and prepare text
    const cleanText = text
      .replace(/\s+/g, ' ') // Multiple spaces -> single space
      .trim()
      .substring(0, 8000); // OpenAI limit
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: cleanText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
};

/**
 * Generate embeddings for multiple texts (batch)
 * More efficient for bulk operations
 */
const generateEmbeddingsBatch = async (texts) => {
  try {
    const cleanTexts = texts.map(text => 
      text.replace(/\s+/g, ' ').trim().substring(0, 8000)
    );
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: cleanTexts,
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw new Error('Failed to generate embeddings batch');
  }
};

/**
 * Calculate cosine similarity between two vectors
 * Used for finding similar content
 * 
 * @param {Array<number>} vec1 
 * @param {Array<number>} vec2 
 * @returns {number} Similarity score (0-1)
 */
const cosineSimilarity = (vec1, vec2) => {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Format embedding for PostgreSQL
 * PostgreSQL pgvector expects array format
 */
const formatEmbeddingForDB = (embedding) => {
  return `[${embedding.join(',').toString()}]`;
};

/**
 * Prepare content for embedding
 * Combines title and body with weights
 */
const prepareContentForEmbedding = (title, body) => {
  // Title is more important, repeat it
  return `${title} ${title} ${body}`.substring(0, 8000);
};

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  formatEmbeddingForDB,
  prepareContentForEmbedding
};