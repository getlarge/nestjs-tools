// Jest 29 runs CommonJS and cannot load ESM-only packages from node_modules.
// path-to-regexp@9 (required by @fastify/middie >= 9.3.8, itself pinned by
// @nestjs/platform-fastify 11.2.12) is ESM-only; Node >= 22 handles it via
// require(esm), Jest does not. Transpile such files to CommonJS for tests only.
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const { outputText, sourceMapText } = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        allowJs: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        sourceMap: true,
      },
    });
    return { code: outputText, map: sourceMapText };
  },
};
