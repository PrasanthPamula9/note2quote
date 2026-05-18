# Template Engine

This folder contains a LangChain + LangGraph agent that turns reference images into a `note2quote` template JSON object.

## What the app accepts

The app normalizes templates into the nested `QuoteTemplate` shape defined in `types/quotes.ts`:

- `schema_version`
- `template_name`
- `canvas.preset`
- `background.image_uri`
- `background.crop`
- `background.color`
- `background.opacity`
- `typography.*`
- `layout.quote_text`
- `layout.text_boxes`
- `layout.text_x_percent`
- `layout.text_y_percent`
- `diagnostics` for review only

That object is later converted into the editor config that the SQLite table stores in `editor_config_json`.

## What this agent does

- Accepts one or more image inputs
- Infers the closest canvas preset
- Applies production UI rules for spacing, hierarchy, contrast, and legibility
- Uses only fonts supported by Note2Quote
- Emits strict JSON that matches the app contract
- Validates and repairs the output if the model drifts from the schema

## Setup

```sh
cd Template-Engine
npm install
```

Set your OpenAI key before running:

```sh
set OPENAI_API_KEY=your_key
```

For Gemini, the engine prefers the direct config key in `template-engine.config.json`, and the fallback env var is `GEMINI_API_KEY`.

## Run

```sh
npm run dev -- --image ../assets/test.jpg --brief "Create a premium quote template for this note screenshot"
```

If you have multiple images, pass multiple `--image` flags.

## Output

The CLI prints the final `QuoteTemplate` JSON to stdout.
