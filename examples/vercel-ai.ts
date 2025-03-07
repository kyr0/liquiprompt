import { readFileSync } from "fs";
import { plan } from "../src";
import { openaiPrompt, claudePrompt } from "../src/orchestrator";
import * as dotenv from "dotenv";
import prettyjson from "prettyjson";

// Load environment variables
dotenv.config();

// Example prompt template
const coachPrompt = readFileSync("data/prompt-templates/one-shot/coach.liquid", "utf-8");

async function main() {
  // Compile the prompt template
  const compileResult = await plan(coachPrompt);
  
  console.log("Prompt template compiled successfully");
  console.log("Template name:", compileResult.prompts[0].name || "Unnamed");
  console.log("Prompt content sample:", compileResult.prompts[0].prompt.substring(0, 100) + "...");
  
  // Example usage with OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log("\n--- OpenAI Example (Vercel AI SDK) ---");
    try {
      const response = await openaiPrompt(
        compileResult.prompts[0].prompt,
        "gpt-3.5-turbo",
        {
          temperature: 0.7,
          system: "You are a creative writing coach who provides constructive feedback.",
        }
      );
      console.log("OpenAI Response:");
      console.log(response.data[0].text.substring(0, 500) + "...");
    } catch (error) {
      console.error("OpenAI Error:", error);
    }
  } else {
    console.log("Skipping OpenAI example - OPENAI_API_KEY not set");
  }

  // Example usage with Claude
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("\n--- Claude Example (Vercel AI SDK) ---");
    try {
      const response = await claudePrompt(
        compileResult.prompts[0].prompt,
        "claude-3-sonnet-20240229",
        {
          temperature: 0.7,
          system: "You are a creative writing coach who provides constructive feedback.",
        }
      );
      console.log("Claude Response:");
      console.log(response.data[0].text.substring(0, 500) + "...");
    } catch (error) {
      console.error("Claude Error:", error);
    }
  } else {
    console.log("Skipping Claude example - ANTHROPIC_API_KEY not set");
  }
}

await main();