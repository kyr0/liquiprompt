import {
  type Context,
  Hash,
  Tag,
  type TagToken,
  type Liquid,
  type TopLevelToken,
} from "liquidjs";
import type {
  DefaultTag,
  PromptContext,
  PromptOptions,
  StringMap,
  TagHash,
  TagRegisterFn,
  TagRegistrationMap,
} from "./interfaces";
import { defineFieldTag } from "./tags/field";
import { defineGotoTag } from "./tags/goto";
import { defineDoneTag } from "./tags/done";
import { defineWordcountTag } from "./tags/wordcount";
import { defineExamplesTag } from "./tags/examples";
import { parseValueExpression } from "./parser";
import { runGenerator } from "./generator";

export const builtInTags: TagRegistrationMap = {
  field: defineFieldTag,
  goto: defineGotoTag,
  done: defineDoneTag,
  wordcount: defineWordcountTag,
  examples: defineExamplesTag,
};

export const registerTags = (
  engine: Liquid,
  opts: PromptContext,
  parseOpts: PromptOptions,
) => {
  // TODO: register tags by sync or async, default async, combined
  try {
    const tagNames = Object.keys(builtInTags);

    // register built-in tags (sync)
    for (const tagName of tagNames) {
      engine.registerTag(tagName, defineSyncTag(tagName, opts, parseOpts));
    }
  } catch (e) {
    console.error("ERROR registerTags", e);
  }

  // register custom tags (async)
  Object.keys(parseOpts.tags || []).forEach((tagName) => {
    engine.registerTag(tagName, defineAsyncTag(tagName, opts, parseOpts));
  });
  return engine;
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

export const getHash = (tagTokenValue: string): Hash => {
  const hashNonJekyllStyle = new Hash(tagTokenValue);
  const hashJekyllStyle = new Hash(tagTokenValue, true);

  const hashNonJekyllStyleHasUndefineds = Object.values(
    hashNonJekyllStyle.hash,
  ).some((v) => v === undefined);
  const hashJekyllStyleHasUndefineds = Object.values(hashJekyllStyle.hash).some(
    (v) => v === undefined,
  );

  // both syntaxes are supported
  return hashNonJekyllStyleHasUndefineds
    ? hashJekyllStyle
    : hashJekyllStyleHasUndefineds
      ? hashNonJekyllStyle
      : new Hash("");
};

export const defineSyncTag: TagRegisterFn = (
  tagName: string,
  defineTagOpts,
  parseOpts,
) =>
  class BuiltInTag extends Tag implements DefaultTag {
    hash: Hash;
    fieldIndex: number;
    constructor(
      tagToken: TagToken,
      remainTokens: Array<TopLevelToken>,
      liquid: Liquid,
    ) {
      super(tagToken, remainTokens, liquid);
      this.fieldIndex = 0;
      this.hash = getHash(tagToken.args);
    }
    *render(ctx: Context) {
      const values = parseTagHashValues(
        yield this.hash.render(ctx),
        defineTagOpts.outputValues,
        defineTagOpts.inputValues,
      );

      let renderString = "";
      if (typeof builtInTags[tagName] === "function") {
        renderString = builtInTags[tagName](
          tagName,
          defineTagOpts,
          values,
          parseOpts,
          this,
        ) as string;
      }
      return renderString || "";
    }
  };

export const defineAsyncTag: TagRegisterFn = (
  tagName: string,
  defineTagOpts,
  parseOpts,
) =>
  class CustomTag extends Tag implements DefaultTag {
    hash: Hash;
    fieldIndex: number;
    constructor(
      tagToken: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(tagToken, remainTokens, liquid);
      this.fieldIndex = 0;
      this.hash = getHash(tagToken.args);
    }

    async render(ctx: Context) {
      const tagHashGenerator = runGenerator(
        this.hash.render(ctx) as Generator<
          unknown,
          Generator<StringMap>,
          unknown
        >,
      );

      const tagHash: StringMap = {};

      for (const key in tagHashGenerator) {
        const value = runGenerator(tagHashGenerator[key]);
        tagHash[key] = value;
      }

      const values = parseTagHashValues(
        tagHash,
        defineTagOpts.outputValues,
        defineTagOpts.inputValues,
      );
      let renderString = "";

      if (typeof parseOpts.tags![tagName] === "function") {
        renderString =
          (await parseOpts.tags![tagName](
            tagName,
            defineTagOpts,
            values,
            parseOpts,
            this,
          )) || "";
      }
      return renderString || "";
    }
  };
