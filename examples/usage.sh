#!/bin/bash

# Example usage scripts for Ollama CLI

# Basic usage
echo "=== Basic Ask Command ==="
ollama-cli ask "What is the capital of France?"

# Using specific model
echo -e "\n=== Using Specific Model ==="
ollama-cli ask "Explain quantum computing in one sentence" -m llama2

# JSON generation
echo -e "\n=== JSON Generation ==="
ollama-cli ask "List 5 colors with their hex codes and categories" --json examples/schema-example.json

# Interactive chat
echo -e "\n=== Starting Interactive Chat ==="
ollama-cli chat -m llama2

# Configuration
echo -e "\n=== Configuration ==="
ollama-cli config set defaultModel mistral
ollama-cli config list

# List models
echo -e "\n=== List Models ==="
ollama-cli models
