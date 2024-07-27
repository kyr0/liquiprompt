import { Context, Liquid } from "liquidjs";
import type {
  PromptInstruction,
  PromptList,
  PromptOptions,
  StringMap,
  ValueExpression,
} from "./interfaces";
import { registerTags } from "./tags";

/** parses individual prompts together with their leading preambles */
export const parsePrompts = (promptTemplate: string): PromptList => {
  // line by line parsing
  const lines = promptTemplate.split("\n");
  const nodes: PromptList = [];
  let currentText = "";

  let currentMatch: RegExpMatchArray | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(/^---\s*(\w+)\s*(.+)\s*---$/i);

    if (match) {
      // push the accumulated text node if exists
      if (currentText) {
        nodes.push({
          type: "template",
          template: currentText.trimEnd(),
          label: currentMatch?.[2],
        });
        currentText = "";
      }

      // extract preamble
      nodes.push({
        type: "preamble",
        instruction: match[1] as PromptInstruction,
        label: match[2],
      });
      currentMatch = match;
    } else {
      currentText += `${line}\n`;
    }
  });

  if (currentText.trimEnd().length > 0) {
    nodes.push({
      type: "template",
      template: currentText.trimEnd(),
      label: currentMatch?.[2],
    });
    currentText = "";
  }
  return nodes.length
    ? nodes
    : [
        {
          type: "template",
          template: promptTemplate,
          label: currentMatch?.[2],
        },
      ];
};

export const parseSingle = async (
  promptLabel: string,
  promptTemplate: string,
  inputValues: StringMap,
  opts: PromptOptions,
) => {
  let prompt = "";
  let error;
  const outputValues: StringMap = {};
  const ctx = new Context();

  const promptContext = {
    promptLabel,
    inputValues,
    outputValues,
  };

  try {
    let engine = new Liquid();

    // register custom tags (dialect)
    engine = registerTags(engine, promptContext, opts);

    ctx.globals = {
      ...inputValues,
    };

    if (
      // test mocking is implemented, but not used in the prompt
      typeof opts.tags?.test === "function" &&
      // FIXME: use regexp
      promptTemplate.indexOf("{% test %}") === -1
    ) {
      // every prompt should have a test block to allow mocking the CONTROL_FLOW_RESULT value
      promptTemplate += "\n{% test %}";
    }

    prompt = (await engine.parseAndRender(promptTemplate, ctx)).trim();
  } catch (e) {
    error = (e as Error).message;
  }

  return {
    promptTemplate,
    inputValues,
    outputValues: promptContext.outputValues,
    prompt,
    error,
  };
};

/** unpacks variable name frim */
export const parseValueExpression = (expression: string): ValueExpression => {
  // FIXME: whitespaces should be optional
  const matches = expression.match(/^\{\{\s+(.+)\s+\}\}$/);
  if (!matches) {
    return {
      value: expression,
      type: "value",
    }; // value
  }
  return {
    label: matches[1], // variable name
    type: "variable",
  };
};
