import { defineConfig } from "orval";

const operationSpecificConfig = {
  fetch_models: {
    query: {
      useInfinite: false,
      useSuspenseInfiniteQuery: false,
    },
  },
};

export default defineConfig({
  api: {
    input: {
      target: "../openapi.json",
    },
    output: {
      clean: true,
      target: "./src/api/generated/endpoints/",
      schemas: "./src/api/generated/schemas/",
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
          version: 5,
          useQuery: true,
          useInfinite: true,
          useMutation: true,
          useSuspenseQuery: true,
          useSuspenseInfiniteQuery: true,
        },
        operations: operationSpecificConfig,
      },
    },
    hooks: {
      afterAllFilesWrite: [
        "biome format --write --config-path biome.format.jsonc",
      ],
    },
  },
});
