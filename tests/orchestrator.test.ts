import { describe, it, expect } from 'vitest';
import * as orchestrator from '../src/orchestrator';

describe('Orchestrator', () => {
  it('should export Vercel AI SDK functions', () => {
    // Check that the Vercel AI SDK functions are exported
    expect(orchestrator.openaiPrompt).toBeDefined();
    expect(orchestrator.openaiPromptStreaming).toBeDefined();
    expect(orchestrator.claudePrompt).toBeDefined();
    expect(orchestrator.claudePromptStreaming).toBeDefined();
    
    // Verify that they are functions
    expect(typeof orchestrator.openaiPrompt).toBe('function');
    expect(typeof orchestrator.openaiPromptStreaming).toBe('function');
    expect(typeof orchestrator.claudePrompt).toBe('function');
    expect(typeof orchestrator.claudePromptStreaming).toBe('function');
  });
  
  it('should export cross-llm functions', () => {
    // Check that the cross-llm functions are exported
    expect(orchestrator.systemPrompt).toBeDefined();
    expect(orchestrator.systemPromptStreaming).toBeDefined();
    
    // Verify that they are functions
    expect(typeof orchestrator.systemPrompt).toBe('function');
    expect(typeof orchestrator.systemPromptStreaming).toBe('function');
  });
});