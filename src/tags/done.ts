import type { SyncTagFn } from "../interfaces";

/** 
  {% done %}
*/
export const defineDoneTag: SyncTagFn = (_tagName, ctx) => {
  ctx.output.CONTROL_FLOW_DONE = true;
};
