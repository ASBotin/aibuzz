import OpenAI from 'openai';

const apiKey = process.env.AITUNNEL_API_KEY;
const baseURL = process.env.AITUNNEL_BASE_URL;

export const perplexityClient = new OpenAI({
  apiKey,
  baseURL,
});

export const openaiClient = new OpenAI({
  apiKey,
  baseURL,
});