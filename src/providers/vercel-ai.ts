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
  modelOrOptions: string | VercelAIPromptOptions = "gpt-4o",
  options: VercelAIPromptOptions = {},
): Promise<PromptResponse> => {
  // Handle different parameter combinations
  let modelName: string;
  let opts: VercelAIPromptOptions;
  
  if (typeof modelOrOptions === "string") {
    modelName = modelOrOptions;
    opts = options || {};
  } else {
    modelName = modelOrOptions.model || "gpt-4o";
    opts = modelOrOptions;
  }
  
  // Set API key in environment if provided in options
  if (opts.openaiApiKey || opts.apiKey) {
    process.env.OPENAI_API_KEY = opts.openaiApiKey || opts.apiKey;
  }

  try {
    // Combine all options
    const temperature = opts.temperature || 0.7;
    
    console.log(`Calling OpenAI with model: ${modelName}, temperature: ${temperature}`);
    
    const { text } = await generateText({
      model: openai(modelName),
      prompt,
      system: opts.system,
      temperature,
      maxTokens: opts.maxTokens,
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
  modelOrOptions: string | VercelAIPromptOptions = "claude-3-sonnet-20240229",
  options: VercelAIPromptOptions = {},
): Promise<PromptResponse> => {
  // Handle different parameter combinations
  let modelName: string;
  let opts: VercelAIPromptOptions;
  
  if (typeof modelOrOptions === "string") {
    modelName = modelOrOptions;
    opts = options || {};
  } else {
    modelName = modelOrOptions.model || "claude-3-sonnet-20240229";
    opts = modelOrOptions;
  }
  
  // Set API key in environment if provided in options
  if (opts.anthropicApiKey || opts.apiKey) {
    process.env.ANTHROPIC_API_KEY = opts.anthropicApiKey || opts.apiKey;
  }

  try {
    // Combine all options
    const temperature = opts.temperature || 0.7;
    
    console.log(`Calling Anthropic with model: ${modelName}, temperature: ${temperature}`);
    
    const { text } = await generateText({
      model: anthropic(modelName),
      prompt,
      system: opts.system,
      temperature,
      maxTokens: opts.maxTokens,
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
