export type StringMap = Record<string, any>;

export type FieldParseResult = {
  key: string;
  default: string;
  options: Array<string>;
  label: string;
  order: number;
  type?: string;
};

export type PromptInstruction = "PROMPT" | "AFTERPROMPT";

export type FieldMap = Record<string, FieldParseResult>;

export type ParseResult = {
  promptTemplate: string;
  meta: FieldMap;
  inputValues: StringMap;
  templateValues: StringMap;
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
