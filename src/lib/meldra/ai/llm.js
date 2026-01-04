/**
 * Meldra AI - LLM Utilities
 *
 * This module provides high-level utilities for working with Large Language Models,
 * including schema generation, data analysis, text processing, and more.
 *
 * @module meldra/ai/llm
 */

import { InvokeLLM } from '../core/integrations';

/**
 * Generate database schema from natural language description
 *
 * @param {string} description - Natural language description of the database
 * @param {Object} options - Generation options
 * @param {string} [options.model='gpt-4o-mini'] - LLM model to use
 * @param {number} [options.temperature=0.7] - Response temperature
 * @returns {Promise<Object>} - Generated schema object
 *
 * @example
 * const schema = await generateDatabaseSchema(
 *   'Create an e-commerce database with products, users, and orders'
 * );
 */
export async function generateDatabaseSchema(description, options = {}) {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7
  } = options;

  const systemPrompt = `You are a database schema design expert. Generate a complete database schema based on the user's description.

Return ONLY a valid JSON object with this exact structure (no additional text, no markdown):
{
  "name": "Schema Name",
  "tables": [
    {
      "id": "table_1",
      "name": "TableName",
      "x": 100,
      "y": 100,
      "columns": [
        {
          "id": "col_1",
          "name": "column_name",
          "type": "VARCHAR",
          "primaryKey": false,
          "nullable": true,
          "unique": false,
          "autoIncrement": false,
          "defaultValue": ""
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "fromTable": "table_1",
      "fromColumn": "col_1",
      "toTable": "table_2",
      "toColumn": "col_2",
      "type": "many-to-one"
    }
  ]
}

Guidelines:
- Always include an 'id' primary key column (INTEGER, PRIMARY KEY, AUTO_INCREMENT) for each table
- Use appropriate data types: VARCHAR, INTEGER, BIGINT, TEXT, TIMESTAMP, BOOLEAN, DECIMAL, etc.
- Add created_at and updated_at TIMESTAMP columns where appropriate
- Create meaningful relationships between tables
- Use standard naming conventions (lowercase, underscores)
- Position tables in a grid layout (increment x by 350, y by 200 for each table)
- Relationship types: "one-to-one", "one-to-many", "many-to-one", "many-to-many"`;

  const result = await InvokeLLM({
    prompt: `${systemPrompt}\n\nUser Request: ${description}`,
    model,
    temperature,
    max_tokens: 3000
  });

  // Parse the LLM response
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from LLM response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Analyze data and provide AI-powered insights
 *
 * @param {Array<Object>} data - Data to analyze
 * @param {string} question - Analysis question
 * @param {Object} options - Analysis options
 * @returns {Promise<string>} - AI analysis response
 *
 * @example
 * const insights = await analyzeData(salesData, 'What are the top selling products?');
 */
export async function analyzeData(data, question, options = {}) {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.5
  } = options;

  const dataStr = JSON.stringify(data.slice(0, 100), null, 2); // Limit to first 100 rows

  const prompt = `Analyze the following data and answer the question.

Data (first 100 rows):
${dataStr}

Question: ${question}

Provide a concise, data-driven answer with specific insights and recommendations.`;

  return await InvokeLLM({
    prompt,
    model,
    temperature,
    max_tokens: 1000
  });
}

/**
 * Generate SQL queries from natural language
 *
 * @param {string} request - Natural language query request
 * @param {Object} schema - Database schema
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Generated SQL query
 *
 * @example
 * const sql = await generateSQL('Get all users who purchased in the last 30 days', schema);
 */
export async function generateSQL(request, schema, options = {}) {
  const {
    model = 'gpt-4o-mini',
    dialect = 'postgresql'
  } = options;

  const schemaStr = JSON.stringify(schema, null, 2);

  const prompt = `Given the following database schema, generate a SQL query for the request.

Database Schema:
${schemaStr}

SQL Dialect: ${dialect}

Request: ${request}

Return ONLY the SQL query, nothing else. No explanations, no markdown, just the raw SQL.`;

  return await InvokeLLM({
    prompt,
    model,
    temperature: 0.3,
    max_tokens: 500
  });
}

/**
 * Summarize long text content
 *
 * @param {string} text - Text to summarize
 * @param {Object} options - Summarization options
 * @param {number} [options.maxLength=150] - Maximum summary length in words
 * @returns {Promise<string>} - Summary
 *
 * @example
 * const summary = await summarizeText(longArticle, { maxLength: 100 });
 */
export async function summarizeText(text, options = {}) {
  const {
    model = 'gpt-4o-mini',
    maxLength = 150
  } = options;

  const prompt = `Summarize the following text in approximately ${maxLength} words or less. Be concise and capture the key points.

Text:
${text}`;

  return await InvokeLLM({
    prompt,
    model,
    temperature: 0.5,
    max_tokens: maxLength * 2
  });
}

/**
 * Extract structured data from unstructured text
 *
 * @param {string} text - Unstructured text
 * @param {Object} schema - Expected data schema
 * @returns {Promise<Object>} - Extracted structured data
 *
 * @example
 * const data = await extractStructuredData(
 *   'John Doe, 30 years old, works at Acme Corp',
 *   { name: 'string', age: 'number', company: 'string' }
 * );
 */
export async function extractStructuredData(text, schema) {
  const schemaStr = JSON.stringify(schema, null, 2);

  const prompt = `Extract structured data from the text according to the schema.

Text:
${text}

Expected Schema:
${schemaStr}

Return ONLY a valid JSON object matching the schema. No additional text.`;

  const result = await InvokeLLM({
    prompt,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 1000
  });

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response');
  }

  return JSON.parse(jsonMatch[0]);
}

export default {
  generateDatabaseSchema,
  analyzeData,
  generateSQL,
  summarizeText,
  extractStructuredData
};
