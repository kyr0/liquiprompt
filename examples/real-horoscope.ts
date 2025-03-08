import { plan, runWorkflow } from "../src"
import { readFileSync } from "node:fs"
import prettyjson from "prettyjson"

// Read the horoscope template
const horoscopePrompt = readFileSync("data/prompt-templates/graph/horoscope/horoscope.liquid", "utf-8")

// Process command line arguments
const args = process.argv.slice(2)

// Check for streaming flag
const streamingEnabled = args.includes("--stream")
if (streamingEnabled) {
  // Remove the streaming flag from args
  const streamFlagIndex = args.indexOf("--stream")
  args.splice(streamFlagIndex, 1)
}

const zodiacInput = args.join(" ") || "Taurus"

// Function to extract zodiac sign from input or convert birth date to zodiac
function extractZodiacSign(input: string): string {
  // Return the full input as-is - let the LLM handle zodiac sign determination
  // This allows processing both direct zodiac signs and birth dates
  return input
}

const zodiacSign = extractZodiacSign(zodiacInput)

// Function to run the example
async function runRealHoroscopeExample() {
  console.log("=== REAL HOROSCOPE WORKFLOW EXAMPLE ===\n")

  // Input values
  const inputValues = {
    zodiac_sign: zodiacSign,
    min_chars: 2000
  };

  console.log(`Generating horoscope for ${inputValues.zodiac_sign}...${streamingEnabled ? ' (streaming enabled)' : ''}\n`)

  // Plan the prompt
  const planResult = await plan(horoscopePrompt, inputValues);

  console.log("=== PLAN RESULT ===")
  console.log(prettyjson.render(planResult.prompts.map(p => ({
    name: p.name,
    instruction: p.instruction,
    model: p.output.model
  }))));

  console.log("\n=== RUNNING WORKFLOW ===")

  // Execute the workflow with real API calls and streaming
  const result = await runWorkflow(
    planResult.prompts,
    inputValues,
    (eventType, data) => {
      if (eventType === "STEP_BEFORE") {
        console.log(`\n> Running step: ${data.step}...`);
      } else if (eventType === "STEP_RESULT_CHUNK") {
        // Full result received, don't output to console as we're already streaming
      } else if (eventType === "STEP_RESULT_STREAM" && streamingEnabled) {
        // Only process streaming output if streaming is enabled
        process.stdout.write(data.token)
      } else if (eventType === "WORKFLOW_DONE") {
        console.log(`\n> Workflow completed!`);
        console.log(`> Final state keys:`, Object.keys(data.finalState));
      } else if (eventType === "STEP_ERROR") {
        console.error(`\n> Error in step:`, data.step, data.error);
      } else if (eventType === "STEP_AFTER") {
        console.log(`\n> Completed step: ${data.step}`);
        if (data.state && data.state.prev_generation_text) {
          console.log(`> Generated ${data.state.prev_generation_text.length} characters so far`);
        } else {
          console.log(`> No text generated yet`);
        }
      }
    },
    "execution", // Execute with real API calls
    streamingEnabled ? "stream" : "blocking" // Use streaming mode if enabled
  );

  // Display final result
  console.log("\n=== FINAL HOROSCOPE ===");
  if (result.prev_generation_text) {
    console.log(result.prev_generation_text);
  } else {
    console.log("No text was generated.");
  }

  console.log("\n=== FLOW SUMMARY ===");
  console.log(`Final horoscope: ${result.prev_generation_text ? result.prev_generation_text.length : 0} characters`);

  // Summary of workflow steps
  console.log("\n=== WORKFLOW STEPS SUMMARY ===");
  console.log("1. Generated initial horoscope with OpenAI GPT-4o");
  console.log("2. Extended content with Claude Sonnet 3.7 (high temperature)");
  console.log("3. Final polish with Claude Sonnet 3.7 (low temperature)");
  console.log("\nTotal characters generated: " + (result.prev_generation_text ? result.prev_generation_text.length : 0));
}

// Run the example
runRealHoroscopeExample().catch(error => {
  console.error("Error running horoscope example:", error);
});