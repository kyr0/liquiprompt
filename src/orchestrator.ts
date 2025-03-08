import type {
  LiquiPrompt,
  PromptInput,
  PromptInstruction,
  PromptParsed,
} from "./interfaces";
import {
  claudePrompt,
  claudePromptStreaming,
  openaiPrompt,
  openaiPromptStreaming,
  type PromptResponse,
} from "./providers/vercel-ai";

// Re-export from our provider
export type { PromptResponse };

// Export Vercel AI SDK implementations
export {
  openaiPrompt,
  openaiPromptStreaming,
  claudePrompt,
  claudePromptStreaming,
};
// TODO: getModelDefaults('provider', 'modelName') => { temperature: 0.7, ... }

// simple orchestrator for synchronous prompt workflow execution

export interface ControlVariables {
  model: string;
  temperature: number;
}

export const ControlVariablesDefaults: ControlVariables = {
  model: "openai/gpt-4o",
  temperature: 0.7,
};

/** variables that direct the control flow */
export const ControlFlowVariables = {
  // set by the goto $promptName tag
  GOTO: "CONTROL_FLOW_GOTO",
  // set by the done tag
  DONE: "CONTROL_FLOW_DONE",
  // result from LLM generation
  RESULT: "CONTROL_FLOW_RESULT"
};

export type EventType =
  | "STEP_GOTO"
  | "STEP_DONE"
  | "STEP_RESULT_CHUNK"
  | "STEP_RESULT_STREAM"
  | "STEP_BEFORE"
  | "STEP_AFTER"
  | "WORKFLOW_DONE"
  | "STEP_ERROR";

export type RunMode = "simulation" | "execution";
export type StreamMode = "stream" | "blocking";

export interface StepExecutionResult<T = any> {
  result: {
    format: "json" | "text";
    text: string;
    json: T;
  };
  // meta data
  response: PromptResponse;
}

/** make values human-friendly comparable so that they match even with small typos */
const toComparatorValue = (value: any) => {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll(
      /[ \-\_\!\@\#\$\%\^\&\*\(\)\+\=\{\}\[\]\|\:\"\;\'\<\>\,\.\?\/\\]/g,
      "",
    )
    .toLowerCase()
    .trim();
};

/** discover one prompt by name or index */
const findPromptBy = (
  liquiPrompt: LiquiPrompt,
  type: "name" | "index",
  selector: number | string,
  promptInstruction: PromptInstruction = "PROMPT",
): PromptParsed | undefined => {
  if (type === "name") {
    return liquiPrompt.find(
      (prompt) =>
        toComparatorValue(prompt.name) === toComparatorValue(selector as string) &&
        prompt.instruction === promptInstruction,
    );
  }
  return liquiPrompt[selector as number];
};

/** Find prompt step by name */
const findPromptByName = (
  liquiPrompt: LiquiPrompt,
  name: string,
): PromptParsed | undefined => {
  return liquiPrompt.find(
    (prompt) => toComparatorValue(prompt.name) === toComparatorValue(name)
  );
};

/**
 * Execute a single prompt step
 */
const runStep = async (
  promptStep: PromptParsed,
  stateValues: PromptInput,
  onUpdate: (eventName: EventType, data: any) => void,
  mode: RunMode = "execution",
  streamMode: StreamMode = "blocking"
): Promise<{
  state: PromptInput;
  nextStep?: string;
  isDone: boolean;
}> => {
  try {
    // Combine input state with step inputs
    const combinedInput = {
      ...stateValues,
      ...promptStep.input
    };

    // Log input state size
    console.log(`📥 Input state: ${Object.keys(combinedInput).length} keys`);
    
    // Handle execution based on step type
    if (promptStep.instruction === "PROMPT") {
      // Get model info from the step
      const model = promptStep.output.model || ControlVariablesDefaults.model;
      const temperature = promptStep.output.temperature || ControlVariablesDefaults.temperature;
      
      let response;
      let generatedText = '';
      let startTime = Date.now();
      let apiTime;
      
      // Execute the prompt if not in simulation mode
      if (mode === "execution") {
        try {
          console.log(`🤖 Model: ${model}, Temperature: ${temperature}`);
          console.log(`📋 Prompt length: ${promptStep.prompt.length} characters`);
          console.log(`🔄 Stream mode: ${streamMode}`);
          
          // Execute prompt based on model type and stream mode
          if (streamMode === "stream") {
            // Streaming execution
            const onToken = (token: string) => {
              onUpdate("STEP_RESULT_STREAM", { token });
              process.stdout.write(token);
              // Force flush stdout to make output responsive
              process.stdout.write('');
            };
            
            const onComplete = (text: string) => {
              generatedText = text;
              apiTime = Date.now() - startTime;
              console.log(`\n⏱️ Stream completed in ${apiTime}ms`);
              console.log(`📝 Generated ${generatedText.length} characters of text`);
            };
            
            const onError = (error: Error) => {
              console.error(`❌ Streaming error:`, error);
            };
            
            if (model.includes('openai')) {
              const modelName = model.replace('openai/', '');
              console.log(`🟢 Streaming from OpenAI with model: ${modelName}`);
              
              // Let the callback handle streaming display to avoid duplication
              const wrappedOnToken = (token: string) => {
                // Only pass to the callback, don't write to stdout here
                onToken(token);
              };
              
              response = await openaiPromptStreaming(promptStep.prompt, modelName, {
                temperature,
                onToken: wrappedOnToken,
                onComplete,
                onError
              });
            } else if (model.includes('anthropic')) {
              const modelName = model.replace('anthropic/', '');
              console.log(`🟣 Streaming from Claude with model: ${modelName}`);
              
              // Let the callback handle streaming display to avoid duplication
              const wrappedOnToken = (token: string) => {
                // Only pass to the callback, don't write to stdout here
                onToken(token);
              };
              
              response = await claudePromptStreaming(promptStep.prompt, modelName, {
                temperature,
                onToken: wrappedOnToken,
                onComplete,
                onError
              });
            } else {
              throw new Error(`Unsupported model provider: ${model}. Must use either 'openai/' or 'anthropic/' prefix.`);
            }
          } else {
            // Non-streaming (blocking) execution
            if (model.includes('openai')) {
              const modelName = model.replace('openai/', '');
              console.log(`🟢 Executing OpenAI prompt with model: ${modelName}`);
              response = await openaiPrompt(promptStep.prompt, modelName, {
                temperature
              });
            } else if (model.includes('anthropic')) {
              const modelName = model.replace('anthropic/', '');
              console.log(`🟣 Executing Claude prompt with model: ${modelName}`);
              response = await claudePrompt(promptStep.prompt, modelName, {
                temperature
              });
            } else {
              throw new Error(`Unsupported model provider: ${model}. Must use either 'openai/' or 'anthropic/' prefix.`);
            }
            
            apiTime = Date.now() - startTime;
            console.log(`⏱️ API request completed in ${apiTime}ms`);
            
            // Extract generated text from response
            if (response) {
              generatedText = response.data?.[0]?.text || '';
              console.log(`📝 Generated ${generatedText.length} characters of text`);
              
              // Log approximate tokens (rough estimate)
              const approxTokens = Math.round(generatedText.length / 4);
              console.log(`🔢 Approximately ${approxTokens} tokens in response`);
            } else {
              throw new Error(`No valid response from model ${model}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error executing prompt with ${model}:`, error);
          throw error;
        }
      } else {
        // In simulation mode, check if we have mock data
        console.log("🧪 Running in simulation mode");
        
        if (promptStep.output[ControlFlowVariables.RESULT]) {
          generatedText = promptStep.output[ControlFlowVariables.RESULT];
          console.log(`🔄 Using mock data: ${generatedText.length} characters`);
          
          // If streaming mode, simulate word-by-word output
          if (streamMode === "stream") {
            console.log("🔄 Simulating streaming output:");
            let outputText = "";
            
            // Split text into words and spaces
            const words = generatedText.split(/(\s+)/).filter(Boolean);
            
            for (const word of words) {
              await new Promise(resolve => setTimeout(resolve, 5));
              
              // Only send token to callback, don't write to stdout here
              // The callback is responsible for displaying the token if needed
              onUpdate("STEP_RESULT_STREAM", { token: word });
              outputText += word;
            }
            // No console.log here, let the callback handle it
          }
        } else {
          generatedText = "[Simulation Mode: LLM response would be generated here]";
          console.log("🔄 No mock data provided, using placeholder");
          
          if (streamMode === "stream") {
            onUpdate("STEP_RESULT_STREAM", { token: generatedText });
            console.log(generatedText);
          }
        }
        
        // Simulate a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        apiTime = Date.now() - startTime;
        
        response = {
          provider: "simulation",
          data: [{ text: generatedText }],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          status: 200
        };
      }

      // Prepare result object
      const result: StepExecutionResult = {
        result: {
          format: "text",
          text: generatedText,
          json: response || {}
        },
        response: response as PromptResponse
      };

      // Send update event for the full result (even if we already streamed)
      onUpdate("STEP_RESULT_CHUNK", result);
      
      // Update state with result
      const updatedState = {
        ...combinedInput,
        prev_generation_text: generatedText,
        prev_generation_chars: generatedText.length,
        prev_generation_time_ms: apiTime,
        [ControlFlowVariables.RESULT]: generatedText
      };
      
      // Log state updates
      console.log(`📤 Updated state with ${generatedText.length} character response`);
      
      // AFTER steps are handled in the main workflow loop
      return {
        state: updatedState,
        isDone: false
      };
    } else if (promptStep.instruction === "AFTER") {
      // Handle AFTER steps
      console.log(`🔍 Processing AFTER step logic for ${promptStep.name}`);
      onUpdate("STEP_AFTER", { step: promptStep.name, state: combinedInput });
      
      // Check for control flow directives
      if (promptStep.output[ControlFlowVariables.GOTO]) {
        const gotoTarget = promptStep.output[ControlFlowVariables.GOTO];
        console.log(`↪️ Control flow: GOTO ${gotoTarget}`);
        return {
          state: combinedInput,
          nextStep: gotoTarget,
          isDone: false
        };
      }
      
      if (promptStep.output[ControlFlowVariables.DONE]) {
        console.log("🛑 Control flow: DONE");
        return {
          state: combinedInput,
          isDone: true
        };
      }
      
      console.log("↩️ No control flow directives, continuing sequence");
      // Default return if no control flow directives found
      return {
        state: combinedInput,
        isDone: false
      };
    }
    
    // Default return for any other step type
    return {
      state: combinedInput,
      isDone: false
    };
  } catch (error) {
    console.error(`❌ Error in step ${promptStep.name}:`, error);
    onUpdate("STEP_ERROR", { error, step: promptStep.name });
    return {
      state: stateValues,
      isDone: true
    };
  }
};

/**
 * Run the complete prompt workflow
 */
export const run = async (
  liquiPrompt: LiquiPrompt,
  inputValues: PromptInput,
  onUpdate: (eventName: EventType, data: any) => void,
  mode: RunMode = "execution",
  streamMode: StreamMode = "blocking",
): Promise<PromptInput> => {
  // Initialize state with input values
  let state = { ...inputValues };
  let isDone = false;
  let currentStepName: string | undefined;
  
  console.log("\n🚀 Starting workflow execution...");
  console.log(`Mode: ${mode} | Stream: ${streamMode}`);
  console.log(`Steps: ${liquiPrompt.length}`);
  
  // Find the first PROMPT step
  let currentStep = liquiPrompt.find(step => step.instruction === "PROMPT");
  
  if (!currentStep) {
    console.log("❌ Error: No PROMPT steps found in workflow");
    onUpdate("WORKFLOW_DONE", { error: "No PROMPT steps found in workflow" });
    return state;
  }
  
  // Loop until workflow is done
  let stepCount = 0;
  const startTime = Date.now();
  
  while (!isDone && currentStep) {
    stepCount++;
    const stepStartTime = Date.now();
    
    // Notify of current step
    console.log(`\n📋 Step ${stepCount}: ${currentStep.name} (${currentStep.instruction})`);
    onUpdate(currentStep.instruction === "PROMPT" ? "STEP_BEFORE" : "STEP_AFTER", {
      step: currentStep.name
    });
    
    // Execute the step
    const stepResult = await runStep(currentStep, state, onUpdate, mode, streamMode);
    const stepDuration = Date.now() - stepStartTime;
    console.log(`⏱️ Step completed in ${stepDuration}ms`);
    
    // Update state with step results
    state = { ...state, ...stepResult.state };
    
    // Check if we're done
    if (stepResult.isDone) {
      console.log("✅ Workflow marked as done by step");
      isDone = true;
    } else if (stepResult.nextStep) {
      // Look for next step by name
      console.log(`➡️ Explicit GOTO: ${stepResult.nextStep}`);
      currentStep = findPromptByName(liquiPrompt, stepResult.nextStep);
      
      if (!currentStep) {
        console.log(`❌ Error: Could not find next step: ${stepResult.nextStep}`);
        onUpdate("STEP_ERROR", { 
          error: `Could not find next step: ${stepResult.nextStep}`,
          currentStep: currentStepName
        });
        isDone = true;
      }
    } else {
      // No explicit next step
      
      // First check if there's an AFTER step for the current prompt
      const currentName = currentStep?.name || '';
      
      const afterStep = liquiPrompt.find(step => 
        step.instruction === "AFTER" && 
        toComparatorValue(step.name) === toComparatorValue(currentName)
      );
      
      if (afterStep) {
        // Process the AFTER step
        console.log(`📑 Processing AFTER step for ${currentName}`);
        onUpdate("STEP_AFTER", { step: afterStep.name });
        
        // Execute the AFTER step (which processes control flow variables)
        const afterStepResult = await runStep(afterStep, state, onUpdate, mode, streamMode);
        
        // Update state with AFTER step results
        state = { ...state, ...afterStepResult.state };
        
        // Check control flow instructions from AFTER step
        if (afterStepResult.isDone) {
          console.log("✅ Workflow marked as done by AFTER step");
          isDone = true;
          continue;
        }
        
        if (afterStepResult.nextStep) {
          // Find next step by name from GOTO
          console.log(`➡️ GOTO from AFTER step: ${afterStepResult.nextStep}`);
          currentStep = findPromptByName(liquiPrompt, afterStepResult.nextStep);
          
          if (!currentStep) {
            console.log(`❌ Error: Could not find next step: ${afterStepResult.nextStep}`);
            onUpdate("STEP_ERROR", { 
              error: `Could not find next step: ${afterStepResult.nextStep}`,
              currentStep: afterStep.name
            });
            isDone = true;
          }
          
          continue;
        }
      }
      
      // If no AFTER step or AFTER step doesn't change flow, find next in sequence
      if (!isDone && !afterStep?.output?.[ControlFlowVariables.GOTO]) {
        const currentIndex = liquiPrompt.findIndex(step => 
          step.name === currentStep?.name && step.instruction === currentStep?.instruction
        );
        
        if (currentIndex >= 0 && currentIndex < liquiPrompt.length - 1) {
          // Find next PROMPT step
          const nextPromptStep = liquiPrompt
            .slice(currentIndex + 1)
            .find(step => step.instruction === "PROMPT");
            
          if (nextPromptStep) {
            console.log(`⏭️ Moving to next sequential prompt: ${nextPromptStep.name}`);
            currentStep = nextPromptStep;
          } else {
            // No more PROMPT steps
            console.log("✅ No more PROMPT steps in workflow");
            isDone = true;
          }
        } else {
          // End of prompt list
          console.log("✅ Reached end of prompt list");
          isDone = true;
        }
      }
    }
  }
  
  // Workflow complete
  const totalDuration = Date.now() - startTime;
  console.log(`\n🏁 Workflow completed in ${totalDuration}ms`);
  console.log(`Total steps executed: ${stepCount}`);
  
  onUpdate("WORKFLOW_DONE", { finalState: state });
  return state;
};

// Export run function
export { run as runWorkflow };
