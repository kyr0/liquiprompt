import type { TagFn } from "../interfaces";

/** 
  {% goto shorten %}
*/
export const defineGotoTag: TagFn = (_tagName, ctx, values) => {
  ctx.outputValues.CONTROL_FLOW_GOTO = Object.keys(values)[0];
};
