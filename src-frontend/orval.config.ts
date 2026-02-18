import { defineConfig, type InputOptions, type OperationOptions } from "orval";

const operationSpecificConfig: Record<string, OperationOptions> = {
  fetch_models: {
    query: {
      useInfinite: false,
      useSuspenseInfiniteQuery: false,
    },
  },
};

const input: InputOptions = {
  target: "../openapi.json",
  filters: {
    mode: "exclude",
    tags: ["stream"],
  },
};

export default defineConfig({
  api: {
    input,
    output: {
      clean: true,
      target: "./src/api/generated/endpoints/",
      schemas: "./src/api/generated/schemas/",
      operationSchemas: "./src/api/generated/schemas/params/",
      client: "react-query",
      mode: "tags-split",
      namingConvention: "kebab-case",
      override: {
        useTypeOverInterfaces: true,
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "./src/api/orval-mutator/custom-fetch.ts",
          name: "fetchApi",
        },
        query: {
          version: 5,
          useQuery: true,
          useInfinite: true,
          useMutation: true,
          useSuspenseQuery: true,
          useSuspenseInfiniteQuery: true,
          useInfiniteQueryParam: "page",
        },
        operations: operationSpecificConfig,
      },
    },
    hooks: {
      afterAllFilesWrite: ["biome format --write --config-path biome.format.jsonc"],
    },
  },
});
