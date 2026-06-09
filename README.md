<p align="center">
  <a href="https://umbraa.vercel.app">
    <img src="public/icon-512x512.png" width="150" alt="Umbraa Logo">
  </a>
</p>

<h1 align="center">Umbraa</h1>

<h2 align="center">AI-Powered Penetration Testing Assistant</h2>

<div align="center">

[![License](https://img.shields.io/badge/License-Apache%202.0%20with%20Commercial%20Restrictions-red.svg)](LICENSE)

</div>

## Getting started

### Prerequisites

You'll need the following accounts:

**Required:**
- [OpenRouter](https://openrouter.ai/) - AI model provider
- [OpenAI](https://platform.openai.com/) - Content moderation
- [E2B](https://e2b.dev/) - Sandbox environment for secure code execution
- [Convex](https://www.convex.dev/) - Database and backend
- [WorkOS](https://workos.com/) - Authentication and user management

**Optional:**
- [Perplexity](https://perplexity.ai/) - Web search functionality
- [Upstash Redis](https://upstash.com/) - Rate limiting

### Setup

```bash
git clone https://github.com/sanir321/hackerr.git
cd hackerr
pnpm install
pnpm run setup
```

### Run development

```bash
pnpm run dev
```

Or separately:

```bash
pnpm run dev:next
pnpm run dev:convex
```


