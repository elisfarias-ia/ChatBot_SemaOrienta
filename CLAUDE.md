# CLAUDE.md — sema-chatbot

@AGENTS.md

## Objetivo

Chatbot **RAG público** para cidadãos e servidores da **SEMA-MT** (Secretaria de Estado de Meio Ambiente de Mato Grosso). Responde com base apenas nas fontes cadastradas e cita de onde tirou a resposta.

Painel **`/admin`** protegido por login com **magic link** (e-mail), onde servidores autorizados cadastram e gerenciam as fontes:

- PDF (upload)
- DOCX (upload)
- Google Docs público (link)
- URL de página web

## Stack

- **Next.js** (App Router) + **JavaScript ESM**, sem TypeScript.
  - JSDoc em todo código e `// @ts-check` na primeira linha de **todo** arquivo `.js`/`.mjs`.
  - `jsconfig.json` com `checkJs: true` e `strict: true`.
- **Zod** para validar entradas, saídas de provedores e configuração.
- **Tailwind CSS** + **shadcn/ui**.
- **Vercel AI SDK**: `@ai-sdk/google` (principal) com fallback para `@ai-sdk/groq`.
- **Supabase**: Postgres + **pgvector** (embeddings), Storage (arquivos), Auth via **`@supabase/ssr`**.
- Extração de texto: **unpdf** (PDF), **mammoth** (DOCX), **@mozilla/readability** + **linkedom** (URL / Google Docs exportado em HTML).
- **Cloudflare Turnstile** no chat público e no login (anti-bot).
- Testes: **Vitest** (unidade/integração) e **Playwright** (e2e, mobile + desktop).

## Arquitetura em camadas

Dependências só apontam para dentro (camada de fora conhece a de dentro, nunca o contrário):

```
src/core      ← regras puras: chunking, montagem de prompt, ranking, validações. SEM I/O.
  ↑
src/services  ← casos de uso (ingerir fonte, responder pergunta). Recebem adaptadores por parâmetro.
  ↑
src/infra     ← adaptadores: Supabase, LLM, embeddings, extratores, Turnstile.
  ↑
src/app       ← rotas, Server Actions, páginas e componentes de UI.
```

- `src/lib/env.js`: leitura e validação das variáveis de ambiente com Zod (falha cedo e com mensagem clara).
- **Provedores sempre atrás de interfaces** documentadas com JSDoc (`@typedef`/`@callback`), por exemplo `LlmProvider`, `EmbeddingProvider`, `VectorStore`, `DocumentExtractor`, `CaptchaVerifier`. Serviços dependem da interface, nunca do SDK concreto.
- `src/core` não importa nada de `services`, `infra`, `app`, Next.js ou SDKs externos.

## Convenções

- **Mobile first**: estilos base para telas pequenas; `sm:`/`md:`/`lg:` ampliam.
- **Acessibilidade WCAG 2.1 AA**: HTML semântico, rótulos em todos os campos, foco visível, contraste ≥ 4.5:1, navegação por teclado, `aria-live` nas respostas do chat.
- **Textos da UI em pt-BR** e **linguagem simples** (frases curtas, sem jargão técnico ou jurídico sem explicação).
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), mensagens em pt-BR.
- **Funções pequenas**, com uma responsabilidade; prefira funções puras.
- **Sem segredos no código**: tudo via variáveis de ambiente; manter `.env.example` atualizado (sem valores reais).
- Configuração **validada com Zod em `src/lib/env.js`**; não ler `process.env` fora desse arquivo.
- Decisões de arquitetura registradas em `docs/adr/` (formato curto: Contexto, Decisão, Consequências).

## Comandos

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                 |
| `npm run build`     | Build de produção                           |
| `npm run lint`      | ESLint                                      |
| `npm run typecheck` | `tsc --noEmit -p jsconfig.json` (checa JSDoc) |
| `npm test`          | Vitest (unidade/integração)                 |
| `npm run test:e2e`  | Playwright (e2e)                            |

## Regra de fechamento de tarefa

Ao terminar **cada** tarefa, rodar nesta ordem e só commitar se tudo passar:

```bash
npm run lint && npm run typecheck && npm test
```
