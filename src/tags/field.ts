import JSON5 from "json5";
import type { FieldParseResult, TagFn } from "../interfaces";

export const defaultMeta = (
  meta: Record<string, FieldParseResult>,
  key: string,
) => {
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

/** 
  {% field FIELD_NAME: "{ 
    default: 'bar', 
    label: 'foo', 
    options: ['bar', 'baz'] 
  }" %}

  {% field FIELD_NAME_2 = "{ options: ['bar', 'baz'] }" %} 
*/
export const defineFieldTag: TagFn = (
  _tagName,
  ctx,
  values,
  _opts,
  instance,
) => {
  const keys = Object.keys(values);

  for (const key of keys) {
    // lazy JSON5 parsing
    const value = JSON5.parse(
      // https://spec.json5.org/#summary-of-features => Strings may span multiple lines by escaping new line characters.
      String(values[key]).replace(/\n/g, "\\n"),
    ) as FieldParseResult;
    value.key = key;

    // evaluate default value
    ctx.outputValues[key] = ctx.inputValues[key] ?? value.default;

    if (!ctx.outputValues.PROMPT_FIELDS) {
      ctx.outputValues.PROMPT_FIELDS = {};
    }

    defaultMeta(ctx.outputValues.PROMPT_FIELDS, key);

    // meta data merge
    ctx.outputValues.PROMPT_FIELDS[key].default = value.default;

    ctx.outputValues.PROMPT_FIELDS[key].label = value.label ?? key;

    ctx.outputValues.PROMPT_FIELDS[key].type =
      value.type ?? autoDetectType(value);

    ctx.outputValues.PROMPT_FIELDS[key].order = instance.fieldIndex;

    if (value.options && Array.isArray(value.options)) {
      if (ctx.outputValues.PROMPT_FIELDS[key].default) {
        ctx.outputValues.PROMPT_FIELDS[key].default = String(value.options[0]);
      }
      ctx.outputValues.PROMPT_FIELDS[key].options = value.options.map((v) =>
        String(v),
      );
    }
    instance.fieldIndex++;
  }
  instance.fieldIndex = 0;
};
