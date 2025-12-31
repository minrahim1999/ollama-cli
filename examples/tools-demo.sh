#!/bin/bash

# Demo script showing tools and memory features

echo "=== Ollama CLI Tools & Memory Demo ==="
echo ""

# 1. Start tools-enabled chat
echo "1. Starting chat with tools enabled..."
echo "   Command: ollama-cli chat --tools"
echo ""

# 2. Example conversation
cat << 'EOF'
Example Conversation:
─────────────────────────────────────────────────────────

You: List all TypeScript files in the src directory