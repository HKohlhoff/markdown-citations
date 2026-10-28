import path from "node:path";

export const citationJsMobileShim = {
  name: "citation-js-mobile-shim",
  setup(build) {
    build.onResolve({ filter: /^sync-fetch-undici$/ }, () => ({
      path: path.resolve("src/vendor/sync-fetch-unavailable.ts"),
    }));
  },
};
