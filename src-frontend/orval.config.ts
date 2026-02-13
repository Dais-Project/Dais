import {
  defineConfig,
  type OpenApiDocument,
  type OperationOptions,
} from "orval";

const DISABLED_OPERATIONS = ["continue_task", "tool_answer", "tool_reviews"];

const sse_filter = (spec: OpenApiDocument) => {
  if (!spec.paths) {
    return spec;
  }
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) {
      continue;
    }
    for (const [method, _operation] of Object.entries(pathItem)) {
      const operation = _operation as { operationId: string };
      if (DISABLED_OPERATIONS.includes(operation.operationId)) {
        delete pathItem[method];
      }
    }
    if (Object.keys(pathItem).length === 0) {
      delete spec.paths[path];
    }
  }
  return spec;
};

const operationSpecificConfig: Record<string, OperationOptions> = {
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
      override: {
        transformer: sse_filter,
      },
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
