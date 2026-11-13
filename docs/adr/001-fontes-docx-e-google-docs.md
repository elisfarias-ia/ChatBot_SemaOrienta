# ADR 001 — Aceitar DOCX e Google Docs público como fontes

- Status: aceito
- Data: 2026-11-13

## Contexto

Boa parte das normas, manuais e orientações da SEMA-MT circula em Word (DOCX) e em Google Docs compartilhados, não só em PDF ou páginas web. Exigir conversão manual para PDF atrasaria a atualização da base e geraria perda de estrutura (títulos, listas).

## Decisão

O painel `/admin` aceita, além de PDF e URL:

- **DOCX** por upload, com extração via `mammoth` (texto + estrutura de títulos).
- **Google Docs público** por link: o sistema normaliza o link para a URL de exportação (HTML/texto) e extrai o conteúdo com `@mozilla/readability` + `linkedom`. Só documentos com acesso "qualquer pessoa com o link" são aceitos; não usamos OAuth do Google.

## Consequências

- (+) Servidores cadastram conteúdo no formato em que ele já existe.
- (+) Sem credenciais Google para gerenciar.
- (−) Documento privado ou com link alterado falha na ingestão: a UI precisa explicar o erro em linguagem simples.
- (−) Mudanças no Google Docs não são refletidas automaticamente; é preciso reprocessar a fonte (manual ou agendado).
