-- Bucket privado para os arquivos enviados no painel (PDF e DOCX), até 25 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Sem políticas RLS em storage.objects para este bucket: só o servidor
-- (chave secreta) lê e grava. Políticas para usuários serão criadas junto
-- com o painel /admin.
