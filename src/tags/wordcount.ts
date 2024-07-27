import type { TagFn } from "../interfaces";

/** 
  {% wordcount chars='{{ max_chars }}' %}
*/
export const defineWordcountTag: TagFn = (_tagName, ctx, values) => {
  const chars: number =
    typeof values.chars === "string" ? Number.parseInt(values.chars) : 0;

  if (chars > 5) {
    return (chars / 5).toFixed(0);
  }
  return "1";
};
