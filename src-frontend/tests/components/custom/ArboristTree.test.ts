import { expect, test } from "vitest";
import { resourcesToArboristData } from "@/components/custom/ArboristTree";

test("resourcesToArboristData", () => {
  const resources = [
    { relative: "src/components/Button.tsx", content: "..." },
    { relative: "src/components/FileTree.tsx", content: "..." },
    { relative: "src/lib/utils.ts", content: "..." },
    { relative: "public/favicon.svg", content: "..." },
  ];
  const data = resourcesToArboristData(resources);
  console.log(data);
  expect(data).toEqual(
    expect.arrayContaining([
      { id: "src", name: "src", type: "folder", parentId: null },
      { id: "src/components", name: "components", type: "folder", parentId: "src" },
      { id: "src/components/Button.tsx", name: "Button.tsx", type: "file", content: "...", parentId: "src/components" },
      { id: "src/components/FileTree.tsx", name: "FileTree.tsx", type: "file", content: "...", parentId: "src/components" },
      { id: "src/lib", name: "lib", type: "folder", parentId: "src" },
      { id: "src/lib/utils.ts", name: "utils.ts", type: "file", content: "...", parentId: "src/lib" },
      { id: "public", name: "public", type: "folder", parentId: null },
      { id: "public/favicon.svg", name: "favicon.svg", type: "file", content: "...", parentId: "public" },
    ])
  );
});
