-- Execute este script no SQL Editor do Supabase para padronizar o perfil
-- de operador de numeros no novo modelo de acesso.

alter table public.usuarios_sistema
drop constraint if exists usuarios_sistema_perfil_check;

alter table public.usuarios_sistema
add constraint usuarios_sistema_perfil_check
check (perfil in ('admin', 'operacional', 'operador_numeros', 'financeiro', 'diretoria'));

update public.usuarios_sistema
set perfil = 'operador_numeros'
where perfil = 'operacional';

-- Exemplo de dois usuarios do perfil operador de numeros:
-- update public.usuarios_sistema
-- set nome = 'Fabricio', perfil = 'operador_numeros', ativo = true
-- where email = 'fabricio@seudominio.com';
--
-- update public.usuarios_sistema
-- set nome = 'Priscila', perfil = 'operador_numeros', ativo = true
-- where email = 'priscila@seudominio.com';
