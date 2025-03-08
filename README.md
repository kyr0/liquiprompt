<span align="center">

  # LiquiPrompt

  > BASIC for prompt engineering.

  ### LiquiPrompt is a simple LLM prompt programming language to design and run RAG workflows.
  
  ## Key Features
  
  - 🔄 **Workflows** - Define complex, multi-step prompt workflows
  - 🧩 **Templates** - Use Liquid syntax for powerful prompt templating
  - 🏷️ **Custom Tags** - Extend functionality with custom tags
  - 🔍 **Vector Search** - Find similar examples for few-shot learning
  - 🧠 **Context Sharing** - Share data between prompts in a workflow
  - 🔄 **Loops** - Iterate until conditions are met

</span>

EXPERIMENTAL. This repository is work in progress.

> 🔬 The more complicated LLM apps get, the harder it becomes to maintain them. What if you could program an LLM like you can program a computer?

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up your API keys in .env file 
# (copy from env.example and add your keys)
cp env.example .env
```

## 🛠️ LLM Providers

LiquiPrompt supports multiple LLM providers:

* **OpenAI** - Using both the [cross-llm](https://www.npmjs.com/package/cross-llm) package and [Vercel AI SDK](https://www.npmjs.com/package/ai)
* **Anthropic Claude** - Using both the [cross-llm](https://www.npmjs.com/package/cross-llm) package and [Vercel AI SDK](https://www.npmjs.com/package/ai)

### Using Vercel AI SDK

```typescript
import { plan } from "liquiprompt";
import { openaiPrompt, claudePrompt } from "liquiprompt/orchestrator";

// Compile your prompt template
const compileResult = await plan(yourPromptTemplate);

// Execute with OpenAI
const openaiResponse = await openaiPrompt(
  compileResult.prompts[0].prompt,
  "gpt-3.5-turbo",
  { temperature: 0.7 }
);

// Execute with Claude
const claudeResponse = await claudePrompt(
  compileResult.prompts[0].prompt,
  "claude-3-sonnet-20240229",
  { temperature: 0.7 }
);
```

To run the Vercel AI SDK example:

```bash
# Set your API keys in .env file or environment
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Run the example
npm run example -- vercel-ai
```

## 🏃‍♂️ Running Examples

To run the available examples:

```bash
# Run one-shot prompt example
npm run example -- one-shot

# Run graph workflow example (with mocks)
npm run example -- graph

# Run horoscope example (with mocks)
npm run example -- horoscope

# Run real horoscope example (makes real API calls)
# You can pass a zodiac sign as an argument
npm run example -- real-horoscope Scorpio

# Run real horoscope with streaming output (experimental)
# Note: The streaming output may show visual artifacts
npm run example -- real-horoscope --stream Scorpio

# Run examples tag demo - demonstrates vector similarity search
npm run example -- examples-tag "Plan a website redesign project"
```

> **Note:** Make sure to set up your API keys in a `.env` file or environment variables when running examples that make real API calls (like `real-horoscope` or `examples-tag`).

## 💡 Example

The following prompt would limit the generated fiction text to maximum 1000 chars by iterating until the goal is reached.
It would also perform a few-shot exemplar optimization so that the generated fiction text is based on similar examples:

```liquid

--- PROMPT write fiction ---
{% use max_chars = 1000 %}
{% capture examples %}
  {% # performs a vector search based on {{ user_context }} text, and returns similar examples %}
  {% examples query='{{ user_context }}' count=3 source='data/examples' %}
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