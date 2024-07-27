import type { TagFn } from "../interfaces";

/** 
  {% done %}
*/
export const defineDoneTag: TagFn = (_tagName, ctx) => {
  ctx.outputValues.CONTROL_FLOW_DONE = true;
};
