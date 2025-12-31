# Contributing to Ollama CLI

Thank you for your interest in contributing to Ollama CLI! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ollama-cli
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
ollama-cli/
├── src/
│   ├── api/          # Ollama API client
│   ├── commands/     # CLI command handlers
│   ├── config/       # Configuration management
│   ├── session/      # Session persistence
│   ├── types/        # TypeScript type definitions
│   ├── ui/           # Terminal UI utilities
│   ├── cli.ts        # Main CLI entry point
│   └── index.ts      # Public API exports
├── examples/         # Usage examples
├── dist/             # Compiled output (gitignored)
└── package.json
```

## Code Style

- **TypeScript**: Use strict type checking
- **Formatting**: Run `npm run format` before committing
- **Linting**: Run `npm run lint` to check code quality
- **Comments**: Add JSDoc comments for public APIs

## Testing

- Write tests for new features
- Maintain test coverage above 80%
- Run tests with: `npm test`
- Check coverage with: `npm run test:coverage`

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update README if needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run format
   npm test
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Message Convention

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or updates
- `chore:` Build process or auxiliary tool changes

## Adding New Commands

1. Create command handler in `src/commands/`
2. Add command to `src/cli.ts`
3. Update README with usage examples
4. Add tests for the new command

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Provide error messages and logs
- Specify your environment (OS, Node version, etc.)

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
