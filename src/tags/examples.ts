import type { TagFn } from "../interfaces";

/** 
  {% examples query='{{ user_context }}' count=3 %}
*/
export const defineExamplesTag: TagFn = async (_tagName, _ctx, values) => {
  // FIXME: count is undefined
  console.log("Load examples from", values.query, "count", values.count);
};
