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

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(str: string): string {
  const binary = atob(str);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class XmlRawContentParseError extends Error {}

export class XmlRawContentParser {
  private constructor(
    private parsed: Document,
    private rawContentTags: string[],
  ) {}

  static parse(
    text: string,
    userContentTags: string[] = [],
  ): XmlRawContentParser {
    let processed = text;
    for (const tagName of userContentTags) {
      processed = XmlRawContentParser.encodeRawContentTag(processed, tagName);
    }

    const doc = new DOMParser().parseFromString(processed, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new XmlRawContentParseError(parseError.textContent);
    }

    return new XmlRawContentParser(doc, userContentTags);
  }

  private static encodeRawContentTag(
    text: string,
    tagName: string,
    strict: boolean = false,
  ): string {
    const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const openRegex = new RegExp(`<${escapedTagName}(\\s[^>]*)?>`);
    const close = `</${tagName}>`;

    const openMatch = openRegex.exec(text);
    const endIdx = text.lastIndexOf(close);

    if (!openMatch || endIdx === -1) {
      if (strict) {
        throw new Error(`Tag "${tagName}" not found.`);
      } else {
        return text;
      }
    }

    const openEnd = openMatch.index + openMatch[0].length;
    const before = text.slice(0, openEnd);
    const content = text.slice(openEnd, endIdx);
    const after = text.slice(endIdx);

    return `${before}${encodeBase64(content)}${after}`;
  }

  get doc(): Document {
    return this.parsed;
  }

  getRawContent(tagName: string): string | null {
    if (!this.rawContentTags.includes(tagName)) {
      throw new Error(`Not a valid raw content tag name ${tagName}`);
    }

    const el = this.parsed.querySelector(tagName);
    if (el === null) return null;
    return decodeBase64(el.textContent);
  }
}
