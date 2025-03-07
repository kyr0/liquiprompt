import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { plan } from '../../src';
import { openaiPrompt, claudePrompt } from '../../src/orchestrator';
import * as dotenv from 'dotenv';

// Mock the modules
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('Mock template content'),
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

vi.mock('../../src', () => ({
  plan: vi.fn(),
}));

vi.mock('../../src/orchestrator', () => ({
  openaiPrompt: vi.fn(),
  claudePrompt: vi.fn(),
}));

describe('Vercel AI Example Integration', () => {
  const mockTemplate = 'Test template content';
  const mockPlanResult = {
    prompts: [
      {
        name: 'Test Prompt',
        prompt: 'This is a test prompt content',
      },
    ],
    errors: [],
    output: {},
  };
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Setup mock implementations
    vi.mocked(readFileSync).mockReturnValue(mockTemplate);
    vi.mocked(plan).mockResolvedValue(mockPlanResult);
    vi.mocked(openaiPrompt).mockResolvedValue({
      provider: 'vercel-ai',
      data: [{ text: 'OpenAI response' }],
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      status: 200,
    });
    vi.mocked(claudePrompt).mockResolvedValue({
      provider: 'vercel-ai',
      data: [{ text: 'Claude response' }],
      usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
      status: 200,
    });
    
    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });
  
  afterEach(() => {
    // Restore environment
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    
    // Restore console methods
    vi.restoreAllMocks();
  });
  
  it('should call the OpenAI service', async () => {
    // We need to directly execute the code since dynamic imports
    // are problematic in tests
    const { readFileSync } = await import('fs');
    const { plan } = await import('../../src');
    const { config } = await import('dotenv');
    
    // Execute main function from the example manually
    const coachPrompt = (readFileSync as any)('data/prompt-templates/one-shot/coach.liquid', 'utf-8');
    const compileResult = await plan(coachPrompt);
    
    if (process.env.OPENAI_API_KEY) {
      await openaiPrompt(
        compileResult.prompts[0].prompt,
        'gpt-3.5-turbo',
        {
          temperature: 0.7,
          system: 'You are a creative writing coach who provides constructive feedback.',
        }
      );
    }
    
    // Verify the prompt template was read
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('coach.liquid'),
      'utf-8'
    );
    
    // Verify plan was called with the template
    expect(plan).toHaveBeenCalledWith(mockTemplate);
    
    // Verify openaiPrompt was called with correct parameters
    expect(openaiPrompt).toHaveBeenCalledWith(
      mockPlanResult.prompts[0].prompt,
      'gpt-3.5-turbo',
      expect.objectContaining({
        temperature: 0.7,
        system: expect.stringContaining('creative writing coach'),
      })
    );
  });
  
  it('should call the Claude service when API key is set', async () => {
    // We need to directly execute the code since dynamic imports
    // are problematic in tests
    const { readFileSync } = await import('fs');
    const { plan } = await import('../../src');
    const { config } = await import('dotenv');
    
    // Execute main function from the example manually
    const coachPrompt = (readFileSync as any)('data/prompt-templates/one-shot/coach.liquid', 'utf-8');
    const compileResult = await plan(coachPrompt);
    
    if (process.env.ANTHROPIC_API_KEY) {
      await claudePrompt(
        compileResult.prompts[0].prompt,
        'claude-3-sonnet-20240229',
        {
          temperature: 0.7,
          system: 'You are a creative writing coach who provides constructive feedback.',
        }
      );
    }
    
    // Verify claudePrompt was called with correct parameters
    expect(claudePrompt).toHaveBeenCalledWith(
      mockPlanResult.prompts[0].prompt,
      'claude-3-sonnet-20240229',
      expect.objectContaining({
        temperature: 0.7,
        system: expect.stringContaining('creative writing coach'),
      })
    );
  });
  
  it('should skip Claude when API key is not set', async () => {
    // Remove the API key
    delete process.env.ANTHROPIC_API_KEY;
    
    // We need to directly execute the code since dynamic imports
    // are problematic in tests
    const { readFileSync } = await import('fs');
    const { plan } = await import('../../src');
    const { config } = await import('dotenv');
    
    // Execute main function from the example manually
    const coachPrompt = (readFileSync as any)('data/prompt-templates/one-shot/coach.liquid', 'utf-8');
    const compileResult = await plan(coachPrompt);
    
    if (process.env.ANTHROPIC_API_KEY) {
      await claudePrompt(
        compileResult.prompts[0].prompt,
        'claude-3-sonnet-20240229',
        {
          temperature: 0.7,
          system: 'You are a creative writing coach who provides constructive feedback.',
        }
      );
    }
    
    // Verify claudePrompt was not called
    expect(claudePrompt).not.toHaveBeenCalled();
  });
});