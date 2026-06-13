export function escapeXml(text: string): string {
  return (
    text
      // Step 1: Escape '&' only if it's NOT followed by a valid XML entity.
      .replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;")
      // Step 2: Escape other special characters.
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

export function clearXmlInvalidChars(text: string) {
  return (
    text
      // biome-ignore lint/suspicious/noControlCharactersInRegex: cleaning XML invalid controling characters
      .replace(/\x0C/g, "\n")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: cleaning XML invalid controling characters
      .replace(/[\x00-\x08\x0B\x0E-\x1F\uFFFE\uFFFF]/g, "")
  );
}

export function escapeUserContentInXml(
  text: string,
  targetTag: string,
  strict: boolean = false,
): string {
  const openRegex = new RegExp(`<${targetTag}(\\s[^>]*)?>`);
  const openMatch = openRegex.exec(text);
  const close = `</${targetTag}>`;
  const endIdx = text.lastIndexOf(close);

  if (openMatch === null || endIdx === -1) {
    if (strict) {
      throw new Error(`Tag "${targetTag}" not found.`);
    } else {
      return text;
    }
  }

  const openEndIdx = openMatch.index + openMatch[0].length;
  const before = text.slice(0, openEndIdx);
  const content = text.slice(openEndIdx, endIdx);
  const after = text.slice(endIdx);

  const escapedContent = escapeXml(clearXmlInvalidChars(content));
  return `${before}${escapedContent}${after}`;
}
