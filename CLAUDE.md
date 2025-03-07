# Liquiprompt Development Guide

## Build & Run Commands
- Build: `npm run build` (uses pkgroll)
- Test: `npm run test` (uses vitest)
- Run examples: `npm run example -- [example-name]` (e.g., `npm run example -- one-shot`)

## Code Style Guidelines
- TypeScript with strict mode enabled, targeting ESNext
- Indentation: 2 spaces with line width of 80 characters
- Type annotations preferred, though `any` is permitted when necessary
- Parameter reassignment allowed
- Modern TypeScript practices with ESM modules
- Favor async/await over promise chains
- Use descriptive variable names and follow camelCase convention
- Error handling should use try/catch blocks

## Project Structure
- `/src`: Core implementation
- `/data`: Prompt templates
- `/examples`: Usage examples
- `/scripts`: Utility scripts