# Template Agent Considerations

If you want an AI agent to generate quote templates from reference images, define one strict template contract and make the agent output only that contract.

The app now treats the nested template JSON below as the canonical interchange format. The editor and database can convert it into the flat runtime config, so the agent should not invent its own shape.

## SQLite Storage Shape

The actual SQLite table for quotes is:

- `id TEXT PRIMARY KEY NOT NULL`
- `quote_text TEXT NOT NULL`
- `background_image_uri TEXT`
- `editor_config_json TEXT`
- `created_at INTEGER NOT NULL`
- `updated_at INTEGER NOT NULL`

That means any backend-generated template must ultimately serialize into `editor_config_json` using the app's `QuoteEditorConfig` shape. The nested template format is useful for generation, but the saved record still has to land in the SQLite row above.

## Key Considerations

- Use one canonical JSON schema for all templates.
- Normalize everything to canvas-relative values, not pixels.
- Separate fixed template elements from editable text boxes.
- Keep a hard limit on editable boxes, since the editor supports up to 5.
- Preserve the exact canvas preset the template was designed for.
- Decide what the agent is allowed to infer versus what must come directly from the image.
- Validate the output before saving it to SQLite.
- Always render a preview after generation, because image-to-layout extraction will never be perfect.
- Keep font names, colors, and weights within what the app actually supports.
- Handle missing or unavailable fonts with fallback values.
- Make sure the agent returns machine-readable JSON only, not mixed prose.

## Canonical Template Schema

This is the template contract the agent should emit:

```json
{
  "schema_version": 1,
  "template_name": "Minimal Quote Card",
  "canvas": {
    "preset": "instagram_post_square"
  },
  "background": {
    "image_uri": null,
    "crop": null,
    "color": "#222222",
    "opacity": 0.6
  },
  "typography": {
    "font_size": 14,
    "font_color": "white",
    "font_family": "serif",
    "font_shadow": 0,
    "font_weight": 700,
    "text_align": 2
  },
  "layout": {
    "quote_text": "Be the change you want to see.",
    "text_boxes": [
      {
        "id": "text-1",
        "text": "Be the change",
        "x_percent": 0.08,
        "y_percent": 0.24,
        "width_percent": 0.84,
        "height_percent": 0.18
      }
    ],
    "text_x_percent": 0.08,
    "text_y_percent": 0.24
  },
  "diagnostics": {
    "source_image_uri": null,
    "source_image_width": null,
    "source_image_height": null,
    "confidence": 0.91,
    "warnings": [],
    "notes": "Optional agent notes"
  }
}
```

## Mapping Rules

- `canvas.preset` must always be one of the supported canvas keys.
- `background.image_uri` is the source or reference image URI, if the template uses one.
- `background.crop` should use source-image pixels when available.
- `typography` describes the global defaults for all editable text boxes.
- `layout.text_boxes` is the editable structure the editor actually uses.
- `layout.quote_text` should match the visible text after joining the editable boxes.
- `diagnostics` is for review only and should never affect rendering.
- For built-in color templates, always create two boxes: one for the quote and one for the author line.

## Recommended Template Rules

- Use percentages for `x_percent`, `y_percent`, `width_percent`, and `height_percent`.
- Keep `text_boxes.length <= 5`.
- Use one box per visible text region in the template image.
- Preserve spacing between boxes if the image has stacked text.
- If a template has a title and subtitle, map them to separate boxes.
- If the image has only one quote block, use one text box.
- If the image uses stylized text, capture the closest supported style, not an exact visual clone.
- If text is decorative or non-editable, treat it as part of the background image instead of a text box.

## Suggested Agent Pipeline

1. Input the template image.
2. Detect the canvas ratio and map it to the nearest preset.
3. Detect text regions and sort them top to bottom.
4. Extract text content with OCR.
5. Estimate each box position and width in percentages.
6. Infer font style tokens only if they are supported by the app.
7. Generate JSON matching the template schema.
8. Validate the JSON against schema rules.
9. Render a preview.
10. Let a human approve or tweak before saving.

## Important Design Choices

- Do not let the agent invent unsupported fields.
- Do not store raw image coordinates if the editor uses relative layout.
- Do not let OCR text overwrite the editable layout unless that is explicitly intended.
- Do not depend on one-shot output; use generate, validate, preview, correct.
- Keep a fallback mode for templates that are image-only.

## Practical Rule

The agent should output one strict template JSON object and, if needed, a separate human-readable review note. The JSON should remain stable enough to convert into the editor config without extra parsing rules.
