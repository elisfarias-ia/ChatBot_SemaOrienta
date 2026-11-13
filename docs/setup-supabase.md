# Configuração do Supabase

O que já está no repositório (versionado):

| Item                                                                                 | Onde                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Configuração do projeto (Auth, signup desligado, magic link 15 min, redirects, SMTP) | `supabase/config.toml`                             |
| Templates de e-mail em pt-BR (magic link e convite)                                  | `supabase/templates/`                              |
| Extensão `vector`                                                                    | `supabase/migrations/*_enable_vector.sql`          |
| Bucket privado `sources` (25 MB, PDF/DOCX)                                           | `supabase/migrations/*_storage_sources_bucket.sql` |
| Aplicar migrations na `main`                                                         | `.github/workflows/supabase-migrations.yml`        |
| Consulta a cada 3 dias (evita pausa)                                                 | `.github/workflows/supabase-keepalive.yml`         |
| Health check                                                                         | `npm run health:supabase`                          |

O Supabase CLI está instalado como dependência de desenvolvimento: use sempre `npx supabase …`.

## 1. Variáveis de ambiente do Windows (só para o CLI)

Defina como variáveis **do usuário** (Iniciar → "Editar as variáveis de ambiente para sua conta")
e reinicie o terminal/app depois:

| Variável                              | De onde vem                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN`               | supabase.com → avatar → **Account preferences → Access Tokens → Generate new token** |
| `SUPABASE_DB_PASSWORD`                | Senha forte criada por você (será a senha do Postgres do projeto)                    |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Seu provedor de e-mail (ex.: servidor SMTP institucional)                            |
| `SMTP_ADMIN_EMAIL`                    | E-mail remetente (ex.: `nao-responda@…`)                                             |
| `SMTP_SENDER_NAME`                    | Nome do remetente (ex.: `Assistente SEMA-MT`)                                        |

A **porta SMTP** está fixa em `587` no `config.toml`, porque o CLI não aceita `env()` em
campos numéricos. Se o provedor usar outra porta, altere em `[remotes.production.auth.email.smtp]`.

## 2. Criar e vincular o projeto (CLI)

```bash
npx supabase orgs list
```

```bash
npx supabase projects create sema-chatbot --org-id <ORG_ID> --region sa-east-1 --db-password "$SUPABASE_DB_PASSWORD"
```

Anote o **Reference ID** retornado e:

1. Troque o placeholder `project_id = "aaaaaaaaaaaaaaaaaaaa"` em `[remotes.production]`
   do `supabase/config.toml` pelo Reference ID.
2. Vincule e aplique:

```bash
npx supabase link --project-ref <REFERENCE_ID>
```

```bash
npx supabase db push
```

```bash
npx supabase config push
```

`config push` envia Auth, SMTP e templates. Ele mostra o que vai mudar e pede confirmação.

## 3. Chaves no `.env.local`

```bash
npx supabase projects api-keys --project-ref <REFERENCE_ID>
```

Copie para `.env.local` (nunca versionado):

```
NEXT_PUBLIC_SUPABASE_URL=https://<REFERENCE_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable>
SUPABASE_SECRET_KEY=<secret>
```

Teste:

```bash
npm run health:supabase
```

## 4. Secrets do GitHub (pela web)

No repositório: **Settings → Secrets and variables → Actions → New repository secret**.
Crie os três:

| Nome                    | Valor                    |
| ----------------------- | ------------------------ |
| `SUPABASE_ACCESS_TOKEN` | o mesmo token da etapa 1 |
| `SUPABASE_DB_PASSWORD`  | a senha do banco         |
| `SUPABASE_PROJECT_ID`   | o Reference ID           |

Depois, em **Actions → Supabase — manter ativo → Run workflow**, rode uma vez para testar.

## 5. Quando houver domínio na Vercel (TODO)

No `supabase/config.toml`, troque `site_url` e inclua o domínio em `additional_redirect_urls`
(procure por `TODO(deploy)`). Depois rode `npx supabase config push`.

## Plano B: pelo painel

Se algum comando do CLI não funcionar:

- **Criar projeto:** supabase.com/dashboard → **New project** → Organização → Nome `sema-chatbot`,
  senha do banco, **Region: South America (São Paulo)** → **Create new project**.
- **Desligar cadastro público:** **Authentication → Sign In / Providers → User Signups** →
  desmarque **Allow new users to sign up** → **Save**. Em **Email**, deixe **Enable Email provider** ligado.
- **URLs:** **Authentication → URL Configuration** → **Site URL** `http://localhost:3000`;
  **Redirect URLs → Add URL** `http://localhost:3000/**`.
- **SMTP:** **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP** → preencha
  host, porta, usuário, senha, remetente → **Save**.
- **Templates:** **Authentication → Emails → Templates → Magic Link** e **Invite user** → cole o
  HTML de `supabase/templates/` e o assunto do `config.toml` → **Save**.
- **Bucket:** **Storage → New bucket** → nome `sources`, **Public** desligado, **Restrict file size**
  `25 MB`, **Allowed MIME types** `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Extensão vector:** **Database → Extensions** → procure `vector` → ligar (schema `extensions`).

## Observações

- Com o cadastro público desligado, o magic link só funciona para quem **já existe** em Auth.
  Administradores entram por convite: **Authentication → Users → Add user → Send invitation**.
- O workflow agendado é desativado pelo GitHub após 60 dias sem commits; reative em **Actions**.
