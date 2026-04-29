-- CF-02 — Baseline DB for technical custom-field bindings
-- Scope: metadata-driven, tenant-scoped, app-native custom fields with technical binding in int_*
-- No ERP runtime sync/read/write logic in this slice.

create extension if not exists pgcrypto;

create table if not exists public.int_field_bindings (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete restrict,
    custom_field_definition_id uuid not null references public.cfg_custom_field_definitions(id) on delete restrict,
    object_type_code text not null,
    target_level text not null default 'header'
        check (target_level in ('header','line')),
    line_context_type text null,
    source_system_code text not null,
    external_object_type text null,
    external_field_identifier text not null,
    external_field_label text null,
    direction_mode text not null
        check (direction_mode in ('read','write','bidirectional_candidate')),
    status text not null default 'draft'
        check (status in ('draft','active','inactive','obsolete')),
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by_user_id uuid null references auth.users(id) on delete set null,
    updated_by_user_id uuid null references auth.users(id) on delete set null,
    row_version bigint not null default 1
);

comment on table public.int_field_bindings is
'CF-02 technical bindings between app-native custom field definitions and external-system field identifiers. Stored only in int_* layer.';

comment on column public.int_field_bindings.custom_field_definition_id is
'Reference to the app-native custom field definition. No ERP metadata stored in core domain.';

comment on column public.int_field_bindings.object_type_code is
'Application target object type code, e.g. production_order, project, product.';

comment on column public.int_field_bindings.target_level is
'header or line, to distinguish header-level and row-level bindings.';

comment on column public.int_field_bindings.source_system_code is
'External target system code, e.g. sap_b1.';

comment on column public.int_field_bindings.external_field_identifier is
'External field identifier in the target system. Kept only in int_* layer.';

comment on column public.int_field_bindings.direction_mode is
'Planned direction only for CF-02: read, write, bidirectional_candidate. No runtime sync in this slice.';

create unique index if not exists uq_int_field_bindings__tenant_cf_system_object_level
    on public.int_field_bindings (
        tenant_id,
        custom_field_definition_id,
        source_system_code,
        object_type_code,
        target_level,
        coalesce(line_context_type, '')
    );

create unique index if not exists uq_int_field_bindings__tenant_system_object_level_external_field
    on public.int_field_bindings (
        tenant_id,
        source_system_code,
        object_type_code,
        target_level,
        coalesce(line_context_type, ''),
        external_field_identifier
    );

create index if not exists ix_int_field_bindings__tenant_id_status
    on public.int_field_bindings (tenant_id, status);

create index if not exists ix_int_field_bindings__tenant_id_source_system_code_object_type_code
    on public.int_field_bindings (tenant_id, source_system_code, object_type_code);

create index if not exists ix_int_field_bindings__custom_field_definition_id
    on public.int_field_bindings (custom_field_definition_id);

alter table public.int_field_bindings enable row level security;

-- Remove existing policies only if they exist
DROP POLICY IF EXISTS int_field_bindings_select_by_membership ON public.int_field_bindings;
DROP POLICY IF EXISTS int_field_bindings_insert_by_membership ON public.int_field_bindings;
DROP POLICY IF EXISTS int_field_bindings_update_by_membership ON public.int_field_bindings;
DROP POLICY IF EXISTS int_field_bindings_delete_by_membership ON public.int_field_bindings;

create policy int_field_bindings_select_by_membership
on public.int_field_bindings
for select
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = int_field_bindings.tenant_id
    )
);

create policy int_field_bindings_insert_by_membership
on public.int_field_bindings
for insert
to authenticated
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = int_field_bindings.tenant_id
    )
);

create policy int_field_bindings_update_by_membership
on public.int_field_bindings
for update
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = int_field_bindings.tenant_id
    )
)
with check (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = int_field_bindings.tenant_id
    )
);

create policy int_field_bindings_delete_by_membership
on public.int_field_bindings
for delete
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = int_field_bindings.tenant_id
    )
);

grant select, insert, update, delete on public.int_field_bindings to authenticated;
grant select, insert, update, delete on public.int_field_bindings to service_role;

-- Optional smoke-check query
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'int_field_bindings'
-- order by ordinal_position;
