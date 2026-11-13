# Configuração do GitHub

Repositório (público): <https://github.com/elisfarias-ia/ChatBot_SemaOrienta>

Tudo é feito por `scripts/github.mjs`, sem `gh` e sem abrir o site. O script usa a
credencial do GitHub já salva no **Git Credential Manager** (a mesma do `git push`),
obtida em tempo de execução por `git credential fill`. O token fica só em memória:
nunca é impresso, gravado, commitado nem passado por argumento.

## Fluxo de trabalho

1. Crie uma branch `feat/*` (ou `fix/*`, `chore/*`, `docs/*`) a partir da `main` atualizada.
2. Antes de entregar, rode localmente:

   ```bash
   npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
   ```

3. Faça commit (Conventional Commits) e entregue:

   ```bash
   npm run ship
   ```

`npm run ship` faz, nesta ordem:

1. push da branch atual;
2. cria o PR para a `main` (título = último commit; corpo = lista de commits + checklist
   do template), ou reaproveita o PR aberto;
3. espera os checks do CI (até 25 min; ajuste com `SHIP_TIMEOUT_MIN`);
4. **se todos passarem:** merge (merge commit), apaga a branch remota, volta para a `main`,
   `git pull` e apaga a branch local;
5. **se algum falhar:** não faz merge e mostra o check que falhou e o link do log.

## Configuração do repositório

```bash
npm run repo:setup
```

- **Workflow permissions:** leitura e escrita.
- **Apagar branch após o merge:** ligado.
- **Proteção da `main`** (só em repositório público; em privado o plano gratuito não aplica):
  PR obrigatório, branch atualizada com a `main`, checks `Qualidade e build` e
  `E2E (Playwright)` verdes, sem force push e sem apagar a `main`. Vale também para administradores.

Para conferir: `git push origin main` direto deve ser **recusado**.

## Secrets do Actions

Usados pelos workflows do Supabase. `npm run secrets:sync` cadastra todos os desta tabela,
lendo cada valor de uma variável de ambiente ou do `.env.local`. Se o valor não existir
localmente, o secret atual no GitHub é mantido.

| Secret                  | Origem do valor                                             |
| ----------------------- | ----------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | token de supabase.com → Account preferences → Access Tokens |
| `SUPABASE_DB_PASSWORD`  | senha do banco do projeto Supabase                          |
| `SUPABASE_PROJECT_ID`   | Reference ID do projeto (`cgwbfvfrohjkynvojcgl`)            |

Para um secret avulso:

```bash
npm run secrets:set -- NOME_DO_SECRET
```

## Rodar um workflow manualmente

```bash
npm run workflow:run -- supabase-keepalive.yml
```

Dispara o workflow na `main` (`workflow_dispatch`), acompanha até terminar e, se falhar,
mostra o passo que quebrou e o link do log. Atalho para as migrations: `npm run db:migrate:ci`.

## Quando é preciso ação humana

- **Primeiro login do Git Credential Manager:** se não houver credencial salva, o script para
  e pede um `git push` manual, que abre o navegador para você entrar no GitHub (só você pode
  autenticar a sua conta).
- **Valores de segredos** que só existem fora da máquina (ex.: token do Supabase): precisam
  estar no ambiente ou no `.env.local` para o `secrets:sync` conseguir cadastrar.

## E-mail dos commits

O GitHub bloqueia push com e-mail privado. O git global desta máquina usa o e-mail
`noreply` do GitHub: `340184059+elisfarias-ia@users.noreply.github.com`.
