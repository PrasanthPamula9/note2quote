# Template Agent Considerations

If you want an AI agent to generate quote templates from reference images, the most important thing is to define a strict template contract first and make the agent output only that contract.

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

## Current App Schema

The current saved shape already gives a good target:

- `activeCanvasKey`
- `background_image_uri`
- `image_opacity`
- `bg_color`
- `font_size`
- `font_color`
- `font_family`
- `font_shadow`
- `font_weight`
- `text_align`
- `quote_text`
- `text_boxes`
- `text_x_percent`
- `text_y_percent`

That means the agent should ideally generate:

- the canvas preset
- the background style
- the global defaults
- the text box array with positions and styles

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
5. Estimate each box’s position and width in percentages.
6. Infer font style tokens only if they are supported by the app.
7. Generate JSON matching the SQLite save schema.
8. Validate the JSON against schema rules.
9. Render a preview.
10. Let a human approve or tweak before saving.

## Important Design Choices

- Don’t let the agent invent unsupported fields.
- Don’t store raw image coordinates if the editor uses relative layout.
- Don’t let OCR text overwrite the editable layout unless that is explicitly intended.
- Don’t depend on one-shot output; use generate, validate, preview, correct.
- Keep a fallback mode for templates that are image-only.

## Useful Extra Fields For The Agent Output

If you want better reliability, have the agent also return:

- `template_name`
- `source_image_width`
- `source_image_height`
- `confidence`
- `warnings`
- `detected_text_regions`
- `ocr_text`
- `notes`

That gives you a better debugging trail without changing the actual editor schema.

## Practical Rule

The agent should output two things:

- a strict `editor_config` JSON for saving
- a diagnostic section for review

## Example Output Shape

```json
{
  "template_name": "Minimal Quote Card",
  "activeCanvasKey": "instagram_post_square",
  "background_image_uri": null,
  "image_opacity": 0.6,
  "bg_color": "#222222",
  "font_size": 14,
  "font_color": "white",
  "font_family": "serif",
  "font_shadow": 0,
  "font_weight": 700,
  "text_align": 2,
  "quote_text": "Be the change you want to see.",
  "text_boxes": [
    {
      "id": "text-1",
      "text": "Be the change",
      "x_percent": 0.08,
      "y_percent": 0.24,
      "width_percent": 0.84,
      "height_percent": 0.18
    },
    {
      "id": "text-2",
      "text": "you want to see.",
      "x_percent": 0.08,
      "y_percent": 0.42,
      "width_percent": 0.84,
      "height_percent": 0.18
    }
  ],
  "text_x_percent": 0.08,
  "text_y_percent": 0.24,
  "confidence": 0.91,
  "warnings": []
}
```

