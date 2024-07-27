import type { StringMap, PromptStep, PromptOptions } from "./interfaces";
import { parsePrompts, parseSingle } from "./parser";

export const defaultParseOpts: PromptOptions = {
  tags: {},
};

/** preprocessor for meta data followed by liquid compilation pass */
export const plan = async (
  promptTemplate: string,
  inputValues: StringMap = {},
  parseOpts: PromptOptions = defaultParseOpts,
): Promise<Array<PromptStep>> => {
  parseOpts = {
    ...defaultParseOpts,
    ...parseOpts,
    mode: "plan",
  };

  const promptList = parsePrompts(promptTemplate).reverse();

  const parseResults: Array<PromptStep> = [];
  let prevSinglePromptResultIndex = -1;

  // reverse for simple association
  for (let i = 0; i < promptList.length; i++) {
    const singlePrompt = promptList[i];
    let singlePromptResult: PromptStep;

    if (singlePrompt.type === "template") {
      singlePromptResult = await parseSingle(
        singlePrompt.label || "",
        singlePrompt.template || "",
        inputValues,
        parseOpts,
      );
      singlePromptResult.instruction = "PROMPT";
      singlePromptResult.label = singlePrompt.label;
      parseResults.push(singlePromptResult);
      prevSinglePromptResultIndex = parseResults.length - 1;
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "AFTER" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].label = singlePrompt.label;
      parseResults[prevSinglePromptResultIndex].instruction = "AFTER";
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "PROMPT" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].label = singlePrompt.label;
      parseResults[prevSinglePromptResultIndex].instruction = "PROMPT";
    }
  }
  return parseResults.reverse().filter((node) => node.promptTemplate);
};
