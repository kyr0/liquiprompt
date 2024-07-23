import { parse } from "../src"
import { readFileSync } from "fs"

const graphPrompt = readFileSync("data/prompt-templates/graph/test.liquid", "utf-8")

const compileResult = parse(graphPrompt, {
  RESULT_LENGTH: 99,
  MAX_LENGTH_CHARS: 104,
})

// parse()
// plan()
// optimize({ examples: [] })
// runStep(index, { stream: true })
// runWorkflow({ stream: true })

console.log('compileResult', compileResult)