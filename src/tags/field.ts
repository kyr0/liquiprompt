import {
  Hash,
  Tag,
  type TagToken,
  type Context,
  type TopLevelToken,
  type Liquid,
} from "liquidjs";
import JSON5 from "json5";
import type { FieldMap, FieldParseResult, StringMap } from "../interfaces";

export const defaultMeta = (meta: Record<string, FieldParseResult>, key: string) => {
  if (!meta[key]) {
    meta[key] = {
      key,
      default: "",
      options: [],
      label: key,
      order: 0,
      type: "text",
    };
  }
};


export const autoDetectType = (value: FieldParseResult): string => {
  if (
    value.options &&
    Array.isArray(value.options) &&
    value.options.length > 0
  ) {
    return "select";
  }

  if (value.default && typeof value.default === "number") {
    return "number";
  }

  if (value.default && value.default.indexOf("\n") !== -1) {
    return "textarea";
  }
  return "text";
};


export interface DefineFieldTagOpts {
  templateValues: StringMap; 
  meta: FieldMap; 
  inputValues: StringMap; 
}

/** 
 
  {% field FIELD_NAME: "{ 
    default: 'bar', 
    label: 'foo', 
    options: ['bar', 'baz'] 
  }" %}

  {% field FIELD_NAME_2 = "{ options: ['bar', 'baz'] }" %} 
*/
export const defineFieldTag = ({templateValues, meta, inputValues }: DefineFieldTagOpts) => (
  class DefaultTag extends Tag {
    private hash: Hash;
    private fieldIndex  = 0;
    constructor(
      tagToken: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(tagToken, remainTokens, liquid);

      this.fieldIndex = 0;
  
      const hashNonJekyllStyle = new Hash(tagToken.args);
      const hashJekyllStyle = new Hash(tagToken.args, true);
  
      const hashNonJekyllStyleHasUndefineds = Object.values(
        hashNonJekyllStyle.hash,
      ).some((v) => v === undefined);
      const hashJekyllStyleHasUndefineds = Object.values(
        hashJekyllStyle.hash,
      ).some((v) => v === undefined);
  
      // both syntaxes are supported
      this.hash = hashNonJekyllStyleHasUndefineds
        ? hashJekyllStyle
        : hashJekyllStyleHasUndefineds
          ? hashNonJekyllStyle
          : new Hash("");
    }
    *render(ctx: Context) {
      const hash: { [key: string]: string | boolean | number } =
        yield this.hash.render(ctx);
  
      const keys = Object.keys(hash);
  
      for (const key of keys) {
        // lazy JSON5 parsing
        const value = JSON5.parse(
          // https://spec.json5.org/#summary-of-features => Strings may span multiple lines by escaping new line characters.
          String(hash[key]).replace(/\n/g, "\\n"),
        ) as FieldParseResult;
        value.key = key;
  
        // evaluate default value
        templateValues[key] = inputValues[key] ?? value.default;
  
        defaultMeta(meta, key);
  
        // meta data merge
        meta[key].default = value.default;
  
        meta[key].label = value.label ?? key;
  
        meta[key].type = value.type ?? autoDetectType(value);
  
        meta[key].order = this.fieldIndex;
  
        if (value.options && Array.isArray(value.options)) {
          if (meta[key].default) {
            meta[key].default = String(value.options[0]);
          }
          meta[key].options = value.options.map((v) => String(v));
        }
        this.fieldIndex++;
      }
      this.fieldIndex = 0;
      return ""; // no rendering
    }
  }
)

