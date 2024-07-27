import type { Hash, TagClass, TagImplOptions } from "liquidjs/dist/template";

export type StringMap = Record<string, any>;

export type PromptInput = StringMap;

export type FieldParseResult = {
  key: string;
  default: string;
  options: Array<string>;
  label: string;
  order: number;
  type?: string;
};

export type PromptInstruction = "PROMPT" | "AFTER";

export type FieldMap = Record<string, FieldParseResult>;

export type PromptStep = {
  promptTemplate: string;
  label?: string;
  inputValues: StringMap;
  outputValues: StringMap;
  prompt: string;
  error?: unknown;
  instruction?: PromptInstruction;
};

export type PromptNodeType = "preamble" | "template";

export interface PromptNode {
  type: PromptNodeType;
  instruction?: PromptInstruction;
  label?: string;
  template?: string;
}

export type PromptList = Array<PromptNode>;

export type LiquiPrompt = Array<PromptStep>;

export interface PromptContext {
  promptLabel: string; // FIXME: prompt
  inputValues: PromptInput; // FIXME: input
  outputValues: StringMap; // FIXME: output
}

export type PromptExecutionMode = "plan" | "test" | "run";

export interface PromptOptions {
  mode?: PromptExecutionMode;
  tags?: TagRegistrationMap;
}

export type TagRegisterFn = (
  name: string,
  ctx: PromptContext,
  opts: PromptOptions,
) => TagClass | TagImplOptions;

export type TagRegistrationMap = Record<string, TagFn>;

export interface DefaultTag {
  hash: Hash;
  fieldIndex: number;
}

export type TagFn = (
  name: string,
  ctx: PromptContext,
  values: StringMap,
  opts: PromptOptions,
  instance: DefaultTag,
) => Promise<string> | Promise<void> | string | void;

export type ValueExpression = {
  value?: string;
  label?: string;
  type: "value" | "variable";
};

export type TagHash = { [key: string]: string | boolean | number };
