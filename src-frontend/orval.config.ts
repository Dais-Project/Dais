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
        fetch: {
          includeHttpResponseReturnType: false,
        },
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
      afterAllFilesWrite: ['biome format --write --config-path biome.format.jsonc'],
    },
  },
});
