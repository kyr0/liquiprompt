import { plan, runWorkflow } from "../src";
import { readFileSync } from "fs";
import prettyjson from "prettyjson";

// Define our example prompt template with the examples tag
const promptTemplate = `
# Task Planning Assistant

{% examples query='{{ task_description }}' count=2 source='data/examples' %}

Based on the examples above, please help me plan the following task:

Task: {{ task_description }}

Please provide:
1. A breakdown of steps needed
2. Estimated time for each step
3. Any resources or tools needed
4. A suggested schedule
`;

// Process command line arguments
const args = process.argv.slice(2);
const taskDescription = args.join(" ") || "Create a marketing plan for a new product launch";

// Function to run the example
async function runExamplesTagExample() {
  console.log("=== EXAMPLES TAG DEMO ===\n");

  // Input values
  const inputValues = {
    task_description: taskDescription
  };

  console.log(`Planning task: "${inputValues.task_description}"\n`);

  // Plan the prompt
  console.log("Planning prompt workflow...");
  const planResult = await plan(promptTemplate, inputValues);

  console.log("=== PLAN RESULT ===");
  console.log(prettyjson.render(planResult.prompts.map(p => ({
    name: p.name,
    instruction: p.instruction,
    model: p.output.model,
  }))));

  console.log("\n=== RUNNING WORKFLOW ===");

  // Execute the workflow with real API calls
  const result = await runWorkflow(
    planResult.prompts,
    inputValues,
    (eventType, data) => {
      if (eventType === "STEP_BEFORE") {
        console.log(`\n> Running step: ${data.step}...`);
      } else if (eventType === "STEP_RESULT_CHUNK") {
        console.log(`> Generated text: ${data.result.text.length} characters`);
      } else if (eventType === "WORKFLOW_DONE") {
        console.log(`\n> Workflow completed!`);
      }
    }
  );

  // Display final result
  console.log("\n=== TASK PLAN ===");
  if (result.prev_generation_text) {
    console.log(result.prev_generation_text);
  } else {
    console.log("No text was generated.");
  }

  // Summary of what happened
  console.log("\n=== SUMMARY ===");
  console.log(`- Examples were retrieved using vector similarity search`);
  console.log(`- Query: "${taskDescription}"`);
  console.log(`- Model used: ${planResult.prompts[0].output.model}`);
  console.log(`- Generated response: ${result.prev_generation_text?.length || 0} characters`);

  // Print the examples that were found
  console.log("\n=== EXAMPLES FOUND ===");
  // Extract examples from the prompt (if they exist)
  const examplesMatch = planResult.prompts[0].prompt.match(/Example 1:[\s\S]*?(?=Based on the examples above|$)/);
  if (examplesMatch && examplesMatch[0]) {
    console.log(examplesMatch[0].trim());
  } else {
    console.log("No examples were found or included in the prompt.");
  }
}

// Run the example
runExamplesTagExample().catch(error => {
  console.error("Error running example:", error);
  process.exit(1);
});