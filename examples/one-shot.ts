import { parse } from "../src"
import { readFileSync } from "fs"

const coachPrompt = readFileSync("data/prompt-templates/one-shot/coach.liquid", "utf-8")

const compileResult = parse(coachPrompt)

// parse()
// plan()
// optimize({ examples: [] })
// runStep(index, { stream: true })
// runWorkflow({ stream: true })

console.log(compileResult)