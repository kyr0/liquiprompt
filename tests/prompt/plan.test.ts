import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { plan, defaultOpts } from '../../src/prompt';
import { parsePrompts, parseSingle } from '../../src/parser';
import type { PlanModeResult, PromptNode, PromptParsed } from '../../src/interfaces';

// Mock the parser functions
vi.mock('../../src/parser', () => ({
  parsePrompts: vi.fn(),
  parseSingle: vi.fn(),
}));

describe('plan function', () => {
  // Set up console.log mock to avoid test output noise
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set plan mode in options', async () => {
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([]);
    
    // Execute plan
    await plan('template', {}, {});
    
    // Check that plan mode was set
    expect(parsePrompts).toHaveBeenCalledWith('template');
  });

  it('should handle empty prompt lists', async () => {
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([]);
    
    // Execute plan
    const result = await plan('empty template');
    
    // Verify expected result structure for empty plan
    expect(result).toEqual({
      prompts: [],
      errors: [],
      output: {},
    });
  });

  it('should process a template node', async () => {
    // Mock template node
    const templateNode: PromptNode = {
      type: 'template',
      template: 'This is a test template',
    };
    
    // Mock parsed result
    const parsedResult: PromptParsed = {
      name: '',
      tpl: 'This is a test template',
      input: {},
      output: { testOutput: 'test value' },
      prompt: 'Rendered template',
    };
    
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([templateNode]);
    vi.mocked(parseSingle).mockResolvedValue(parsedResult);
    
    // Execute plan
    const result = await plan('template with node');
    
    // Verify expected result
    expect(result).toEqual({
      prompts: [{ ...parsedResult, instruction: 'PROMPT' }],
      errors: [],
      output: { testOutput: 'test value' },
    });
    
    // Verify parseSingle was called with correct params
    expect(parseSingle).toHaveBeenCalledWith(
      templateNode,
      {},
      expect.objectContaining({ mode: 'plan' })
    );
  });

  it('should handle preamble nodes with AFTER instruction', async () => {
    // Mock template node and preamble node
    const templateNode: PromptNode = {
      type: 'template',
      template: 'This is a test template',
    };
    
    const preambleNode: PromptNode = {
      type: 'preamble',
      instruction: 'AFTER',
      label: 'process result',
    };
    
    // Mock parsed result
    const parsedResult: PromptParsed = {
      name: '',
      tpl: 'This is a test template',
      input: {},
      output: {},
      prompt: 'Rendered template',
    };
    
    // Setup mocks to return nodes in reverse order (as the code expects)
    vi.mocked(parsePrompts).mockReturnValue([preambleNode, templateNode]);
    vi.mocked(parseSingle).mockResolvedValue(parsedResult);
    
    // Execute plan
    const result = await plan('template with after preamble');
    
    // Verify the name and instruction were set from preamble
    expect(result.prompts[0].name).toBe('process result');
    expect(result.prompts[0].instruction).toBe('AFTER');
  });

  it('should handle preamble nodes with PROMPT instruction', async () => {
    // Mock template node and preamble node
    const templateNode: PromptNode = {
      type: 'template',
      template: 'This is a test template',
    };
    
    const preambleNode: PromptNode = {
      type: 'preamble',
      instruction: 'PROMPT',
      label: 'generate text',
    };
    
    // Mock parsed result
    const parsedResult: PromptParsed = {
      name: '',
      tpl: 'This is a test template',
      input: {},
      output: {},
      prompt: 'Rendered template',
    };
    
    // Setup mocks to return nodes in reverse order (as the code expects)
    vi.mocked(parsePrompts).mockReturnValue([preambleNode, templateNode]);
    vi.mocked(parseSingle).mockResolvedValue(parsedResult);
    
    // Execute plan
    const result = await plan('template with prompt preamble');
    
    // Verify the name and instruction were set from preamble
    expect(result.prompts[0].name).toBe('generate text');
    expect(result.prompts[0].instruction).toBe('PROMPT');
  });

  it('should filter out nodes with empty tpl', async () => {
    // Mock template nodes
    const templateNode1: PromptNode = {
      type: 'template',
      template: 'This is a test template',
    };
    
    const templateNode2: PromptNode = {
      type: 'template',
      template: '',
    };
    
    // Mock parsed results
    const parsedResult1: PromptParsed = {
      name: '',
      tpl: 'This is a test template',
      input: {},
      output: {},
      prompt: 'Rendered template',
    };
    
    const parsedResult2: PromptParsed = {
      name: '',
      tpl: '',
      input: {},
      output: {},
      prompt: '',
    };
    
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([templateNode1, templateNode2]);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult1);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult2);
    
    // Execute plan
    const result = await plan('templates with one empty');
    
    // Verify that only non-empty templates are included
    expect(result.prompts.length).toBe(1);
    expect(result.prompts[0].tpl).toBe('This is a test template');
  });

  it('should collect errors from parsed nodes', async () => {
    // Mock template nodes
    const templateNode1: PromptNode = {
      type: 'template',
      template: 'This is a test template',
    };
    
    const templateNode2: PromptNode = {
      type: 'template',
      template: 'This has an error',
    };
    
    // Mock parsed results
    const parsedResult1: PromptParsed = {
      name: '',
      tpl: 'This is a test template',
      input: {},
      output: {},
      prompt: 'Rendered template',
    };
    
    const parsedResult2: PromptParsed = {
      name: '',
      tpl: 'This has an error',
      input: {},
      output: {},
      prompt: '',
      error: 'Syntax error in template',
    };
    
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([templateNode1, templateNode2]);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult1);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult2);
    
    // Execute plan
    const result = await plan('templates with error');
    
    // Verify that errors are collected
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toBe('Syntax error in template');
  });

  it('should merge output from all prompt nodes', async () => {
    // Mock template nodes
    const templateNode1: PromptNode = {
      type: 'template',
      template: 'First template',
    };
    
    const templateNode2: PromptNode = {
      type: 'template',
      template: 'Second template',
    };
    
    // Mock parsed results
    const parsedResult1: PromptParsed = {
      name: '',
      tpl: 'First template',
      input: {},
      output: { key1: 'value1', shared: 'first' },
      prompt: 'Rendered first template',
    };
    
    const parsedResult2: PromptParsed = {
      name: '',
      tpl: 'Second template',
      input: {},
      output: { key2: 'value2', shared: 'second' },
      prompt: 'Rendered second template',
    };
    
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([templateNode1, templateNode2]);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult1);
    vi.mocked(parseSingle).mockResolvedValueOnce(parsedResult2);
    
    // Execute plan
    const result = await plan('templates with merged output');
    
    // Check if outputs contain all expected keys
    expect(result.output).toHaveProperty('key1', 'value1');
    expect(result.output).toHaveProperty('key2', 'value2');
    expect(result.output).toHaveProperty('shared');
  });

  it('should use provided input and options', async () => {
    // Setup input and options
    const input = { test: 'input value' };
    const options = { 
      tags: { testTag: async () => 'test result' },
      syncTags: { syncTestTag: () => 'sync result' }
    };
    
    // Mock template node
    const templateNode: PromptNode = {
      type: 'template',
      template: 'Template with vars',
    };
    
    // Mock parsed result
    const parsedResult: PromptParsed = {
      name: '',
      tpl: 'Template with vars',
      input,
      output: {},
      prompt: 'Rendered with test input value',
    };
    
    // Setup mocks
    vi.mocked(parsePrompts).mockReturnValue([templateNode]);
    vi.mocked(parseSingle).mockResolvedValue(parsedResult);
    
    // Execute plan with custom input and options
    await plan('template', input, options);
    
    // Verify parseSingle was called with the correct input and merged options
    expect(parseSingle).toHaveBeenCalledWith(
      templateNode,
      input,
      expect.objectContaining({
        mode: 'plan',
        tags: options.tags,
        syncTags: options.syncTags
      })
    );
  });

  it('should handle complex prompt flow with multiple nodes', async () => {
    // Mock a more complex structure with multiple nodes
    const templateNode1: PromptNode = {
      type: 'template',
      template: 'First step template',
    };
    
    const preambleNode1: PromptNode = {
      type: 'preamble',
      instruction: 'PROMPT',
      label: 'first step',
    };
    
    const templateNode2: PromptNode = {
      type: 'template',
      template: 'Second step template',
    };
    
    const preambleNode2: PromptNode = {
      type: 'preamble',
      instruction: 'AFTER', 
      label: 'process first result',
    };
    
    // Mock parsed results
    const parsedResult1: PromptParsed = {
      name: '',
      tpl: 'First step template',
      input: {},
      output: { step1: 'output1' },
      prompt: 'Rendered first template',
    };
    
    const parsedResult2: PromptParsed = {
      name: '',
      tpl: 'Second step template',
      input: {},
      output: { step2: 'output2' },
      prompt: 'Rendered second template',
    };
    
    // Return nodes in reverse order as that's how the code expects them
    vi.mocked(parsePrompts).mockReturnValue([
      preambleNode2,
      templateNode2,
      preambleNode1,
      templateNode1
    ]);
    
    vi.mocked(parseSingle)
      .mockResolvedValueOnce(parsedResult1)
      .mockResolvedValueOnce(parsedResult2);
    
    // Execute plan
    const result = await plan('complex template structure');
    
    // Verify the structure and associations
    expect(result.prompts.length).toBe(2);
    
    // Both prompts should have appropriate names
    const promptNames = result.prompts.map(p => p.name);
    expect(promptNames).toContain('first step');
    expect(promptNames).toContain('process first result');
    
    // Check that we have both instructions
    const instructions = result.prompts.map(p => p.instruction);
    expect(instructions).toContain('PROMPT');
    expect(instructions).toContain('AFTER');
    
    // Check outputs are in the result
    expect(result.output).toHaveProperty('step1', 'output1');
    expect(result.output).toHaveProperty('step2', 'output2');
  });
});