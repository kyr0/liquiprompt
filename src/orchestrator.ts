import { systemPrompt, type PromptResponse, systemPromptStreaming } from "cross-llm";
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
} from "./providers/vercel-ai";

// llm provider connector glue code
export {
  systemPromptStreaming,
  systemPrompt,
  type PromptResponse,
} from "cross-llm";

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
  model: "gpt-3",
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
  | "STEP_BEFORE"
  | "STEP_AFTER"
  | "WORKFLOW_DONE"
  | "STEP_ERROR";

export type RunMode = "simulation" | "execution";

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

    // Handle execution based on step type
    if (promptStep.instruction === "PROMPT") {
      // Get model info from the step
      const model = promptStep.output.model || ControlVariablesDefaults.model;
      const temperature = promptStep.output.temperature || ControlVariablesDefaults.temperature;
      
      let response;
      let generatedText = '';
      
      // Execute the prompt if not in simulation mode
      if (mode === "execution") {
        // Execute prompt based on model type
        if (model.includes('openai')) {
          response = await openaiPrompt(promptStep.prompt, {
            model: model.replace('openai/', ''),
            temperature
          });
          generatedText = response.text;
        } else if (model.includes('anthropic')) {
          response = await claudePrompt(promptStep.prompt, {
            model: model.replace('anthropic/', ''),
            temperature
          });
          generatedText = response.text;
        } else {
          // Default to cross-llm
          response = await systemPrompt(promptStep.prompt, model, {
            temperature
          });
          generatedText = response.data[0].text;
        }
      } else {
        // In simulation mode, check if we have mock data
        if (promptStep.output[ControlFlowVariables.RESULT]) {
          generatedText = promptStep.output[ControlFlowVariables.RESULT];
        } else {
          generatedText = "[Simulation Mode: LLM response would be generated here]";
        }
        
        response = {
          data: [{ text: generatedText }]
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

      // Send update event
      onUpdate("STEP_RESULT_CHUNK", result);
      
      // Update state with result
      const updatedState = {
        ...combinedInput,
        prev_generation_text: generatedText,
        prev_generation_chars: generatedText.length,
        [ControlFlowVariables.RESULT]: generatedText
      };
      
      // AFTER steps are handled in the main workflow loop
      return {
        state: updatedState,
        isDone: false
      };
    } else if (promptStep.instruction === "AFTER") {
      // Handle AFTER steps
      onUpdate("STEP_AFTER", { step: promptStep.name });
      
      // Check for control flow directives
      if (promptStep.output[ControlFlowVariables.GOTO]) {
        return {
          state: combinedInput,
          nextStep: promptStep.output[ControlFlowVariables.GOTO],
          isDone: false
        };
      }
      
      if (promptStep.output[ControlFlowVariables.DONE]) {
        return {
          state: combinedInput,
          isDone: true
        };
      }
      
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
): Promise<PromptInput> => {
  // Initialize state with input values
  let state = { ...inputValues };
  let isDone = false;
  let currentStepName: string | undefined;
  
  // Find the first PROMPT step
  let currentStep = liquiPrompt.find(step => step.instruction === "PROMPT");
  
  if (!currentStep) {
    onUpdate("WORKFLOW_DONE", { error: "No PROMPT steps found in workflow" });
    return state;
  }
  
  // Loop until workflow is done
  while (!isDone && currentStep) {
    // Notify of current step
    onUpdate(currentStep.instruction === "PROMPT" ? "STEP_BEFORE" : "STEP_AFTER", {
      step: currentStep.name
    });
    
    // Execute the step
    const stepResult = await runStep(currentStep, state, onUpdate, mode);
    
    // Update state with step results
    state = { ...state, ...stepResult.state };
    
    // Check if we're done
    if (stepResult.isDone) {
      isDone = true;
    } else if (stepResult.nextStep) {
      // Look for next step by name
      currentStep = findPromptByName(liquiPrompt, stepResult.nextStep);
      
      if (!currentStep) {
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
        onUpdate("STEP_AFTER", { step: afterStep.name });
        
        // Execute the AFTER step (which processes control flow variables)
        const afterStepResult = await runStep(afterStep, state, onUpdate, mode);
        
        // Update state with AFTER step results
        state = { ...state, ...afterStepResult.state };
        
        // Check control flow instructions from AFTER step
        if (afterStepResult.isDone) {
          isDone = true;
          continue;
        }
        
        if (afterStepResult.nextStep) {
          // Find next step by name from GOTO
          currentStep = findPromptByName(liquiPrompt, afterStepResult.nextStep);
          
          if (!currentStep) {
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
            currentStep = nextPromptStep;
          } else {
            // No more PROMPT steps
            isDone = true;
          }
        } else {
          // End of prompt list
          isDone = true;
        }
      }
    }
  }
  
  // Workflow complete
  onUpdate("WORKFLOW_DONE", { finalState: state });
  return state;
};

// Export run function
export { run as runWorkflow };
