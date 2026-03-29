import { expect, test } from "vitest";
import { arboristDataToResources, buildTree, resourcesToArboristData } from "@/components/custom/file-tree";

test("resourcesToArboristData", () => {
  const resources = [
    { relative: "src/components/Button.tsx", content: "..." },
    { relative: "src/components/FileTree.tsx", content: "..." },
    { relative: "src/lib/utils.ts", content: "..." },
    { relative: "public/favicon.svg", content: "..." },
    { relative: "index.html", content: "..." },
  ];
  const data = resourcesToArboristData(resources);
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
      { id: "index.html", name: "index.html", type: "file", content: "...", parentId: null },
    ])
  );
});

test("arboristDataToResources", () => {
  const originalResources = [
    { relative: "src/components/Button.tsx", content: "..." },
    { relative: "src/components/FileTree.tsx", content: "..." },
    { relative: "index.ts", content: "..." },
  ];
  const data = resourcesToArboristData(originalResources);
  const resources = arboristDataToResources(data);
  expect(resources).toEqual(
    expect.arrayContaining(originalResources)
  );
});

test("buildTree", () => {
  const data = resourcesToArboristData([
    { relative: "src/components/Button.tsx", content: "..." },
    { relative: "src/components/FileTree.tsx", content: "..." },
    { relative: "index.ts", content: "..." },
  ]);
  const tree = buildTree(data);
  expect(tree).toEqual(
    expect.arrayContaining([
      {
        id: "src",
        name: "src",
        parentId: null,
        type: "folder",
        children: [
          {
            id: "src/components",
            name: "components",
            parentId: "src",
            type: "folder",
            children: [
              {
                id: "src/components/Button.tsx",
                name: "Button.tsx",
                parentId: "src/components",
                type: "file",
                content: "...",
              },
              {
                id: "src/components/FileTree.tsx",
                name: "FileTree.tsx",
                parentId: "src/components",
                type: "file",
                content: "...",
              },
            ],
          },
        ],
      },
      { id: "index.ts", name: "index.ts", type: "file", content: "...", parentId: null },
    ])
  );
});
