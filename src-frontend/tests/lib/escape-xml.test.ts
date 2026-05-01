import { describe, expect, test } from "vitest";
import { escapeXml } from "@/lib/escape-xml";

describe("escapeXml", () => {
  test("keeps ampersands for named or numeric entity suffixes unchanged", () => {
    expect(escapeXml("&lt; &#39; &#x27;")).toBe("&lt; &#39; &#x27;");
  });

  test("escapes ampersands when they are not followed by an entity suffix", () => {
    expect(escapeXml("& hello &#39 &#39; &")).toBe("&amp; hello &amp;#39 &#39; &amp;");
  });

  test("escapes lt gt double quote and single quote entities", () => {
    expect(escapeXml("<tag> \"quote\" 'apostrophe'"))
      .toBe("&lt;tag&gt; &quot;quote&quot; &apos;apostrophe&apos;");
  });

  test("handles mixed content predictably", () => {
    expect(escapeXml("&lt;div&gt; \"x\" & y 'z'"))
      .toBe("&lt;div&gt; &quot;x&quot; &amp; y &apos;z&apos;");
  });
});
