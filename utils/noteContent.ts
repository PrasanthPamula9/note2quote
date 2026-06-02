const HTML_BREAK_REGEX = /<\s*br\s*\/?\s*>/gi;
const HTML_BLOCK_BREAK_REGEX = /<\/\s*(p|div|li|blockquote|h[1-6])\s*>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const HTML_MARKUP_HINT_REGEX = /<(html|p|br|strong|b|em|i|u|s|strike|del|ul|ol|li|blockquote|code|pre|h[1-6]|a)(\s|>|\/)/i;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function htmlToPlainText(html: string) {
  if (!html) {
    return '';
  }

  const normalized = decodeHtmlEntities(
    html
      .replace(HTML_BREAK_REGEX, '\n')
      .replace(HTML_BLOCK_BREAK_REGEX, '\n')
      .replace(HTML_TAG_REGEX, ' '),
  );

  return normalized
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function plainTextToEditorHtml(text: string) {
  const normalizedText = escapeHtml(text || '').replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  return `<html><p>${normalizedText}</p></html>`;
}

export function formatBodyForEditor(body: string) {
  if (!body) {
    return '';
  }

  return HTML_MARKUP_HINT_REGEX.test(body) ? body : plainTextToEditorHtml(body);
}

export function appendTextToEditorHtml(existingBody: string, text: string) {
  const safeText = htmlToPlainText(text);
  if (!safeText) {
    return existingBody;
  }

  const insertion = plainTextToEditorHtml(safeText).replace(/^<html>/, '').replace(/<\/html>$/, '');

  if (!existingBody) {
    return `<html>${insertion}</html>`;
  }

  if (!HTML_MARKUP_HINT_REGEX.test(existingBody)) {
    return plainTextToEditorHtml(`${htmlToPlainText(existingBody)}\n${safeText}`);
  }

  const trimmed = existingBody.trim();
  if (trimmed.endsWith('</html>')) {
    return trimmed.replace(/<\/html>$/i, `${insertion}</html>`);
  }

  return `${trimmed}${insertion}`;
}

export function getWordCountFromHtml(html: string) {
  const text = htmlToPlainText(html);
  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

export function getQuoteTextFromHtml(html: string) {
  return htmlToPlainText(html);
}
