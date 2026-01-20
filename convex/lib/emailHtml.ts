/**
 * Story 7.4: Email HTML utilities
 * Converts plain text emails to HTML format with signature support
 */

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert plain text to HTML paragraphs
 * - Double newlines become paragraph breaks
 * - Single newlines become <br>
 */
function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * Check if signature is already HTML (starts with < after trimming)
 * Used for graceful migration of existing plain text signatures
 */
function isHtmlSignature(signature: string): boolean {
  const trimmed = signature.trim();
  return trimmed.startsWith("<");
}

/**
 * Wrap signature in HTML if it's plain text
 * Provides backwards compatibility with existing plain text signatures
 */
function wrapSignatureAsHtml(signature: string): string {
  if (!signature) return "";
  if (isHtmlSignature(signature)) return signature;
  // Plain text signature - wrap each line in <p> tags
  return signature
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");
}

/**
 * Wrap email content and signature as a complete HTML document
 * @param textContent - The email body as plain text
 * @param signature - The signature (can be HTML or plain text)
 */
export function wrapEmailAsHtml(
  textContent: string,
  signature: string
): string {
  const bodyHtml = textToHtml(textContent);
  const signatureHtml = wrapSignatureAsHtml(signature);
  // Note: Signature images now use absolute URLs stored directly in the signature HTML

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 20px;
    }
    p {
      margin: 0 0 1em 0;
    }
    .signature {
      margin-top: 24px;
    }
    .signature img {
      max-width: 200px;
      height: auto;
      display: block;
      margin-top: 8px;
    }
  </style>
</head>
<body>
${bodyHtml}
<div class="signature">
${signatureHtml}
</div>
</body>
</html>`;
}

/**
 * Create an HTML email without signature (for emails that don't need one)
 */
export function wrapEmailAsHtmlNoSignature(textContent: string): string {
  const bodyHtml = textToHtml(textContent);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 20px;
    }
    p {
      margin: 0 0 1em 0;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
