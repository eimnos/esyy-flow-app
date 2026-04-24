-- OLE-06 -> baseline DB concreta per il primo nucleo del layer int_*
-- Coerente con DB-00 v1.0

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- int_external_links
-- Mapping ufficiale tra record applicativo interno e oggetto esterno.
-- external_id = chiave ERP tecnica
-- external_document_no / external_series = chiavi business informative
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_external_links (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    source_system_code      text NOT NULL,
    entity_name             text NOT NULL,
    internal_record_id      uuid NOT NULL,
    external_id             text NOT NULL,
    external_document_no    text NULL,
    external_series         text NULL,
    link_status             text NOT NULL DEFAULT 'linked',
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by_user_id      uuid NULL,
    updated_by_user_id      uuid NULL,
    row_version             bigint NOT NULL DEFAULT 1,
    CONSTRAINT ck_int_external_links__source_system_code_not_blank
        CHECK (length(trim(source_system_code)) > 0),
    CONSTRAINT ck_int_external_links__entity_name_not_blank
        CHECK (length(trim(entity_name)) > 0),
    CONSTRAINT ck_int_external_links__external_id_not_blank
        CHECK (length(trim(external_id)) > 0),
    CONSTRAINT ck_int_external_links__link_status
        CHECK (link_status IN ('linked', 'unlinked', 'error')),
    CONSTRAINT uq_int_external_links__tenant_source_entity_internal
        UNIQUE (tenant_id, source_system_code, entity_name, internal_record_id),
    CONSTRAINT uq_int_external_links__tenant_source_entity_external
        UNIQUE (tenant_id, source_system_code, entity_name, external_id)
);

CREATE INDEX IF NOT EXISTS ix_int_external_links__tenant_source_entity
    ON public.int_external_links (tenant_id, source_system_code, entity_name);

CREATE INDEX IF NOT EXISTS ix_int_external_links__tenant_entity_internal
    ON public.int_external_links (tenant_id, entity_name, internal_record_id);

CREATE INDEX IF NOT EXISTS ix_int_external_links__tenant_source_entity_document_no
    ON public.int_external_links (tenant_id, source_system_code, entity_name, external_document_no);

-- ============================================================
-- int_sync_runs
-- Run di sincronizzazione per tenant / sistema / entità.
-- Append-only tecnico; nessuna unique business oltre alla PK.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_sync_runs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    source_system_code      text NOT NULL,
    entity_name             text NOT NULL,
    sync_direction          text NOT NULL,
    trigger_mode            text NOT NULL DEFAULT 'manual',
    run_status              text NOT NULL DEFAULT 'queued',
    started_at              timestamptz NULL,
    completed_at            timestamptz NULL,
    records_read_count      integer NOT NULL DEFAULT 0,
    records_written_count   integer NOT NULL DEFAULT 0,
    records_failed_count    integer NOT NULL DEFAULT 0,
    error_summary           text NULL,
    response_summary_json   jsonb NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by_user_id      uuid NULL,
    updated_by_user_id      uuid NULL,
    CONSTRAINT ck_int_sync_runs__source_system_code_not_blank
        CHECK (length(trim(source_system_code)) > 0),
    CONSTRAINT ck_int_sync_runs__entity_name_not_blank
        CHECK (length(trim(entity_name)) > 0),
    CONSTRAINT ck_int_sync_runs__sync_direction
        CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
    CONSTRAINT ck_int_sync_runs__trigger_mode
        CHECK (trigger_mode IN ('manual', 'scheduled', 'event')),
    CONSTRAINT ck_int_sync_runs__run_status
        CHECK (run_status IN ('queued', 'running', 'succeeded', 'failed', 'partial')),
    CONSTRAINT ck_int_sync_runs__records_read_count
        CHECK (records_read_count >= 0),
    CONSTRAINT ck_int_sync_runs__records_written_count
        CHECK (records_written_count >= 0),
    CONSTRAINT ck_int_sync_runs__records_failed_count
        CHECK (records_failed_count >= 0)
);

CREATE INDEX IF NOT EXISTS ix_int_sync_runs__tenant_source_entity_created_at
    ON public.int_sync_runs (tenant_id, source_system_code, entity_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_int_sync_runs__tenant_status_created_at
    ON public.int_sync_runs (tenant_id, run_status, created_at DESC);

-- ============================================================
-- int_message_logs
-- Singoli messaggi inbound/outbound collegati a una sync run.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.int_message_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL,
    int_sync_run_id         uuid NULL,
    source_system_code      text NOT NULL,
    entity_name             text NOT NULL,
    message_direction       text NOT NULL,
    message_type            text NOT NULL,
    message_status          text NOT NULL,
    correlation_key         text NULL,
    external_id             text NULL,
    external_document_no    text NULL,
    message_payload_json    jsonb NULL,
    message_headers_json    jsonb NULL,
    response_payload_json   jsonb NULL,
    error_message           text NULL,
    processed_at            timestamptz NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_int_message_logs__int_sync_run_id
        FOREIGN KEY (int_sync_run_id)
        REFERENCES public.int_sync_runs (id)
        ON DELETE SET NULL,
    CONSTRAINT ck_int_message_logs__source_system_code_not_blank
        CHECK (length(trim(source_system_code)) > 0),
    CONSTRAINT ck_int_message_logs__entity_name_not_blank
        CHECK (length(trim(entity_name)) > 0),
    CONSTRAINT ck_int_message_logs__message_direction
        CHECK (message_direction IN ('inbound', 'outbound')),
    CONSTRAINT ck_int_message_logs__message_type
        CHECK (message_type IN ('request', 'response', 'event', 'callback', 'error')),
    CONSTRAINT ck_int_message_logs__message_status
        CHECK (message_status IN ('pending', 'sent', 'received', 'processed', 'failed'))
);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_run_created_at
    ON public.int_message_logs (tenant_id, int_sync_run_id, created_at);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_source_entity_created_at
    ON public.int_message_logs (tenant_id, source_system_code, entity_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_int_message_logs__tenant_correlation_key
    ON public.int_message_logs (tenant_id, correlation_key);

-- ============================================================
-- Regola operativa esplicita
-- Non introdurre colonne ERP raw nel core domain.
-- Esempio SAP B1 / ODP:
--   external_id          <- AbsoluteEntry
--   external_document_no <- DocumentNumber
--   external_series      <- Series
-- Tali campi devono vivere nel layer int_* e non nelle tabelle core.
-- ============================================================
