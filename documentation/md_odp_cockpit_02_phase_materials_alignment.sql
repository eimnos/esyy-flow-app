-- MD-ODP-Cockpit-02
-- Dataset minimo per validare il mapping runtime ODP -> Fase -> Materiali
-- Baseline coerente con DB-00:
--   production_orders
--   production_order_phases
--   production_order_phase_materials
--   production_order_phase_events (opzionale, per segnale sintetico)

create extension if not exists pgcrypto;

-- 1) Tabella materiali di fase reali (figlio prevedibile della fase reale)
create table if not exists public.production_order_phase_materials (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    production_order_phase_id uuid not null,
    line_no integer not null,
    product_id uuid null,
    material_code text not null,
    material_name text not null,
    status text not null default 'planned',
    is_critical boolean not null default false,
    planned_qty numeric(18,6) not null default 0,
    issued_qty numeric(18,6) not null default 0,
    consumed_qty numeric(18,6) not null default 0,
    uom_code text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by_user_id uuid null,
    updated_by_user_id uuid null,
    row_version bigint not null default 1,
    constraint fk_production_order_phase_materials__production_order_phase_id
        foreign key (production_order_phase_id)
        references public.production_order_phases (id)
        on delete cascade,
    constraint uq_production_order_phase_materials__phase_id_line_no
        unique (production_order_phase_id, line_no)
);

create index if not exists ix_production_order_phase_materials__tenant_id_phase_id_status
    on public.production_order_phase_materials (tenant_id, production_order_phase_id, status);

-- 2) Eventi di fase minimi per segnale runtime opzionale
create table if not exists public.production_order_phase_events (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    production_order_phase_id uuid not null,
    event_type text not null,
    severity text not null default 'info',
    message text not null,
    event_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint fk_production_order_phase_events__production_order_phase_id
        foreign key (production_order_phase_id)
        references public.production_order_phases (id)
        on delete cascade
);

create index if not exists ix_production_order_phase_events__tenant_id_phase_id_event_at
    on public.production_order_phase_events (tenant_id, production_order_phase_id, event_at desc);

-- 3) View read-only di supporto per contatori sintetici materiali sulla fase
create or replace view public.production_order_phase_overviews as
select
    p.id,
    p.tenant_id,
    p.production_order_id,
    p.phase_code,
    p.name,
    p.status,
    p.planned_start_at,
    p.completed_at,
    coalesce(count(m.id), 0) as materials_count,
    coalesce(sum(case when m.is_critical then 1 else 0 end), 0) as critical_materials_count,
    coalesce(sum(case when e.severity in ('warning','error') then 1 else 0 end), 0) as alert_events_count,
    max(e.event_at) as last_event_at
from public.production_order_phases p
left join public.production_order_phase_materials m
    on m.production_order_phase_id = p.id
left join public.production_order_phase_events e
    on e.production_order_phase_id = p.id
group by
    p.id,
    p.tenant_id,
    p.production_order_id,
    p.phase_code,
    p.name,
    p.status,
    p.planned_start_at,
    p.completed_at;

-- 4) Dataset minimo reale su tenant test
-- Assunzione: esiste gia' tenant_test_a e almeno un ODP/fase creato dai dataset precedenti.
-- Se non esiste, il blocco crea un ODP minimo e una fase minima di supporto.

do $$
declare
    v_tenant_id uuid;
    v_project_id uuid;
    v_order_id uuid;
    v_phase_id uuid;
begin
    select id into v_tenant_id
    from public.tenants
    where code = 'tenant_test_a'
    limit 1;

    if v_tenant_id is null then
        raise exception 'Tenant tenant_test_a non trovato';
    end if;

    -- Prova a riusare una commessa esistente del tenant
    select id into v_project_id
    from public.projects
    where tenant_id = v_tenant_id
    order by created_at asc
    limit 1;

    -- Prova a riusare un ODP esistente del tenant
    select id into v_order_id
    from public.production_orders
    where tenant_id = v_tenant_id
    order by created_at asc
    limit 1;

    -- Se manca, crea un ODP minimo di supporto
    if v_order_id is null then
        v_order_id := gen_random_uuid();

        insert into public.production_orders (
            id,
            tenant_id,
            project_id,
            document_no,
            status,
            planned_start_at,
            due_date,
            created_at,
            updated_at
        ) values (
            v_order_id,
            v_tenant_id,
            v_project_id,
            'ODP-COCKPIT-02',
            'released',
            now(),
            current_date + 3,
            now(),
            now()
        )
        on conflict do nothing;
    end if;

    -- Prova a riusare una fase esistente dell'ODP
    select id into v_phase_id
    from public.production_order_phases
    where tenant_id = v_tenant_id
      and production_order_id = v_order_id
    order by created_at asc
    limit 1;

    -- Se manca, crea una fase minima
    if v_phase_id is null then
        v_phase_id := gen_random_uuid();

        insert into public.production_order_phases (
            id,
            tenant_id,
            production_order_id,
            phase_code,
            name,
            status,
            planned_start_at,
            created_at,
            updated_at
        ) values (
            v_phase_id,
            v_tenant_id,
            v_order_id,
            'PH-001',
            'Taglio materiali cockpit',
            'in_progress',
            now(),
            now(),
            now()
        )
        on conflict do nothing;
    end if;

    -- Inserisce 2 materiali reali sotto la fase
    insert into public.production_order_phase_materials (
        id,
        tenant_id,
        production_order_phase_id,
        line_no,
        material_code,
        material_name,
        status,
        is_critical,
        planned_qty,
        issued_qty,
        consumed_qty,
        uom_code,
        created_at,
        updated_at
    ) values
        (
            gen_random_uuid(),
            v_tenant_id,
            v_phase_id,
            1,
            'MAT-CRIT-001',
            'Lamiera acciaio critica',
            'issued',
            true,
            10,
            8,
            5,
            'KG',
            now(),
            now()
        ),
        (
            gen_random_uuid(),
            v_tenant_id,
            v_phase_id,
            2,
            'MAT-STD-002',
            'Vernice base standard',
            'planned',
            false,
            3,
            0,
            0,
            'LT',
            now(),
            now()
        )
    on conflict (production_order_phase_id, line_no) do update set
        material_code = excluded.material_code,
        material_name = excluded.material_name,
        status = excluded.status,
        is_critical = excluded.is_critical,
        planned_qty = excluded.planned_qty,
        issued_qty = excluded.issued_qty,
        consumed_qty = excluded.consumed_qty,
        uom_code = excluded.uom_code,
        updated_at = now();

    -- Evento/movimento utile per segnale sintetico
    insert into public.production_order_phase_events (
        id,
        tenant_id,
        production_order_phase_id,
        event_type,
        severity,
        message,
        event_at,
        created_at
    ) values (
        gen_random_uuid(),
        v_tenant_id,
        v_phase_id,
        'material_warning',
        'warning',
        'Materiale critico parzialmente emesso rispetto al fabbisogno di fase',
        now(),
        now()
    );
end $$;
