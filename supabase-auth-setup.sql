-- Execute este script no SQL Editor do Supabase.
-- Ele cria a tabela de perfis usada pelo novo login do sistema-investidor-main.

create table if not exists public.usuarios_sistema (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  perfil text not null check (perfil in ('admin', 'operacional', 'operador_numeros', 'financeiro', 'diretoria')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_usuarios_sistema_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_sistema_updated_at on public.usuarios_sistema;
create trigger trg_usuarios_sistema_updated_at
before update on public.usuarios_sistema
for each row
execute function public.set_usuarios_sistema_updated_at();

alter table public.usuarios_sistema enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select perfil
  from public.usuarios_sistema
  where user_id = auth.uid()
    and ativo = true
  limit 1;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

drop policy if exists "usuarios_sistema_select_own_or_admin" on public.usuarios_sistema;
create policy "usuarios_sistema_select_own_or_admin"
on public.usuarios_sistema
for select
using (auth.uid() = user_id or public.is_app_admin());

drop policy if exists "usuarios_sistema_admin_manage" on public.usuarios_sistema;
create policy "usuarios_sistema_admin_manage"
on public.usuarios_sistema
for all
using (public.is_app_admin())
with check (public.is_app_admin());

alter table public.empresas enable row level security;
alter table public.usados enable row level security;
alter table public.financeiro enable row level security;
alter table public.financeiro_competencias enable row level security;
alter table public.clientes enable row level security;
alter table public.audit_logs enable row level security;

-- Leitura executiva
create policy "empresas_select_app" on public.empresas for select using (public.current_app_role() in ('admin', 'operacional', 'operador_numeros', 'diretoria'));
create policy "usados_select_app" on public.usados for select using (public.current_app_role() in ('admin', 'operacional', 'operador_numeros', 'diretoria'));
create policy "financeiro_select_app" on public.financeiro for select using (public.current_app_role() in ('admin', 'financeiro', 'diretoria'));
create policy "financeiro_competencias_select_app" on public.financeiro_competencias for select using (public.current_app_role() in ('admin', 'financeiro', 'diretoria'));
create policy "clientes_select_app" on public.clientes for select using (public.current_app_role() in ('admin', 'financeiro', 'diretoria'));
create policy "audit_logs_select_app" on public.audit_logs for select using (public.current_app_role() in ('admin', 'operacional', 'operador_numeros', 'financeiro', 'diretoria'));

-- Escrita operacional
create policy "empresas_write_operacional" on public.empresas for all using (public.current_app_role() in ('admin', 'operacional', 'operador_numeros')) with check (public.current_app_role() in ('admin', 'operacional', 'operador_numeros'));
create policy "usados_write_operacional" on public.usados for all using (public.current_app_role() in ('admin', 'operacional', 'operador_numeros')) with check (public.current_app_role() in ('admin', 'operacional', 'operador_numeros'));

-- Escrita financeira
create policy "financeiro_write_financeiro" on public.financeiro for all using (public.current_app_role() in ('admin', 'financeiro')) with check (public.current_app_role() in ('admin', 'financeiro'));
create policy "financeiro_competencias_write_financeiro" on public.financeiro_competencias for all using (public.current_app_role() in ('admin', 'financeiro')) with check (public.current_app_role() in ('admin', 'financeiro'));
create policy "clientes_write_financeiro" on public.clientes for all using (public.current_app_role() in ('admin', 'financeiro')) with check (public.current_app_role() in ('admin', 'financeiro'));

-- Auditoria para usuarios autenticados ativos
create policy "audit_logs_insert_authenticated" on public.audit_logs for insert with check (public.current_app_role() in ('admin', 'operacional', 'operador_numeros', 'financeiro', 'diretoria'));

-- Exemplo de perfil inicial:
-- insert into public.usuarios_sistema (user_id, email, nome, perfil, ativo)
-- values ('UUID_DO_AUTH_USER', 'seu@email.com', 'Seu Nome', 'admin', true)
-- on conflict (user_id) do update set
--   email = excluded.email,
--   nome = excluded.nome,
--   perfil = excluded.perfil,
--   ativo = excluded.ativo;
