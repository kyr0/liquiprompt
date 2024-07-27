import { plan } from "../src"
import { readFileSync } from "fs"

const graphPrompt = readFileSync("data/prompt-templates/graph/test.liquid", "utf-8")

const result = await plan(graphPrompt, {
  RESULT_LENGTH: 99,
  MAX_LENGTH_CHARS: 104,
  user_context: 'Foo bar',
}, {
  tags: {
    test: async(tagName, opts, values, instance) => {
      console.log('test mocking for', opts.promptLabel)
      
    },
    chars_to_words: async(tagName, opts, values, instance) => {

      console.log('tagName', tagName)
      console.log('opts', opts)
      console.log('values', values)
      console.log('instance', instance)
      
      return 'chars_to_words'    
    }
  },
})


// plan()
// optimize({ examples: [] })
// runStep(index, { stream: true })
// runWorkflow({ stream: true })

console.log('result', result)