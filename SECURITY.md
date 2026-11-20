# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub: [Report a vulnerability](https://github.com/aryamanw/researcher-ai-extn/security/advisories/new) (Security tab, "Report a vulnerability").

Include what you found, how to reproduce it, and the affected version. You can expect an acknowledgement within a few days. This is a small project run by a small team, so fixes are best effort, but we take credential handling and data-flow issues seriously and will credit reporters who want it.

## Scope

Particularly relevant: API key storage and handling, the OpenRouter OAuth flow, cross-site scripting in the side panel or options page, message-sender validation, the Content Security Policy, and anything that would send page content or credentials somewhere other than the provider the user configured.

Out of scope: vulnerabilities in the AI providers themselves, and issues requiring a user to install a modified copy of the extension.
