# Base URL Setup Feature

## Overview

The Ollama CLI now prompts users for the Ollama base URL during first-run setup, eliminating the need for `.env` files and providing a cleaner user experience.

## How It Works

### First-Run Setup

When you run `ollama-cli` for the first time (or after `ollama-cli setup reset`), you'll see:

```
🚀 Ollama CLI - First Run Setup

Ollama Base URL Configuration

Choose Ollama server:
  1. Use default (http://localhost:11434)
  2. Enter custom URL

Select option (1-2):
```

#### Option 1: Default URL
Simply press `1` or `Enter` to use the default localhost URL.

#### Option 2: Custom URL
Select `2` and enter your custom URL:
```
Enter Ollama base URL (default: http://localhost:11434): http://192.168.1.100:11434
```

The setup will:
- Validate the URL format
- Test the connection to Ollama
- Save the configuration to `~/.ollama-cli/config.json`

### Validation

The URL prompt includes:
- **Format validation**: Ensures the URL is valid (http:// or https://)
- **Connection test**: Verifies Ollama is reachable before saving
- **Auto-cleanup**: Removes trailing slashes and `/api` suffix

### Configuration Management

After setup, you can manage the base URL using the config command:

```bash
# View current base URL
ollama-cli config get baseUrl

# Change base URL
ollama-cli config set baseUrl http://custom-server:11434

# View all configuration
ollama-cli config list

# Reset to defaults
ollama-cli config reset
```

## Configuration Storage

The base URL is stored in `~/.ollama-cli/config.json`:

```json
{
  "baseUrl": "http://localhost:11434/api",
  "defaultModel": "llama2",
  "timeoutMs": 30000,
  "autoPlan": true
}
```

## Priority Hierarchy

The base URL can be set in multiple ways (highest to lowest priority):

1. **CLI flag**: `ollama-cli chat --base-url http://custom:11434` (not implemented yet)
2. **Environment variable**: `OLLAMA_BASE_URL=http://custom:11434`
3. **Config file**: `~/.ollama-cli/config.json` (set via setup or config command)
4. **Default**: `http://localhost:11434/api`

## Benefits

✅ **No `.env` files needed** - Cleaner project structure
✅ **Interactive setup** - User-friendly first-run experience
✅ **Persistent configuration** - Saved globally for all sessions
✅ **Easy management** - Change settings with simple commands
✅ **Validation built-in** - Catches errors before saving
✅ **Connection testing** - Ensures Ollama is reachable

## Implementation Details

### Files Modified

- `src/setup/index.ts` - Added `promptForBaseUrl()` and `testOllamaConnection()` functions
- `src/commands/config.ts` - Added `autoPlan` to valid config keys (bonus improvement)

### Key Functions

**promptForBaseUrl()**
- Presents default/custom choice to user
- Validates URL format
- Removes trailing slashes and `/api` suffix
- Returns clean base URL

**testOllamaConnection(baseUrl)**
- Creates temporary Ollama client
- Tests connection by calling `listModels()`
- Returns success/failure status

**runSetup()**
- Calls `promptForBaseUrl()` at the beginning
- Tests connection before proceeding
- Saves valid URL to config
- Continues with model verification

## Examples

### Example 1: Default Setup
```
🚀 Ollama CLI - First Run Setup

Ollama Base URL Configuration

Choose Ollama server:
  1. Use default (http://localhost:11434)
  2. Enter custom URL

Select option (1-2): 1

✓ Connected to Ollama at http://localhost:11434
Configuration saved to ~/.ollama-cli/config.json

Verifying required models for optimal functionality...
```

### Example 2: Custom URL
```
🚀 Ollama CLI - First Run Setup

Ollama Base URL Configuration

Choose Ollama server:
  1. Use default (http://localhost:11434)
  2. Enter custom URL

Select option (1-2): 2

Enter Ollama base URL (default: http://localhost:11434): http://192.168.1.50:11434

✓ Connected to Ollama at http://192.168.1.50:11434
Configuration saved to ~/.ollama-cli/config.json

Verifying required models for optimal functionality...
```

### Example 3: Invalid URL
```
Enter Ollama base URL (default: http://localhost:11434): not-a-valid-url
❌ Invalid URL format. Please enter a valid URL (e.g., http://localhost:11434)

Enter Ollama base URL (default: http://localhost:11434): http://valid-url.com
```

### Example 4: Connection Failed
```
✗ Cannot connect to Ollama at http://wrong-server:11434

Please ensure Ollama is running:
  ollama serve

Or install Ollama from: https://ollama.ai
```

## Testing

To test the feature:

1. Reset setup state:
   ```bash
   ollama-cli setup reset
   ```

2. Run any command to trigger setup:
   ```bash
   ollama-cli chat
   ```

3. Follow the prompts to configure the base URL

4. Verify the configuration:
   ```bash
   ollama-cli config list
   ```

## Future Enhancements

Potential improvements:
- Add `--base-url` CLI flag for per-command overrides
- Support multiple Ollama server profiles
- Auto-discovery of Ollama servers on local network
- Quick switch between saved server configurations
