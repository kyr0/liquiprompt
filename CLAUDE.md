# Liquiprompt Development Guide

## Build & Run Commands
- Build: `npm run build` (uses pkgroll)
- Test: `npm run test` (uses vitest)
- Run examples: `npm run example -- [example-name]` (e.g., `npm run example -- one-shot`)

## Code Style Guidelines
- TypeScript with strict mode enabled, targeting ESNext
- Biome for formatting/linting: `npx @biomejs/biome check --apply ./src`
- Indentation: 2 spaces with LF line endings (80 char width)
- Imports organized automatically via Biome
- Type annotations preferred, though `any` is permitted when necessary
- Parameter reassignment allowed (noParameterAssign rule disabled)
- Modern TypeScript practices with ESM modules
- Favor async/await over promise chains
- Use descriptive variable names and follow camelCase convention
- Error handling should use try/catch blocks

## Project Structure
- `/src`: Core implementation
- `/data`: Prompt templates
- `/examples`: Usage examples
- `/scripts`: Utility scripts