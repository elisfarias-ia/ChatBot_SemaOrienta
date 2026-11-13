# ADR 005 — Público-alvo: cidadãos e servidores da SEMA-MT

- Status: aceito
- Data: 2026-11-13

## Contexto

O chatbot atende dois grupos com necessidades diferentes: **cidadãos** (produtores rurais, empreendedores, estudantes — muitos pelo celular e com pouca familiaridade com termos técnicos) e **servidores da SEMA-MT** (buscam normas e procedimentos com precisão).

## Decisão

- Chat **público, sem login**, protegido por Cloudflare Turnstile e limite de uso.
- **Mobile first** e **WCAG 2.1 AA**.
- Respostas em **pt-BR, linguagem simples**, sempre **citando as fontes** usadas; quando não houver base nas fontes, o bot diz que não sabe e indica o canal oficial de atendimento.
- O bot **não** coleta dados pessoais nem dá parecer oficial; deixa claro que as respostas são orientativas.

## Consequências

- (+) Acesso amplo e inclusivo, inclusive em conexões lentas.
- (+) Citações permitem ao servidor conferir a norma original.
- (−) Chat público exige proteção contra abuso e controle de custo do LLM.
- (−) Linguagem simples pode perder nuances; as citações compensam isso.
