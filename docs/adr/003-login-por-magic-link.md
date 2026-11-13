# ADR 003 — Login do painel por magic link

- Status: aceito
- Data: 2026-11-13

## Contexto

Só servidores autorizados acessam o `/admin`. Gerenciar senhas aumenta o risco (senhas fracas, reutilizadas) e o suporte (redefinição). Todo servidor já tem e-mail institucional.

## Decisão

- Autenticação por **magic link** enviado por e-mail, usando **Supabase Auth** com `@supabase/ssr` (sessão em cookies, validada no servidor).
- Acesso restrito a uma **lista de e-mails autorizados** (tabela de administradores); e-mail fora da lista não recebe acesso ao painel.
- Formulário de login protegido por **Cloudflare Turnstile** e limite de tentativas.

## Consequências

- (+) Nenhuma senha armazenada ou digitada.
- (+) Fluxo simples para o usuário.
- (−) Depende da entrega de e-mail (atrasos, spam); é preciso configurar SMTP próprio no Supabase em produção.
- (−) Quem controla a caixa de e-mail controla o acesso: links devem expirar rápido e ser de uso único.
