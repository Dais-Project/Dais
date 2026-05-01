export function escapeXml(text: string): string {
  return text
    // Step 1: Escape '&' only if it's NOT followed by a valid XML entity.
    .replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;')
    // Step 2: Escape other special characters.
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
