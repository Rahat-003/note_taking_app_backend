// Vercel function entry. Plain JavaScript on purpose: the project uses TypeScript 7, which has no compiler
// API for Vercel's Node builder, so `npm run vercel-build` compiles everything with tsc into dist/ first and
// this file only loads the compiled handler (src/vercel.ts). All requests are routed here by vercel.json.
module.exports = require('../dist/src/vercel.js').default;
