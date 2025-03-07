import { plan, runWorkflow } from "../src"
import { readFileSync } from "node:fs"
import prettyjson from "prettyjson"

const graphPrompt = readFileSync("data/prompt-templates/graph/test.liquid", "utf-8")

// Custom tags for the plan phase
const customTags = {
  // Mock tag to inject test data
  mock: async (tagName, ctx, input, opts, instance) => {
    console.log('test mocking for', ctx.prompt)
    const controlFlowResult = "CONTROL_FLOW_RESULT";
    
    switch (ctx.prompt) {
      case "write fiction":
        // For the 'write fiction' prompt, return a long text to trigger the shorten step
        ctx.output = {
          ...ctx.output,
          [controlFlowResult]: "This is a really beautiful fictional story on how a developer saved the world from a bug by doing a lot of coding, using LLMs, etc. This text is intentionally longer than the max_chars so that it will trigger the shorten step in the workflow."
        }
        break;

      case "shorten":
        // For the 'shorten' prompt, return a shortened version
        ctx.output = {
          ...ctx.output,
          [controlFlowResult]: "Developer saved the world from a bug with coding and LLMs."
        }
        break;
    }
    
    return "";
  },
  
  // Test data for examples tag
  examples: async (tagName, ctx, input, opts, instance) => {
    console.log(`Load examples from ${instance.hash.query} count ${instance.hash.count}`)
    return "\n  \n  Example sci-fi stories would appear here\n";
  },
  
  // Test implementation for chars_to_words tag
  chars_to_words: async (tagName, ctx, input, opts, instance) => {
    // Just return "20" as a fixed value for testing
    if (instance.hash.assign) {
      return "20";
    }
    return "20";
  }
};

// Plan the prompt first
const planResult = await plan(graphPrompt, {
  max_chars: 100,
  user_context: 'science fiction story',
}, {
  tags: customTags,
})

console.log("=== PLAN RESULT ===")
console.log(prettyjson.render(planResult))

// Now execute the workflow
// First, we need to update the prompts with our mock LLM outputs
const promptsWithMockData = planResult.prompts.map(prompt => {
  if (prompt.instruction === "PROMPT" && prompt.name === "write fiction") {
    return {
      ...prompt,
      output: {
        ...prompt.output,
        CONTROL_FLOW_RESULT: "This is a really beautiful fictional story on how a developer saved the world from a bug by doing a lot of coding, using LLMs, etc. This text is intentionally longer than the max_chars so that it will trigger the shorten step in the workflow."
      }
    };
  } 
  
  if (prompt.instruction === "PROMPT" && prompt.name === "shorten") {
    return {
      ...prompt,
      output: {
        ...prompt.output,
        CONTROL_FLOW_RESULT: "Developer saved the world from a bug with coding and LLMs."
      }
    };
  }
  
  if (prompt.instruction === "AFTER" && prompt.name === "write fiction") {
    // We need to modify this to trigger the goto to shorten
    // The text is long, so should go to shorten
    return {
      ...prompt,
      output: {
        ...prompt.output,
        CONTROL_FLOW_GOTO: "shorten"
      }
    };
  }
  
  return prompt;
});

console.log("\n=== PREPARED PROMPTS ===")
console.log(prettyjson.render(promptsWithMockData));

// Run the workflow with our prepared prompts
const result = await runWorkflow(
  promptsWithMockData,
  {
    max_chars: 100,
    user_context: 'science fiction story',
  },
  (eventType, data) => {
    console.log(`Event: ${eventType}`, data)
  },
  "simulation" // Use simulation mode to avoid making actual API calls
)

console.log("\n=== WORKFLOW EXECUTION RESULT ===")
console.log(prettyjson.render(result))