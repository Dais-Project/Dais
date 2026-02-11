import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../openapi.json",
    },
    output: {
      clean: true,
      target: "./src/api/endpoints/",
      schemas: "./src/api/schemas/",
      client: "react-query",
      mode: "tags-split",
      override: {
        mutator: {
          path: "./src/api/custom-fetch.ts",
          name: "fetchApi",
        },
        query: {
          useQuery: true,
          useInfinite: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: ["biome format --write"],
    },
  },
});
