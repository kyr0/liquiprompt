import type {
  StringMap,
  PromptOptions,
  PromptParsed,
  PlanModeResult,
} from "./interfaces";
import { parsePrompts, parseSingle } from "./parser";

export const defaultOpts: PromptOptions = {
  tags: {},
  syncTags: {},
};

/** preprocessor for meta data followed by liquid compilation pass */
export const plan = async (
  tpl: string,
  input: StringMap = {},
  opts: PromptOptions = defaultOpts,
): Promise<PlanModeResult> => {
  opts = {
    ...defaultOpts,
    ...opts,
    mode: "plan",
  };

  const promptList = parsePrompts(tpl).reverse();

  const parseResults: Array<PromptParsed> = [];
  let prevSinglePromptResultIndex = -1;

  // reverse for simple association
  for (let i = 0; i < promptList.length; i++) {
    const singlePrompt = promptList[i];
    let parsed: PromptParsed;

    if (singlePrompt.type === "template") {
      parsed = await parseSingle(singlePrompt, input, opts);
      parsed.instruction = "PROMPT";
      parseResults.push(parsed);
      prevSinglePromptResultIndex = parseResults.length - 1;
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "AFTER" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].name = singlePrompt.label || "";
      parseResults[prevSinglePromptResultIndex].instruction = "AFTER";
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "PROMPT" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].name = singlePrompt.label || "";
      parseResults[prevSinglePromptResultIndex].instruction = "PROMPT";
    }
  }

  const sanizizedOrderedPromptParseResults = parseResults
    .reverse()
    .filter((node) => node.tpl);

  return {
    prompts: sanizizedOrderedPromptParseResults,
    errors: sanizizedOrderedPromptParseResults
      .map((node) => node.error || "")
      .filter(Boolean),
    output: sanizizedOrderedPromptParseResults.reduce((acc, node) => {
      return { ...acc, ...node.output };
    }, {}),
  };
};
