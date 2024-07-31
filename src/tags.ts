import {
  type Context,
  Hash,
  Tag,
  type TagToken,
  type Liquid,
  type TopLevelToken,
} from "liquidjs";
import type {
  AsyncTagFn,
  DefaultTag,
  PromptContext,
  PromptOptions,
  StringMap,
  SyncTagFn,
  TagHash,
  TagRegisterFn,
  TagRegistrationMap,
} from "./interfaces";
import { defineFieldTag } from "./tags/field";
import { defineGotoTag } from "./tags/goto";
import { defineDoneTag } from "./tags/done";
import { defineWordcountTag } from "./tags/wordcount";
import { defineExamplesTag } from "./tags/examples";
import { parseTagHashValues } from "./parser";
import { runGenerator } from "./generator";

export const builtInTags: TagRegistrationMap<SyncTagFn> = {
  field: defineFieldTag,
  goto: defineGotoTag,
  done: defineDoneTag,
  wordcount: defineWordcountTag,
  examples: defineExamplesTag,
};

export const registerTags = (
  engine: Liquid,
  ctx: PromptContext,
  opts: PromptOptions,
  tags: TagRegistrationMap<SyncTagFn | AsyncTagFn>,
  type: "async" | "sync",
) => {
  const registerFunction = type === "async" ? defineAsyncTag : defineSyncTag;
  try {
    const tagNames = Object.keys(tags);
    for (const tagName of tagNames) {
      engine.registerTag(
        tagName,
        registerFunction(tagName, ctx, opts, tags[tagName]),
      );
    }
  } catch (e) {
    console.error("ERROR registerTags", e);
  }
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
  tagName,
  defineTagOpts,
  parseOpts,
  tagFn,
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
        defineTagOpts.output,
        defineTagOpts.input,
      );

      let renderString = "";
      if (typeof tagFn === "function") {
        renderString = tagFn(
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
  tagFn,
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
        defineTagOpts.output,
        defineTagOpts.input,
      );
      let renderString = "";

      if (typeof tagFn === "function") {
        renderString =
          (await tagFn(tagName, defineTagOpts, values, parseOpts, this)) || "";
      }
      return renderString || "";
    }
  };
