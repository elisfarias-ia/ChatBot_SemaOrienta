# ADR 004 — Hospedagem na Vercel, com risco aceito e saída via Docker

- Status: aceito
- Data: 2026-11-13

## Contexto

Precisamos publicar rápido e com baixo custo de operação. A Vercel é a plataforma nativa do Next.js. Porém, por ser um serviço de órgão público, há preocupação com dependência de fornecedor, custos variáveis e eventual exigência de hospedar em infraestrutura do Estado.

## Decisão

- Hospedar inicialmente na **Vercel**, **aceitando conscientemente** o risco de dependência do fornecedor.
- Manter uma **rota de saída**: o app deve funcionar com `next build` + `next start` em um contêiner **Docker** (saída `standalone`), sem depender de recursos exclusivos da Vercel.
- Evitar APIs proprietárias da Vercel (KV, Blob, Edge Config etc.); estado fica no Supabase.

## Consequências

- (+) Deploy rápido, previews por branch, HTTPS e CDN prontos.
- (+) Migração para servidor próprio/nuvem do Estado é viável sem reescrever.
- (−) Limites de tempo de execução de funções podem afetar a ingestão de arquivos grandes (processar em etapas).
- (−) Manter o Dockerfile testado gera um pequeno custo contínuo.
