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