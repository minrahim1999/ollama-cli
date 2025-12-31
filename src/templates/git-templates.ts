/**
 * Built-in git prompt templates
 */

export const GIT_TEMPLATES = {
  COMMIT_MESSAGE: `Analyze these git changes and generate a commit message:

{{diff}}

Style: {{style}}
Requirements:
- Clear and concise
- Follow {{style}} commit conventions
- Focus on the "what" and "why"
- Use imperative mood (e.g., "Add feature" not "Added feature")
{{styleGuide}}`,

  COMMIT_MESSAGE_CONVENTIONAL: `
Conventional commit format:
<type>(<scope>): <subject>

<body>

Types: feat, fix, docs, style, refactor, perf, test, chore
Example: feat(auth): add JWT token validation`,

  COMMIT_MESSAGE_SIMPLE: `
Simple format:
<subject>

<body>

Keep it straightforward and descriptive.`,

  PR_SUMMARY: `Generate a pull request description for these changes:

{{diff}}

Base branch: {{base}}

Include:
## Summary
Brief overview of changes

## Changes
- Key changes made

## Testing
How to test these changes

## Notes
Any additional context or considerations`,

  CODE_REVIEW: `Review these staged changes for:
- Potential bugs and edge cases
- Code quality issues
- Best practices violations
- Security concerns
- Performance issues

Changes:

{{diff}}

Provide specific feedback with line references where applicable.`,
};
