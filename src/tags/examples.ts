import type { SyncTagFn } from "../interfaces";

/** 
  {% examples query='{{ user_context }}' count=3 %}
*/
export const defineExamplesTag: SyncTagFn = (_tagName, _ctx, values) => {
  console.log("Load examples from", values.query, "count", values.count);
  return "asd";
};
