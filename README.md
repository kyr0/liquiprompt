<span align="center">

  # LiquiPrompt

  > BASIC for prompt engineering.

  ### LiquiPrompt is a simple LLM prompt programming language to design and run RAG workflows.

</span>

EXPERIMENTAL. This repository is work in progress.

> 🔬 The more complicated LLM apps get, the harder it becomes to maintain them. What if you could program an LLM like you can program a computer?

## 💡 Example

The following prompt would limit the generated fiction text to maximum 1000 chars by iterating until the goal is reached.
It would also perform a few-shot exemplar optimitation so that the generated fiction text is 

```liquid




--- PROMPT write fiction ---
{% use max_chars = 1000 %}
{% capture examples %}
  {% # performs a vector search based on {{ user_context }} text, and returns top #3 results %}
  {% exemplar_few_shot var='user_context' results = 3 %}
{% endcapture %}
{% use model = 'openai/gpt-4-turbo' %}
{% use temperature = 0.7 %}

Generate a {% if max_chars < 1000 %}short{% endif %} fiction text of max. {% chars_to_words var='max_chars' %} words.

EXAMPLES: 
{{ examples }}

--- WHEN write fiction IS DONE ---
{% if prev_generation_chars > max_chars %}
  {% goto shorten %}
{% endif %}
  {% done %}
{% endif %}

--- PROMPT shorten ---
{% use model = 'anthropic/claude-sonnet-3.5' %}
{% use temperature = 0.01 %}

Shorten the text following text to {% chars_to_words var='max_chars' %} words:

{{ prev_generation_text }}

--- WHEN shorten is DONE ---
{% if prev_generation_chars > max_chars %}
  {% goto shorten %}
{% else %}
  {% done %}
{% endif %}



```


DE:
```liquid


--- PROMPT gedicht schreiben ---
{% nimm maximale_zeichen = 1000 %}
{% lese beispiel_gedichte %}
  {% # sucht mit dem {{ eingabe }} Text nach passenden Beispielen, nimmt die 3 besten Ergebnisse und speichert sie in {{ beispiel_gedichte }} %}
  {% archiv_suche nimm='{{ eingabe }}' ergebnisse = 3 %}
{% endelese %}
{% nimm modell = 'openai/gpt-4-turbo' %}
{% nimm temperatur = 0.7 %}

Schreibe ein {% wenn maximale_zeichen < 1000 %}kurzes{% endewenn %} Gedicht mit maximal {% zeichen_zu_wörtern nimm='{{ maximale_zeichen }}' %} Wörtern.

BEISPIELE: 
{{ beispiel_gedichte }}


--- WENN gedicht schreiben FERTIG IST ---
{% wenn ergebnis_zeichen > maximale_zeichen %}
  {% starte text kürzen %}
{% ansonsten %}
  {% fertig %}
{% endewenn %}


--- PROMPT text kürzen ---
{% nimm modell = 'anthropic/claude-sonnet-3.5' %}
{% nimm temperatur = 0.01 %}

Kürze den folgenden text auf {% zeichen_zu_wörtern nimm='{{ maximale_zeichen }}' %} Wörter:

{{ ergebnis }}


--- WENN text kürzen FERTIG IST ---
{% wenn ergebnis_zeichen > maximale_zeichen %}
  {% starte text kürzen %}
{% ansonsten %}
  {% fertig %}
{% endewenn %}







```






## 📚 Usage

### 1. Install LiquiPrompt:

`npm/yarn/bun install liquiprompt`

### 2. Parse it

```ts
import { parse } from "liquiprompt";
import ExamplePrompt from "./data/prompts/fiction_example.liquid";

const parseResult = parse(ExamplePrompt)

if (parseResult.errors) {
  console.error('Parse errors:', parseResult.errors)
}
```

### 3. Run it

```ts
import { run } from "liquiprompt";
import ExamplePrompt from "./data/prompts/fiction_example.liquid";


```

Example: [`quality-prompt.ts`](./examples/quality-prompt.ts)
Run: `npm run example quality-prompt.ts`

```ts
import { qualityPrompt } from "quality-prompts-js"

const directive = "You are given a document and your task..."
const additionalInformation = "In the knowledge graph, ..."
const outputFormatting = "You will respond with a knowledge graph in..."

const prompt = qualityPrompt(
  directive,
  additionalInformation,
  outputFormatting,
  []
)
```

### 3. QualityPrompts searches and uses only the few-shot examples that are relevant to the user's query

Example: [`few-shot.ts`](./examples/few-shot.ts)
Run: `npm run example few-shot.ts`


```ts
import { fewShot } from "quality-prompts-js"

// see ./examples/few-shot.ts for a fully working example
const relevantExamples = await fewShot(
 "list the disorders included in cvd",
  [...],
  2 // 2-shot 
)
```

### 4. Simply call one of several prompting techniques to your prompt

##### System2Attention
Helps clarify the given context as an additinoal step before it's used to answer the question

Example: [`system2attention.ts`](./examples/system2attention.ts)
Run: `npm run example system2attention.ts`

```ts
import { system2Attention } from "quality-prompts-js"

const inputText = "list the disorders included in cvd"
const userContextInformation = "Problem with heart rate."

const attentionOptimizedPrompt = await system2Attention(inputText, userContextInformation)

console.log("Optimized attention prompt: ", attentionOptimizedPrompt)
```

```
>> You are given a document and your task is to create a knowledge graph from it.
        
In the knowledge graph, entities such as people, places, objects, institutions, topics, ideas, etc. are represented as nodes.
Whereas the relationships and actions between them are represented as edges.

Example input: Cardiovascular disease (CVD) encompasses a spectrum of...
Example output: [{'entity': 'cardiovascular disease (cvd)', 'connections': ...

You will respond with a knowledge graph in the given JSON format:

[
    {"entity" : "Entity_name", "connections" : [
        {"entity" : "Connected_entity_1", "relationship" : "Relationship_with_connected_entity_1},
        {"entity" : "Connected_entity_2", "relationship" : "Relationship_with_connected_entity_2},
        ]
    },
]
```

#### Tabular Chain of Thought Prompting
Prompts the LLM to think step by step and write the step, process and result of each step in a markdown table.
Significantly boosts accuracy in solving math problems.

Example: [`tabular-chain-of-thought.ts`](./examples/tabular-chain-of-thought.ts)
Run: `npm run example tabular-chain-of-thought.ts`

```ts
import { tabularChainOfThoughtPrompting, qualityPrompt } from "quality-prompts-js"

const inputText = `Jackson is planting tulips. He can fit 6 red tulips in a row and 8 blue
tulips in a row. If Jackson buys 36 red tulips and 24 blue tulips, how
many rows of flowers will he plant?`

const directive = "Solve the given math problem"

const tabularChain = await tabularChainOfThoughtPrompting(inputText, directive, "")

const systemPrompt = qualityPrompt(tabularChain.directive, tabularChain.outputFormatting)

console.log("Optimized tabular chain of thought prompt: ", systemPrompt)
```

```
Solve the given math problem.
Think through the problem step by step to solve it.
At each step, you have to figure out:
- the step number,
- the sub-question to be answered in that step,
- the thought process of solving that step, and
- the result of solving that step.
Respond in the following markdown table format for each step:
|step|subquestion|process|result|    
```

### 6. Upcoming: Easily evaluate different prompting techniques

