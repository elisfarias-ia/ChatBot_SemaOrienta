# Configuração do Supabase

## Projeto

| Item         | Valor                                      |
| ------------ | ------------------------------------------ |
| Nome         | `ChatBot_SemaOrienta`                      |
| Reference ID | `cgwbfvfrohjkynvojcgl`                     |
| URL          | `https://cgwbfvfrohjkynvojcgl.supabase.co` |
| Região       | `us-east-1` (ver ADR 006)                  |
| Postgres     | 17                                         |

> **Região:** o projeto fica em **us-east-1 (EUA)**, por decisão registrada no
> [ADR 006](adr/006-supabase-em-us-east-1.md). A região não pode ser alterada depois;
> mudar exige criar outro projeto em São Paulo e repetir este guia.

## O que está no repositório

| Item                                                              | Onde                                               |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| Auth: signup desligado, magic link 15 min, redirects, rate limits | `supabase/config.toml`                             |
| Templates de e-mail em pt-BR (magic link e convite)               | `supabase/templates/`                              |
| Extensão `vector`                                                 | `supabase/migrations/*_enable_vector.sql`          |
| Bucket privado `sources` (25 MB, PDF/DOCX)                        | `supabase/migrations/*_storage_sources_bucket.sql` |
| Aplicar migrations na `main`                                      | `.github/workflows/supabase-migrations.yml`        |
| Consulta a cada 3 dias (evita pausa)                              | `.github/workflows/supabase-keepalive.yml`         |
| Health check                                                      | `npm run health:supabase`                          |

O Supabase CLI (v3) está nas dependências de desenvolvimento: use sempre `npx supabase …`.

> **CLI v3:** comandos de banco apontam para o banco **local** por padrão. Para o projeto
> remoto, use `--remote` (ex.: `npx supabase db push --remote`). O script `npm run db:push`
> e o workflow já fazem isso.

## SMTP: gerenciado pelo painel

O SMTP próprio **não** é configurado pelo `config.toml`. Ele é mantido pelo painel em
**Authentication → Emails → SMTP Settings**, e as credenciais nunca passam pelo repositório.

Cuidado com `npx supabase config push`: ele envia o `config.toml` para o projeto remoto.
Antes de confirmar, leia o diff que ele mostra e **cancele se aparecer alteração de SMTP**.
Na dúvida, altere Auth pelo painel.

## Passo a passo (CLI)

Pré-requisitos: `npx supabase login` feito e a variável de usuário `SUPABASE_DB_PASSWORD`
definida (reinicie o terminal/app depois de criá-la).

```bash
npx supabase projects list
```

```bash
npx supabase link --project-ref cgwbfvfrohjkynvojcgl
```

```bash
npx supabase db push --remote
```

### Chaves no `.env.local`

O `.env.local` nunca é versionado. Para preenchê-lo, as chaves vêm de:

```bash
npx supabase projects api-keys --project-ref cgwbfvfrohjkynvojcgl --reveal
```

Use a chave `publishable` em `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e a `secret` em
`SUPABASE_SECRET_KEY`. Sem `--reveal`, a chave secreta vem mascarada. Não cole a saída
desse comando em chats, issues ou commits.

Teste:

```bash
npm run health:supabase
```

## Secrets do GitHub Actions

Em **Settings → Secrets and variables → Actions**, os workflows usam:

| Nome                    | Valor                                 |
| ----------------------- | ------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | token de supabase.com → Access Tokens |
| `SUPABASE_DB_PASSWORD`  | a senha do banco                      |
| `SUPABASE_PROJECT_ID`   | `cgwbfvfrohjkynvojcgl`                |

Teste com **Actions → Supabase — manter ativo → Run workflow**.

## Quando houver domínio na Vercel (TODO)

No painel: **Authentication → URL Configuration** → troque **Site URL** e adicione o
domínio em **Redirect URLs** (`https://<dominio>/**`). Atualize também `site_url` e
`additional_redirect_urls` no `config.toml` (procure `TODO(deploy)`) para manter o registro.

## Pelo painel (se o CLI falhar)

- **Desligar cadastro público:** **Authentication → Sign In / Providers → User Signups** →
  desmarque **Allow new users to sign up** → **Save**. Deixe **Email** ligado.
- **Magic link de 15 min:** **Authentication → Sign In / Providers → Email** →
  **Email OTP Expiration** `900` → **Save**.
- **URLs:** **Authentication → URL Configuration** → **Site URL** `http://localhost:3000`;
  **Redirect URLs → Add URL** `http://localhost:3000/**`.
- **Templates:** **Authentication → Emails → Templates → Magic Link** e **Invite user** → cole o
  HTML de `supabase/templates/` e o assunto do `config.toml` → **Save**.
- **Bucket:** **Storage → New bucket** → nome `sources`, **Public** desligado, **Restrict file size**
  `25 MB`, **Allowed MIME types**
  `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Extensão vector:** **Database → Extensions** → `vector` → ligar (schema `extensions`).

## Observações

- Com o cadastro público desligado, o magic link só funciona para quem **já existe** em Auth.
  Administradores entram por convite: **Authentication → Users → Add user → Send invitation**.
- O workflow agendado é desativado pelo GitHub após 60 dias sem commits; reative em **Actions**.

## Rede local bloqueia conexão direta ao Postgres

Nesta rede, a conexão Postgres com TLS (porta 5432 do pooler) é derrubada no handshake
(`ECONNRESET`), então `npx supabase db push --remote` **não funciona daqui**. O que funciona:

- `npx supabase db query --remote …` e `npm run health:supabase`, que usam HTTPS;
- aplicar migrations pelo GitHub Actions: `npm run db:migrate:ci` (ou merge na `main`).

Para isso, os secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` e `SUPABASE_PROJECT_ID`
precisam estar no repositório (`npm run secrets:sync`, ver `docs/setup-github.md`).
