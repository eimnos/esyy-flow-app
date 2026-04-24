-- OLE-12 — Baseline DB finale blocco integrazione iniziale
-- SQL minimo di formalizzazione del nucleo `int_*`
-- Coerente con DB-00 v1.0 e con la baseline approvata del layer integrazione.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. int_external_links
-- Mapping ufficiale tra oggetto interno e oggetto esterno
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_external_links (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    source_system_code      text NOT NULL,
    internal_entity_type    text NOT NULL,
    internal_entity_id      uuid NOT NULL,
    external_object_type    text NOT NULL,
    external_id             text NOT NULL,
    external_document_no    text NULL,
    external_series         text NULL,
    external_code           text NULL,
    link_role               text NOT NULL DEFAULT 'primary',
    status                  text NOT NULL DEFAULT 'active',
    linked_at               timestamptz NOT NULL DEFAULT now(),
    last_seen_at            timestamptz NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by_user_id      uuid NULL,
    updated_by_user_id      uuid NULL,
    row_version             bigint NOT NULL DEFAULT 1,
    CONSTRAINT uq_int_external_links__tenant_entity_role
        UNIQUE (tenant_id, source_system_code, internal_entity_type, internal_entity_id, link_role),
    CONSTRAINT uq_int_external_links__tenant_external_object
        UNIQUE (tenant_id, source_system_code, external_object_type, external_id)
);

CREATE INDEX IF NOT EXISTS ix_int_external_links__tenant_entity
    ON public.int_external_links (tenant_id, internal_entity_type, internal_entity_id);

CREATE INDEX IF NOT EXISTS ix_int_external_links__tenant_external_lookup
    ON public.int_external_links (tenant_id, source_system_code, external_object_type, external_document_no);

-- ============================================================
-- 2. int_sync_runs
-- Contenitore tecnico delle run di bootstrap/sync
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_sync_runs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    source_system_code      text NOT NULL,
    integration_area        text NOT NULL,
    entity_name             text NOT NULL,
    operation_type          text NOT NULL,
    direction               text NOT NULL,
    status                  text NOT NULL,
    trigger_type            text NOT NULL DEFAULT 'manual',
    correlation_id          text NULL,
    requested_at            timestamptz NOT NULL DEFAULT now(),
    started_at              timestamptz NULL,
    finished_at             timestamptz NULL,
    requested_by_user_id    uuid NULL,
    records_read_count      integer NOT NULL DEFAULT 0,
    records_written_count   integer NOT NULL DEFAULT 0,
    records_failed_count    integer NOT NULL DEFAULT 0,
    error_count             integer NOT NULL DEFAULT 0,
    notes                   text NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    row_version             bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS ix_int_sync_runs__tenant_status_requested
    ON public.int_sync_runs (tenant_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS ix_int_sync_runs__tenant_area_entity
    ON public.int_sync_runs (tenant_id, integration_area, entity_name);

-- ============================================================
-- 3. int_message_logs
-- Log tecnico dei singoli messaggi inbound/outbound
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_message_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    sync_run_id             uuid NULL,
    source_system_code      text NOT NULL,
    direction               text NOT NULL,
    entity_name             text NOT NULL,
    message_type            text NOT NULL,
    status                  text NOT NULL,
    external_message_id     text NULL,
    external_object_type    text NULL,
    external_id             text NULL,
    external_document_no    text NULL,
    external_series         text NULL,
    internal_entity_type    text NULL,
    internal_entity_id      uuid NULL,
    http_status_code        integer NULL,
    request_payload_json    jsonb NULL,
    response_payload_json   jsonb NULL,
    error_message           text NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_int_message_logs__sync_run_id
        FOREIGN KEY (sync_run_id)
        REFERENCES public.int_sync_runs (id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_created
    ON public.int_message_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_run
    ON public.int_message_logs (tenant_id, sync_run_id);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_external
    ON public.int_message_logs (tenant_id, source_system_code, external_object_type, external_id);

-- ============================================================
-- Note di baseline:
-- - external_id / external_document_no / external_series restano nel layer int_*
-- - nessuna chiave ERP raw deve essere portata nel core domain
-- - ProductTrees non coincidono con la DIBA piena/versionata Esyy Flow
-- - bootstrap minimo ERP ammesso: Items, ProductTrees
-- ============================================================
