import { Context, Liquid } from "liquidjs";
import type {
  PromptInstruction,
  PromptList,
  PromptNode,
  PromptOptions,
  PromptParsed,
  StringMap,
  TagHash,
  ValueExpression,
} from "./interfaces";
import { builtInTags, registerTags } from "./tags";

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
          instruction: currentMatch?.[1].trim() as PromptInstruction,
          template: currentText.trimEnd(),
          label: currentMatch?.[2].trim(),
        });
        currentText = "";
      }

      // extract preamble
      nodes.push({
        type: "preamble",
        instruction: match[1].trim() as PromptInstruction,
        label: match[2].trim(),
      });
      currentMatch = match;
    } else {
      currentText += `${line}\n`;
    }
  });

  if (currentText.trimEnd().length > 0) {
    nodes.push({
      type: "template",
      instruction: (currentMatch?.[1] || "").trim() as PromptInstruction,
      template: currentText.trimEnd(),
      label: (currentMatch?.[2] || "").trim(),
    });
    currentText = "";
  }

  return nodes.length
    ? nodes
    : [
        {
          type: "template",
          instruction: (currentMatch?.[1] || "").trim() as PromptInstruction,
          template: promptTemplate,
          label: (currentMatch?.[2] || "").trim(),
        },
      ];
};

export const parseSingle = async (
  promptNode: PromptNode,
  input: StringMap,
  opts: PromptOptions,
): Promise<PromptParsed> => {
  let renderedPrompt = "";
  let error;
  const output: StringMap = {};
  const ctx = new Context();
  let tpl = promptNode.template || "";
  const prompt = promptNode.label || "";

  const promptContext = {
    prompt,
    input,
    output,
  };

  try {
    const engine = new Liquid();

    // register built-in dialect tags
    registerTags(engine, promptContext, opts, builtInTags, "sync");

    // user-defined tags (sync)
    registerTags(engine, promptContext, opts, opts.syncTags || {}, "sync");

    // user-defined tags (async)
    registerTags(engine, promptContext, opts, opts.tags || {}, "async");

    ctx.globals = {
      ...input,
    };

    // FIXME: only when mode is "test"

    if (
      // test mocking is implemented, but not used in the prompt
      typeof opts.tags?.inputMock === "function" &&
      tpl.length > 0 &&
      !/{%\s*inputMock\s*%}/i.test(tpl)
    ) {
      // every prompt can have a inputMock block to allow mocking the input values for logic to be tested
      tpl = `{% inputMock %}\n${tpl}`;
    }

    if (
      // test mocking is implemented, but not used in the prompt
      typeof opts.tags?.mock === "function" &&
      tpl.length > 0 &&
      !/{%\s*mock\s*%}/.test(tpl)
    ) {
      // every prompt can have a mock block to allow mocking the CONTROL_FLOW_RESULT value
      tpl = `${tpl}\n{% mock %}`;
    }

    renderedPrompt = (await engine.parseAndRender(tpl, ctx)).trim();
  } catch (e) {
    error = `In ${promptNode.instruction}, ${prompt}: ${(e as Error).message}`;
  }

  console.log("ctx.globals", ctx.getAll());

  return {
    name: prompt,
    tpl,
    input,
    output,
    prompt: renderedPrompt,
    error,
  };
};

/** unpacks variable name frim */
export const parseValueExpression = (
  expressionOrValue: string,
): ValueExpression => {
  const matches = expressionOrValue.match(/^\{\{\s*(.+)\s*\}\}$/);
  if (!matches) {
    return {
      value: expressionOrValue, // original value
      type: "value",
    };
  }
  return {
    label: matches[1].trim(), // sanitized variable name
    type: "variable",
  };
};

export const parseTagHashValues = (
  hash: TagHash,
  outputValues: StringMap,
  inputValues: StringMap,
): StringMap => {
  const keys = Object.keys(hash);
  const values: StringMap = {};

  // generalized hash value allocation including input parameter lookup
  for (const key of keys) {
    if (typeof hash[key] === "undefined" || typeof hash[key] !== "string") {
      values[key] = hash[key]; // assign original value
      continue;
    }

    const valueExpression = parseValueExpression(hash[key] as string);

    // output variables precede in priority (closer context)
    if (valueExpression.type === "variable") {
      valueExpression.value = outputValues[valueExpression.label!];

      // if no output value can be found as variable, try to use an input variable
      if (typeof valueExpression.value === "undefined") {
        valueExpression.value = inputValues[valueExpression.label!];
      }
    }
    // assign value, original value or empty string
    values[key] = valueExpression.value || "";
  }
  return values;
};
