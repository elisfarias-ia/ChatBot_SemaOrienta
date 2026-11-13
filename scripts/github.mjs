// @ts-check
/**
 * Automação do GitHub sem `gh`: usa a credencial já salva no Git Credential Manager.
 *
 * Uso:
 *   node scripts/github.mjs pr:ship          push + PR + espera CI + merge + limpeza
 *   node scripts/github.mjs repo:setup       permissões, delete-branch-on-merge, proteção da main
 *   node scripts/github.mjs secrets:set NOME cadastra um secret do Actions
 *   node scripts/github.mjs secrets:sync     cadastra os secrets listados em docs/setup-github.md
 *
 * Segurança do token:
 *   - obtido em tempo de execução por `git credential fill` (stdin, nunca argumento);
 *   - fica só em memória; nunca é impresso, logado, gravado ou passado a subprocessos;
 *   - toda saída de erro passa por `mask()`.
 *
 * Variáveis opcionais: SHIP_TIMEOUT_MIN (padrão 25), SHIP_POLL_SEC (padrão 15).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const API = "https://api.github.com";
const REQUIRED_CHECKS = ["Qualidade e build", "E2E (Playwright)"];
const OK_CONCLUSIONS = new Set(["success", "skipped", "neutral"]);

/** @type {string | undefined} */
let cachedToken;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Remove o token (e qualquer coisa com cara de token do GitHub) de um texto.
 * @param {unknown} value
 * @returns {string}
 */
function mask(value) {
  let text = value instanceof Error ? (value.stack ?? value.message) : String(value);
  if (cachedToken) text = text.split(cachedToken).join("***");
  return text
    .replace(/\b(gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})/g, "***")
    .replace(/(authorization:\s*(bearer|token)\s+)\S+/gi, "$1***")
    .replace(/(password=)\S+/gi, "$1***");
}

/** @param {string} message */
function log(message) {
  console.log(message);
}

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`✖ ${mask(message)}`);
  process.exit(1);
}

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executa git sem shell. Nunca recebe o token.
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) fail(`git ${args.join(" ")} falhou: ${result.stderr || result.stdout}`);
  return (result.stdout ?? "").trim();
}

/**
 * Lê o token do Git Credential Manager (protocolo do `git credential fill`).
 * @returns {string}
 */
function getToken() {
  if (cachedToken) return cachedToken;
  const result = spawnSync("git", ["credential", "fill"], {
    encoding: "utf8",
    input: "protocol=https\nhost=github.com\n\n",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const line = (result.stdout ?? "").split(/\r?\n/).find((l) => l.startsWith("password="));
  const token = line?.slice("password=".length).trim();
  if (result.status !== 0 || !token) {
    fail(
      "Não encontrei credencial do GitHub no Git Credential Manager. " +
        "Ela é salva no primeiro `git push` (o navegador abre para login).",
    );
  }
  cachedToken = token;
  return token;
}

/**
 * @returns {{ owner: string, repo: string }}
 */
function getRepo() {
  const url = git(["remote", "get-url", "origin"]);
  const match = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) fail(`Remote origin não é do GitHub: ${url}`);
  return { owner: match[1], repo: match[2] };
}

/**
 * Chamada à API REST do GitHub.
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 * @param {{ allow?: number[] }} [options]
 * @returns {Promise<any>}
 */
async function api(method, path, body, options = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sema-chatbot-scripts",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok && !(options.allow ?? []).includes(res.status)) {
    const text = await res.text();
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  if (res.status === 204 || !res.ok) return { status: res.status };
  const text = await res.text();
  return text ? JSON.parse(text) : { status: res.status };
}

/**
 * Lê `.env.local` (formato simples CHAVE=valor).
 * @returns {Record<string, string>}
 */
function readEnvLocal() {
  if (!existsSync(".env.local")) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !m[2]) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

// ---------------------------------------------------------------------------
// secrets:set / secrets:sync
// ---------------------------------------------------------------------------

/**
 * Criptografa com a chave pública do repositório (libsodium sealed box).
 * @param {string} publicKeyB64
 * @param {string} value
 * @returns {Promise<string>}
 */
async function seal(publicKeyB64, value) {
  // createRequire: a build CJS do libsodium-wrappers é a estável; sem tipos (any).
  const sodium = createRequire(import.meta.url)("libsodium-wrappers");
  await sodium.ready;
  const key = sodium.from_base64(publicKeyB64, sodium.base64_variants.ORIGINAL);
  const sealed = sodium.crypto_box_seal(sodium.from_string(value), key);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

/**
 * @param {string} name
 * @param {{ skipMissing?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
async function setSecret(name, options = {}) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) fail(`Nome de secret inválido: ${name}`);
  const value = process.env[name] || readEnvLocal()[name];
  if (!value) {
    const msg = `${name}: sem valor no ambiente nem no .env.local`;
    if (options.skipMissing) {
      log(`⚠ ${msg} — mantido como está no GitHub.`);
      return false;
    }
    fail(msg);
  }
  const { owner, repo } = getRepo();
  const pk = await api("GET", `/repos/${owner}/${repo}/actions/secrets/public-key`);
  const encrypted = await seal(pk.key, value);
  await api("PUT", `/repos/${owner}/${repo}/actions/secrets/${name}`, {
    encrypted_value: encrypted,
    key_id: pk.key_id,
  });
  log(`✔ Secret ${name} cadastrado.`);
  return true;
}

/**
 * Nomes de secrets na seção "Secrets do Actions" de docs/setup-github.md.
 * @returns {string[]}
 */
function secretsFromDocs() {
  const doc = readFileSync("docs/setup-github.md", "utf8");
  const section = doc.split(/^## /m).find((s) => s.startsWith("Secrets do Actions"));
  if (!section) fail('Seção "## Secrets do Actions" não encontrada em docs/setup-github.md');
  return [...section.matchAll(/^\|\s*`([A-Z0-9_]+)`/gm)].map((m) => m[1]);
}

async function syncSecrets() {
  const names = secretsFromDocs();
  log(`Secrets listados: ${names.join(", ")}`);
  for (const name of names) await setSecret(name, { skipMissing: true });
}

// ---------------------------------------------------------------------------
// repo:setup
// ---------------------------------------------------------------------------

async function repoSetup() {
  const { owner, repo } = getRepo();
  const base = `/repos/${owner}/${repo}`;

  await api("PUT", `${base}/actions/permissions/workflow`, {
    default_workflow_permissions: "write",
    can_approve_pull_request_reviews: false,
  });
  log("✔ Workflow permissions: leitura e escrita.");

  const info = await api("PATCH", base, { delete_branch_on_merge: true });
  log("✔ Apagar branch automaticamente após o merge: ligado.");

  if (info.private) {
    log(
      "ℹ Proteção da main não aplicada: o repositório é privado e, no plano gratuito, o GitHub " +
        "não aplica proteção de branch em repositórios privados (exige Pro/Team). " +
        "O `npm run ship` só faz merge com o CI verde, o que cobre a regra na prática.",
    );
    return;
  }

  await api("PUT", `${base}/branches/${info.default_branch}/protection`, {
    required_status_checks: { strict: true, contexts: REQUIRED_CHECKS },
    enforce_admins: true,
    required_pull_request_reviews: { required_approving_review_count: 0 },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  });
  log(
    `✔ Proteção da ${info.default_branch}: PR obrigatório + checks ${REQUIRED_CHECKS.join(", ")}.`,
  );
}

// ---------------------------------------------------------------------------
// pr:ship
// ---------------------------------------------------------------------------

/** @returns {string} */
function prBody() {
  const commits = git(["log", "--format=- %s (%h)", "--reverse", "origin/main..HEAD"]);
  const template = existsSync(".github/pull_request_template.md")
    ? readFileSync(".github/pull_request_template.md", "utf8")
    : "";
  const checklist = template.includes("## Checklist")
    ? template.slice(template.indexOf("## Checklist"))
    : "";
  return [`## Commits\n\n${commits || "- (sem commits)"}`, checklist].filter(Boolean).join("\n\n");
}

/**
 * Espera os checks do commit terminarem.
 * @param {string} base
 * @param {string} sha
 * @returns {Promise<any[]>}
 */
async function waitForChecks(base, sha) {
  const timeoutMin = Number(process.env.SHIP_TIMEOUT_MIN ?? 25);
  const pollMs = Number(process.env.SHIP_POLL_SEC ?? 15) * 1000;
  const deadline = Date.now() + timeoutMin * 60_000;
  let last = "";

  while (Date.now() < deadline) {
    const data = await api("GET", `${base}/commits/${sha}/check-runs?per_page=100`);
    /** @type {any[]} */
    const runs = data.check_runs ?? [];
    const names = new Set(runs.map((r) => r.name));
    const missing = REQUIRED_CHECKS.filter((n) => !names.has(n));
    const pending = runs.filter((r) => r.status !== "completed");
    const failed = runs.filter(
      (r) => r.status === "completed" && !OK_CONCLUSIONS.has(r.conclusion),
    );

    if (failed.length) return runs;
    if (!missing.length && !pending.length) return runs;

    const status =
      `checks: ${runs.length - pending.length}/${runs.length} concluídos` +
      (missing.length ? ` (aguardando: ${missing.join(", ")})` : "");
    if (status !== last) log(`… ${status}`);
    last = status;
    await sleep(pollMs);
  }
  fail(`Tempo esgotado (${timeoutMin} min) esperando o CI. Nada foi mergeado.`);
}

async function ship() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === "HEAD" || branch === "main")
    fail(`Rode a partir de uma branch feat/* (atual: ${branch}).`);
  if (git(["status", "--porcelain"]))
    fail("Há alterações não commitadas. Faça commit antes do ship.");

  const { owner, repo } = getRepo();
  const base = `/repos/${owner}/${repo}`;

  log(`→ Push de ${branch}`);
  git(["push", "-u", "origin", branch]);
  git(["fetch", "origin", "main", "--quiet"]);

  /** @type {any[]} */
  const open = await api(
    "GET",
    `${base}/pulls?state=open&head=${owner}:${encodeURIComponent(branch)}`,
  );
  let pr = open[0];
  if (pr) {
    log(`→ PR já existe: ${pr.html_url}`);
  } else {
    const title = git(["log", "-1", "--format=%s"]);
    pr = await api("POST", `${base}/pulls`, { title, head: branch, base: "main", body: prBody() });
    log(`✔ PR criado: ${pr.html_url}`);
  }

  const sha = git(["rev-parse", "HEAD"]);
  log("→ Aguardando o CI…");
  const runs = await waitForChecks(base, sha);
  const failed = runs.filter((r) => !OK_CONCLUSIONS.has(r.conclusion));
  if (failed.length) {
    for (const r of failed) log(`✖ ${r.name}: ${r.conclusion} — ${r.html_url ?? r.details_url}`);
    fail(`CI falhou. Nada foi mergeado. PR: ${pr.html_url}`);
  }
  log(`✔ Checks verdes: ${runs.map((r) => r.name).join(", ")}`);

  const merge = await api(
    "PUT",
    `${base}/pulls/${pr.number}/merge`,
    { merge_method: "merge", sha },
    { allow: [405, 409] },
  );
  if (merge.status === 405 || merge.status === 409) {
    fail(`O GitHub não permitiu o merge (HTTP ${merge.status}). Veja o PR: ${pr.html_url}`);
  }
  log(`✔ Merge feito (#${pr.number}).`);

  await api("DELETE", `${base}/git/refs/heads/${encodeURIComponent(branch)}`, undefined, {
    allow: [404, 422],
  });
  log("✔ Branch remota apagada.");

  git(["switch", "main"]);
  git(["pull", "--ff-only"]);
  git(["fetch", "--prune", "--quiet"]);
  git(["branch", "-d", branch]);
  log(`✔ main local atualizada e branch ${branch} apagada.`);
  log(`\nPR: ${pr.html_url}`);
}

// ---------------------------------------------------------------------------

const [command, arg] = process.argv.slice(2);

try {
  if (command === "pr:ship") await ship();
  else if (command === "repo:setup") await repoSetup();
  else if (command === "secrets:set") {
    if (!arg) fail("Uso: npm run secrets:set -- NOME");
    await setSecret(arg);
  } else if (command === "secrets:sync") await syncSecrets();
  else fail("Comandos: pr:ship | repo:setup | secrets:set NOME | secrets:sync");
} catch (error) {
  fail(mask(error));
}
