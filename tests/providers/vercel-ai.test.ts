import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  openaiPrompt, 
  claudePrompt, 
  formatResponse, 
  VercelAIPromptOptions 
} from '../../src/providers/vercel-ai';

// Mock the required modules
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'Test response' }),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(model => model),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(model => model),
}));

// Import the mocked function for assertions
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

describe('Vercel AI Providers', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset mock history before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });
  
  describe('formatResponse', () => {
    it('should format the response correctly', () => {
      const result = formatResponse('Test response');
      expect(result).toEqual({
        provider: 'vercel-ai',
        data: [{ text: 'Test response' }],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        status: 200,
      });
    });
  });
  
  describe('openaiPrompt', () => {
    it('should set API key from options', async () => {
      // Set up test data
      const options: VercelAIPromptOptions = {
        openaiApiKey: 'test-openai-key',
      };
      
      // Call the function
      await openaiPrompt('Test prompt', 'gpt-3.5-turbo', options);
      
      // Assert API key was set
      expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
    });
    
    it('should call the openai provider with the correct model', async () => {
      await openaiPrompt('Test prompt', 'gpt-4', {});
      expect(openai).toHaveBeenCalledWith('gpt-4');
    });
    
    it('should use default model if none provided', async () => {
      await openaiPrompt('Test prompt');
      expect(openai).toHaveBeenCalledWith('gpt-3.5-turbo');
    });
    
    it('should call generateText with the correct parameters', async () => {
      const options = {
        temperature: 0.5,
        maxTokens: 100,
        system: 'System prompt',
      };
      
      await openaiPrompt('User prompt', 'gpt-4', options);
      
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'User prompt',
        temperature: 0.5,
        maxTokens: 100,
        system: 'System prompt',
      }));
    });
    
    it('should handle errors correctly', async () => {
      vi.mocked(generateText).mockRejectedValueOnce(new Error('Test error'));
      await expect(openaiPrompt('Test prompt')).rejects.toThrow('Test error');
    });
  });
  
  describe('claudePrompt', () => {
    it('should set API key from options', async () => {
      // Set up test data
      const options: VercelAIPromptOptions = {
        anthropicApiKey: 'test-anthropic-key',
      };
      
      // Call the function
      await claudePrompt('Test prompt', 'claude-3-sonnet-20240229', options);
      
      // Assert API key was set
      expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
    });
    
    it('should call the anthropic provider with the correct model', async () => {
      await claudePrompt('Test prompt', 'claude-3-opus-20240229', {});
      expect(anthropic).toHaveBeenCalledWith('claude-3-opus-20240229');
    });
    
    it('should use default model if none provided', async () => {
      await claudePrompt('Test prompt');
      expect(anthropic).toHaveBeenCalledWith('claude-3-sonnet-20240229');
    });
    
    it('should call generateText with the correct parameters', async () => {
      const options = {
        temperature: 0.3,
        maxTokens: 200,
        system: 'System prompt',
      };
      
      await claudePrompt('User prompt', 'claude-3-opus-20240229', options);
      
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'User prompt',
        temperature: 0.3,
        maxTokens: 200,
        system: 'System prompt',
      }));
    });
    
    it('should handle errors correctly', async () => {
      vi.mocked(generateText).mockRejectedValueOnce(new Error('Test error'));
      await expect(claudePrompt('Test prompt')).rejects.toThrow('Test error');
    });
  });
});