import type { SyncTagFn } from "../interfaces";

/** 
  {% goto shorten %}
*/
export const defineGotoTag: SyncTagFn = (_tagName, ctx, values) => {
  ctx.output.CONTROL_FLOW_GOTO = Object.keys(values)[0];
};
