import { describe, expect, test } from "bun:test";
import { decodeXmlEntities } from "./helpers";

describe("decodeXmlEntities", () => {
  test("returns undefined for undefined input", () => {
    expect(decodeXmlEntities(undefined)).toBeUndefined();
  });

  test("returns empty string unchanged", () => {
    expect(decodeXmlEntities("")).toBe("");
  });

  test("returns plain text unchanged", () => {
    expect(decodeXmlEntities("hello world")).toBe("hello world");
  });

  describe("predefined XML entities", () => {
    test("decodes &amp; to &", () => {
      expect(decodeXmlEntities("&amp;")).toBe("&");
      expect(decodeXmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    });

    test("decodes &lt; to <", () => {
      expect(decodeXmlEntities("&lt;")).toBe("<");
      expect(decodeXmlEntities("a &lt; b")).toBe("a < b");
    });

    test("decodes &gt; to >", () => {
      expect(decodeXmlEntities("&gt;")).toBe(">");
      expect(decodeXmlEntities("a &gt; b")).toBe("a > b");
    });

    test("decodes &apos; to '", () => {
      expect(decodeXmlEntities("&apos;")).toBe("'");
      expect(decodeXmlEntities("it&apos;s")).toBe("it's");
      expect(decodeXmlEntities("Aladdin&apos;s lamp")).toBe("Aladdin's lamp");
    });

    test('decodes &quot; to "', () => {
      expect(decodeXmlEntities("&quot;")).toBe('"');
      expect(decodeXmlEntities("say &quot;hello&quot;")).toBe('say "hello"');
    });

    test("decodes multiple entities in one string", () => {
      expect(decodeXmlEntities("&lt;div class=&quot;test&quot;&gt;")).toBe(
        '<div class="test">',
      );
      expect(decodeXmlEntities("&amp;&lt;&gt;&apos;&quot;")).toBe("&<>'\"");
    });
  });

  describe("numeric character references", () => {
    test("decodes decimal references &#N;", () => {
      expect(decodeXmlEntities("&#60;")).toBe("<");
      expect(decodeXmlEntities("&#62;")).toBe(">");
      expect(decodeXmlEntities("&#38;")).toBe("&");
      expect(decodeXmlEntities("&#39;")).toBe("'");
      expect(decodeXmlEntities("&#34;")).toBe('"');
    });

    test("decodes hexadecimal references &#xN;", () => {
      expect(decodeXmlEntities("&#x3C;")).toBe("<");
      expect(decodeXmlEntities("&#x3c;")).toBe("<"); // lowercase
      expect(decodeXmlEntities("&#x3E;")).toBe(">");
      expect(decodeXmlEntities("&#x26;")).toBe("&");
      expect(decodeXmlEntities("&#x27;")).toBe("'");
      expect(decodeXmlEntities("&#x22;")).toBe('"');
    });

    test("decodes unicode characters", () => {
      expect(decodeXmlEntities("&#169;")).toBe("\u00A9"); // copyright
      expect(decodeXmlEntities("&#x00A9;")).toBe("\u00A9"); // copyright hex
      expect(decodeXmlEntities("&#8212;")).toBe("\u2014"); // em dash
      expect(decodeXmlEntities("&#x2014;")).toBe("\u2014"); // em dash hex
    });
  });

  describe("edge cases", () => {
    test("handles mixed entities and text", () => {
      expect(decodeXmlEntities("a &amp; b &lt; c &gt; d")).toBe(
        "a & b < c > d",
      );
    });

    test("handles consecutive entities", () => {
      expect(decodeXmlEntities("&amp;&amp;&amp;")).toBe("&&&");
    });

    test("preserves unrecognized sequences", () => {
      // Unknown named entities should be preserved in XML mode
      expect(decodeXmlEntities("&unknown;")).toBe("&unknown;");
    });
  });
});
