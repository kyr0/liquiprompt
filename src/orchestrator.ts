import { systemPromptStreaming, type PromptResponse } from "cross-llm";
import type {
  LiquiPrompt,
  PromptInput,
  PromptInstruction,
  PromptStep,
} from "./interfaces";

// llm provider connector glue code (using cross-llm)
export {
  embed,
  systemPromptStreaming,
  systemPrompt,
  type PromptResponse,
} from "cross-llm";
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
export const ControlFlowVariableSet = [
  // set by the goto $promptName tag
  "CONTROL_FLOW_GOTO",
  // set by the done tag
  "CONTROL_FLOW_DONE",
];

export type EventType =
  | "STEP_GOTO"
  | "STEP_DONE"
  | "STEP_RESULT_CHUNK"
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
const toComparatorValue = (value: any) =>
  value
    .replaceAll(
      /[ \-\_\!\@\#\$\%\^\&\*\(\)\+\=\{\}\[\]\|\:\"\;\'\<\>\,\.\?\/\\]/g,
      "",
    )
    .toLowerCase()
    .trim();

/** discover one prompt by name or index */
const findPromptBy = (
  liquiPrompt: LiquiPrompt,
  type: "name" | "index",
  selector: number | string,
  promptInstruction: PromptInstruction = "PROMPT",
) => {
  if (type === "name") {
    return (
      liquiPrompt.find(
        (prompt) =>
          toComparatorValue(prompt.label) === toComparatorValue(selector) &&
          prompt.instruction === promptInstruction,
      ) || []
    );
  }
  return liquiPrompt[selector as number];
};

/*
const runStep = async (
  promptStep: PromptStep,
  inputValues: PromptInput,
  onUpdate: (eventName: EventType, data: any) => void,
  mode: RunMode = "simulation",
) => {
  if (promptStep.instruction === "PROMPT") {
    const response = await systemPromptStreaming(promptStep.prompt, "gpt-3", {
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result: StepExecutionResult = {
      result: {
        format: "json",
        text: response.data[0].text,
        json: response.data[0],
      },
      response,
    };

    onUpdate("STEP_DONE", result);
  } else if (promptStep.instruction === "AFTER") {
  }
};
*/

const run = async (
  liquiPrompt: LiquiPrompt,
  inputValues: PromptInput,
  onUpdate: (eventName: EventType, data: any) => void,
) => {
  // first step
  const nextStep = findPromptBy(liquiPrompt, "index", 0);

  if (!nextStep) {
    onUpdate("WORKFLOW_DONE", {});
    return;
  }

  onUpdate("WORKFLOW_DONE", {});
};

// tracer
