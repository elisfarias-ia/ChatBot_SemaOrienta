# ADR 006 — Projeto Supabase em us-east-1

- Status: aceito
- Data: 2026-11-13

## Contexto

O planejado era criar o projeto Supabase em `sa-east-1` (São Paulo), mais perto dos usuários
de Mato Grosso. O projeto `ChatBot_SemaOrienta` (`cgwbfvfrohjkynvojcgl`) foi criado em
`us-east-1` (EUA). No Supabase, a região não pode ser alterada depois da criação.

## Decisão

Manter o projeto `ChatBot_SemaOrienta` em `us-east-1`, sem criar um novo em São Paulo.

## Consequências

- (+) Sem retrabalho: o projeto existente, o SMTP do painel e os secrets do GitHub continuam valendo.
- (−) Latência maior a partir do Brasil (dezenas a ~150 ms por consulta). Para o chat, o tempo do LLM
  domina, mas vale medir. Se a Vercel for usada, escolher a região `iad1` (EUA, leste) para as funções
  fica perto do banco.
- (−) Os dados (fontes cadastradas, e-mails dos administradores, logs) ficam armazenados fora do Brasil.
  Isso deve ser validado com a área jurídica e de TI da SEMA-MT à luz da LGPD (transferência
  internacional de dados) antes de ir para produção.
- Saída: criar um projeto em `sa-east-1`, rodar `db push --remote` e migrar os dados com `pg_dump`/`pg_restore`.
