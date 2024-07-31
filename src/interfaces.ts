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

export type PromptNodeType = "preamble" | "template";

export interface PromptNode {
  type: PromptNodeType;
  instruction?: PromptInstruction;
  label?: string;
  template?: string;
}

export type PromptList = Array<PromptNode>;

export interface PromptContext {
  prompt: string;
  input: PromptInput;
  output: StringMap;
}

export type PromptExecutionMode = "plan" | "test" | "run";

export interface PromptOptions {
  mode?: PromptExecutionMode;
  tags?: TagRegistrationMap<AsyncTagFn>;
  syncTags?: TagRegistrationMap<SyncTagFn>;
}

export type TagRegisterFn = (
  name: string,
  ctx: PromptContext,
  opts: PromptOptions,
  tagFn: SyncTagFn | AsyncTagFn,
) => TagClass | TagImplOptions;

export type TagRegistrationMap<T> = Record<string, T>;

export interface DefaultTag {
  hash: Hash;
  fieldIndex: number;
}

export type TagFn<T> = (
  name: string,
  ctx: PromptContext,
  values: StringMap,
  opts: PromptOptions,
  instance: DefaultTag,
) => T;

export type AsyncTagFn = TagFn<Promise<string> | Promise<void>>;
// biome-ignore lint/suspicious/noConfusingVoidType: necessary for tags with no return value
export type SyncTagFn = TagFn<string | void>;

export type ValueExpression = {
  value?: string;
  label?: string;
  type: "value" | "variable";
};

export type TagHash = { [key: string]: string | boolean | number };

export interface PromptParsed {
  name: string;
  instruction?: string;
  tpl: string;
  input: StringMap;
  output: StringMap;
  prompt: string;
  error?: string;
}

export type LiquiPrompt = Array<PromptParsed>;

export interface PlanModeResult {
  prompts: Array<PromptParsed>;
  errors: Array<string>;
  /** output variables in "plan" mode aggregate (merge) all output variables of all steps that have been visited by the compiler,
   * following each single prompt control flow given the initial input variables. This can be helpful for use-cases where custom tags
   * add meta-data over variables used in prompts etc. (see "fields" example) */
  output: StringMap;
}
