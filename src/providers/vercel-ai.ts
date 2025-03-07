import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { PromptResponse } from "cross-llm";

export interface VercelAIPromptOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  system?: string;
}

// Convert to format compatible with cross-llm PromptResponse
export const formatResponse = (result: string): PromptResponse => {
  return {
    provider: "vercel-ai",
    data: [{ text: result }],
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    status: 200,
  };
};

// OpenAI implementation using Vercel AI SDK
export const openaiPrompt = async (
  prompt: string,
  modelName = "gpt-3.5-turbo",
  options: VercelAIPromptOptions = {},
): Promise<PromptResponse> => {
  // Set API key in environment if provided in options
  if (options.openaiApiKey || options.apiKey) {
    process.env.OPENAI_API_KEY = options.openaiApiKey || options.apiKey;
  }

  try {
    const { text } = await generateText({
      model: openai(modelName),
      prompt,
      system: options.system,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens,
    });

    return formatResponse(text);
  } catch (error) {
    console.error("Error calling OpenAI via Vercel AI SDK:", error);
    throw error;
  }
};

// Anthropic Claude implementation using Vercel AI SDK
export const claudePrompt = async (
  prompt: string,
  modelName = "claude-3-sonnet-20240229",
  options: VercelAIPromptOptions = {},
): Promise<PromptResponse> => {
  // Set API key in environment if provided in options
  if (options.anthropicApiKey || options.apiKey) {
    process.env.ANTHROPIC_API_KEY = options.anthropicApiKey || options.apiKey;
  }

  try {
    const { text } = await generateText({
      model: anthropic(modelName),
      prompt,
      system: options.system,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens,
    });

    return formatResponse(text);
  } catch (error) {
    console.error("Error calling Anthropic Claude via Vercel AI SDK:", error);
    throw error;
  }
};

// Streaming versions - not implemented for synchronous execution
export const openaiPromptStreaming = openaiPrompt;
export const claudePromptStreaming = claudePrompt;
