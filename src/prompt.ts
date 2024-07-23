import { Context, Liquid } from "liquidjs";
import type {
  FieldMap,
  StringMap,
  ParseResult,
  PromptList,
  PromptInstruction,
} from "./interfaces";
import { defineFieldTag } from "./tags/field";

/** parses individual prompts together with their leading preambles */
export const parsePrompts = (promptTemplate: string): PromptList => {
  // line by line parsing
  const lines = promptTemplate.split("\n");
  const nodes: PromptList = [];
  let currentText = "";

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(
      /^---\s*(\w+)\s*[:=]\s*([\w!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/`~]+)\s*---$/i,
    );

    if (match) {
      // push the accumulated text node if exists
      if (currentText) {
        nodes.push({ type: "template", template: currentText.trimEnd() });
        currentText = "";
      }
      // extract preamble
      nodes.push({
        type: "preamble",
        instruction: match[1] as PromptInstruction,
        label: match[2],
      });
    } else {
      currentText += `${line}\n`;
    }
  });

  if (currentText.trimEnd().length > 0) {
    nodes.push({ type: "template", template: currentText.trimEnd() });
    currentText = "";
  }
  return nodes.length
    ? nodes
    : [{ type: "template", template: promptTemplate }];
};

export const parseSingle = (
  promptTemplate: string,
  inputValues: StringMap = {},
) => {
  let prompt = "";
  let error;
  const meta: FieldMap = {};
  const templateValues: StringMap = {};
  const ctx = new Context();

  try {
    const engine = new Liquid();

    // register custom fields
    engine.registerTag(
      "field",
      defineFieldTag({
        inputValues,
        meta,
        templateValues,
      }),
    );

    ctx.globals = {
      ...templateValues,
      ...inputValues,
    };

    prompt = engine.parseAndRenderSync(promptTemplate, ctx).trim();
  } catch (e) {
    error = (e as Error).message;
  }

  return {
    templateValues,
    promptTemplate,
    meta,
    inputValues,
    outputValues: ctx.getAll() as Record<string, string>,
    prompt,
    error,
  };
};

/** preprocessor for meta data followed by liquid compilation pass */
export const parse = (
  promptTemplate: string,
  inputValues: StringMap = {},
): Array<ParseResult> => {
  const promptList = parsePrompts(promptTemplate).reverse();

  const parseResults: Array<ParseResult> = [];
  let prevSinglePromptResultIndex = -1;

  // reverse for simple association
  for (let i = 0; i < promptList.length; i++) {
    const singlePrompt = promptList[i];
    let singlePromptResult: ParseResult;

    if (singlePrompt.type === "template") {
      singlePromptResult = parseSingle(
        singlePrompt.template || "",
        inputValues,
      );
      parseResults.push(singlePromptResult);
      prevSinglePromptResultIndex = parseResults.length - 1;
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "AFTERPROMPT" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].instruction = "AFTERPROMPT";
    } else if (
      singlePrompt.type === "preamble" &&
      singlePrompt.instruction === "PROMPT" &&
      parseResults[prevSinglePromptResultIndex]
    ) {
      parseResults[prevSinglePromptResultIndex].instruction = "PROMPT";
    }
  }
  return parseResults.reverse();
};
