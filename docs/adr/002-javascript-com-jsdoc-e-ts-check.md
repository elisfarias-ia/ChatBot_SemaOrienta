# ADR 002 — JavaScript com JSDoc e `// @ts-check` em vez de TypeScript

- Status: aceito
- Data: 2026-11-13

## Contexto

A equipe que vai manter o projeto tem mais familiaridade com JavaScript. Ao mesmo tempo, queremos a segurança de tipos para evitar erros em integrações (Supabase, LLM, extratores).

## Decisão

- Código em **JavaScript ESM**, sem arquivos `.ts`.
- **`// @ts-check`** na primeira linha de todo arquivo e tipos descritos com **JSDoc** (`@param`, `@returns`, `@typedef`).
- `jsconfig.json` com `checkJs: true` e `strict: true`; verificação no script `npm run typecheck` (`tsc --noEmit -p jsconfig.json`).
- Validação em tempo de execução nas bordas com **Zod**.

## Consequências

- (+) Sem etapa de compilação extra; curva de aprendizado menor.
- (+) Erros de tipo detectados no editor e no CI.
- (−) JSDoc é mais verboso que anotações TypeScript; tipos complexos ficam menos legíveis.
- (−) Alguns exemplos de bibliotecas estão só em TS e precisam ser adaptados.
