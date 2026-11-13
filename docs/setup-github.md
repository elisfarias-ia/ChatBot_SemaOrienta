# Configuração do GitHub (pela web)

Repositório: <https://github.com/elisfarias-ia/ChatBot_SemaOrienta>

## Fluxo de trabalho

1. Toda mudança é feita numa branch `feat/*` (ou `fix/*`, `chore/*`).
2. `git push -u origin feat/minha-branch`.
3. O `git push` imprime um link `…/pull/new/feat/minha-branch`. Abra-o e crie o PR.
4. Espere o CI ficar verde e faça o merge (de preferência **Squash and merge**).

## Proteger a branch `main`

> **Atenção:** em repositório **privado**, proteção de branch e rulesets só funcionam
> em conta **GitHub Pro, Team ou Enterprise**. Na conta gratuita, a página aparece,
> mas as regras não são aplicadas. Em repositório público funcionam em qualquer plano.

**Antes de começar:** os checks só aparecem na lista depois de rodarem pelo menos
uma vez. Abra o PR da branch `feat/ci-github` e espere o CI terminar.

### Opção A — Ruleset (recomendado)

1. No repositório, clique em **Settings** (Configurações).
2. No menu da esquerda: **Rules → Rulesets**.
3. Clique em **New ruleset → New branch ruleset**.
4. Preencha:
   - **Ruleset name:** `Proteger main`
   - **Enforcement status:** `Active`
5. Em **Target branches**, clique em **Add target → Include default branch**.
6. Em **Branch rules**, marque:
   - ✅ **Restrict deletions** (impede apagar a `main`)
   - ✅ **Block force pushes**
   - ✅ **Require a pull request before merging**
     - **Required approvals:** `0` se você trabalha sozinha; `1` se houver outra pessoa para revisar.
     - Opcional: ✅ **Require review from Code Owners** (usa o arquivo `.github/CODEOWNERS`).
   - ✅ **Require status checks to pass**
     - ✅ **Require branches to be up to date before merging**
     - Clique em **Add checks** e adicione os dois:
       - `Qualidade e build`
       - `E2E (Playwright)`
7. Clique em **Create**.

### Opção B — Branch protection rule (modo clássico)

1. **Settings → Branches → Add branch protection rule** (ou **Add classic branch protection rule**).
2. **Branch name pattern:** `main`
3. Marque:
   - ✅ **Require a pull request before merging** (ajuste o número de aprovações como acima)
   - ✅ **Require status checks to pass before merging**
     - ✅ **Require branches to be up to date before merging**
     - Na busca, adicione `Qualidade e build` e `E2E (Playwright)`
   - ✅ **Do not allow bypassing the above settings** (vale também para administradores)
4. Clique em **Create**.

## Como conferir

- Tente `git push origin main` direto: deve ser **recusado**.
- Num PR com CI vermelho, o botão de merge deve ficar **bloqueado**.

## Outras configurações recomendadas

- **Settings → General → Pull Requests:** deixe só **Allow squash merging** e marque
  **Automatically delete head branches**.
- **Settings → Code security:** ative **Dependabot alerts** e **Dependabot security updates**
  (as atualizações semanais já estão em `.github/dependabot.yml`).
- **Settings → Actions → General → Workflow permissions:** `Read repository contents`.

## E-mail dos commits

O GitHub bloqueia push com e-mail privado. Este repositório usa o e-mail
`noreply` do GitHub, configurado só nele:

```bash
git config user.email "340184059+elisfarias-ia@users.noreply.github.com"
```
