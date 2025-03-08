import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface PromptResponse {
  provider: string;
  data: Array<{ text: string }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: number;
}

export interface VercelAIPromptOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  system?: string;
  model?: string;
}

// Convert to format compatible with our PromptResponse
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

// Streaming versions for real-time generation
// We use the regular generateText since generateTextStream isn't available
// and implement manual streaming from the response

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export const openaiPromptStreaming = async (
  prompt: string,
  modelOrOptions: string | VercelAIPromptOptions = "gpt-4o",
  options: VercelAIPromptOptions & StreamCallbacks = {},
): Promise<PromptResponse> => {
  // Handle different parameter combinations
  let modelName: string;
  let opts: VercelAIPromptOptions & StreamCallbacks;
  
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
    
    console.log(`🟢 Streaming from OpenAI with model: ${modelName}, temperature: ${temperature}`);
    
    // Use the Vercel AI SDK to get a non-streamed completion
    const { text } = await generateText({
      model: openai(modelName),
      prompt,
      system: opts.system,
      temperature,
      maxTokens: opts.maxTokens,
    });

    // Use a letter-by-letter approach for streaming
    let fullText = "";
    
    // Stream character by character without any delay to avoid duplication issues
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Call the onToken callback if provided
      if (opts.onToken) {
        opts.onToken(char);
      }
      fullText += char;
    }
    
    // Call the onComplete callback if provided
    if (opts.onComplete) {
      opts.onComplete(fullText.trim());
    }

    return formatResponse(fullText.trim());
  } catch (error) {
    console.error("Error streaming from OpenAI via Vercel AI SDK:", error);
    if (opts.onError) {
      opts.onError(error as Error);
    }
    throw error;
  }
};

export const claudePromptStreaming = async (
  prompt: string,
  modelOrOptions: string | VercelAIPromptOptions = "claude-3-sonnet-20240229",
  options: VercelAIPromptOptions & StreamCallbacks = {},
): Promise<PromptResponse> => {
  // Handle different parameter combinations
  let modelName: string;
  let opts: VercelAIPromptOptions & StreamCallbacks;
  
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
    
    console.log(`🟣 Streaming from Anthropic with model: ${modelName}, temperature: ${temperature}`);
    
    // Use the Vercel AI SDK to get a non-streamed completion
    const { text } = await generateText({
      model: anthropic(modelName),
      prompt,
      system: opts.system,
      temperature,
      maxTokens: opts.maxTokens,
    });

    // Use a letter-by-letter approach for streaming
    let fullText = "";
    
    // Stream character by character without any delay to avoid duplication issues
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Call the onToken callback if provided
      if (opts.onToken) {
        opts.onToken(char);
      }
      fullText += char;
    }
    
    // Call the onComplete callback if provided
    if (opts.onComplete) {
      opts.onComplete(fullText.trim());
    }

    return formatResponse(fullText.trim());
  } catch (error) {
    console.error("Error streaming from Anthropic via Vercel AI SDK:", error);
    if (opts.onError) {
      opts.onError(error as Error);
    }
    throw error;
  }
};
