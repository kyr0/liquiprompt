import { plan } from "../src"
import { readFileSync } from "fs"
import prettyjson from "prettyjson"

const graphPrompt = readFileSync("data/prompt-templates/graph/test.liquid", "utf-8")

const result = await plan(graphPrompt, {
  RESULT_LENGTH: 99,
  MAX_LENGTH_CHARS: 104,
  user_context: 'Foo bar',
}, {
  tags: {

    inputMock: async(tagName, ctx, input, opts, instance) => {
      console.log('input mocking for', ctx.prompt)
      switch (ctx.prompt) {
        case "write fiction":
          ctx.input = {
            ...ctx.input,
            LALA: 123
          }
          break;
      }
    },

    // provide test mode mock data for each prompt
    mock: async(tagName, ctx, input, opts, instance) => {
      console.log('test mocking for', ctx.prompt)
      switch (ctx.prompt) {
        case "write fiction":
          ctx.output = {
            ...ctx.output,
            CONTROL_FLOW_RESULT: "This is a really beautiful fictional story on how a developer saved the world from a bug by doing alot of coding, using LLMs, etc."
          }
          break;

        case "shorten":
          ctx.output = {
            ...ctx.output,
            CONTROL_FLOW_RESULT: "Fictional Story: Developer saved the world from a bug."
          }
          break;
      }      
    }
  },
})


// plan()
// optimize({ examples: [] })
// runStep(index, { stream: true })
// runWorkflow({ stream: true })

console.log(prettyjson.render(result))