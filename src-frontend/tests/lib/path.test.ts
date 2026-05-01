import { describe, expect, test } from "vitest";
import { getFileExtension } from "@/lib/path";

describe("getFileExtension", () => {
  test("returns the extension for a simple file name", () => {
    expect(getFileExtension("index.ts")).toBe("ts");
  });

  test("returns the last extension for nested paths", () => {
    expect(getFileExtension("src/lib/archive.tar.gz")).toBe("gz");
  });

  test("supports Windows path separators", () => {
    expect(getFileExtension("C:\\work\\file.txt")).toBe("txt");
  });

  test("returns null when there is no extension", () => {
    expect(getFileExtension("README")).toBeNull();
  });

  test("returns null for hidden files without a basename", () => {
    expect(getFileExtension(".gitignore")).toBeNull();
  });

  test("returns an empty string when the file name ends with a dot", () => {
    expect(getFileExtension("file.")).toBe("");
  });
});
