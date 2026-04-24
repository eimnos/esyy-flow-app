-- DB-CF-01 — baseline SQL minima per campi personalizzati / attributi dinamici tenant-scoped
-- Schema coerente con DB-00 v1.0

CREATE TABLE cfg_custom_field_definitions (
    id                      uuid PRIMARY KEY,
    tenant_id               uuid NOT NULL,
    code                    text NOT NULL,
    status                  text NOT NULL,
    field_domain_code       text NOT NULL,
    created_at              timestamptz NOT NULL,
    updated_at              timestamptz NOT NULL,
    created_by_user_id      uuid NULL,
    updated_by_user_id      uuid NULL,
    deleted_at              timestamptz NULL,
    deleted_by_user_id      uuid NULL,
    row_version             bigint NOT NULL DEFAULT 1,
    CONSTRAINT uq_cfg_custom_field_definitions__tenant_id_code
        UNIQUE (tenant_id, code)
);

CREATE INDEX ix_cfg_custom_field_definitions__tenant_id_status
    ON cfg_custom_field_definitions (tenant_id, status);

CREATE TABLE cfg_custom_field_definition_versions (
    id                                  uuid PRIMARY KEY,
    tenant_id                           uuid NOT NULL,
    custom_field_definition_id          uuid NOT NULL,
    version_no                          integer NOT NULL,
    status                              text NOT NULL,
    field_key                           text NOT NULL,
    label                               text NOT NULL,
    description                         text NULL,
    field_type                          text NOT NULL,
    target_level                        text NOT NULL,
    storage_mode                        text NOT NULL,
    is_required                         boolean NOT NULL DEFAULT false,
    is_read_only                        boolean NOT NULL DEFAULT false,
    is_filterable                       boolean NOT NULL DEFAULT false,
    is_searchable                       boolean NOT NULL DEFAULT false,
    is_reportable                       boolean NOT NULL DEFAULT false,
    is_label_enabled                    boolean NOT NULL DEFAULT false,
    is_default_visible                  boolean NOT NULL DEFAULT true,
    is_current                          boolean NOT NULL DEFAULT false,
    default_value_json                  jsonb NULL,
    formula_expression                  text NULL,
    formula_language                    text NULL,
    valid_from                          date NULL,
    valid_to                            date NULL,
    created_at                          timestamptz NOT NULL,
    updated_at                          timestamptz NOT NULL,
    created_by_user_id                  uuid NULL,
    updated_by_user_id                  uuid NULL,
    CONSTRAINT fk_cfg_custom_field_definition_versions__custom_field_definition_id
        FOREIGN KEY (custom_field_definition_id)
        REFERENCES cfg_custom_field_definitions (id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_cfg_custom_field_definition_versions__custom_field_definition_id_version_no
        UNIQUE (custom_field_definition_id, version_no)
);

CREATE INDEX ix_cfg_custom_field_definition_versions__tenant_id_status
    ON cfg_custom_field_definition_versions (tenant_id, status);

CREATE INDEX ix_cfg_custom_field_definition_versions__tenant_id_field_key
    ON cfg_custom_field_definition_versions (tenant_id, field_key);

CREATE TABLE cfg_custom_field_version_bindings (
    id                                  uuid PRIMARY KEY,
    tenant_id                           uuid NOT NULL,
    custom_field_definition_version_id  uuid NOT NULL,
    object_type_code                    text NOT NULL,
    screen_code                         text NOT NULL,
    section_code                        text NOT NULL,
    target_level                        text NOT NULL,
    line_context_type                   text NULL,
    sort_order                          integer NOT NULL DEFAULT 100,
    visibility_mode                     text NOT NULL DEFAULT 'visible',
    editability_mode                    text NOT NULL DEFAULT 'editable',
    requiredness_mode                   text NOT NULL DEFAULT 'optional',
    binding_status                      text NOT NULL,
    created_at                          timestamptz NOT NULL,
    updated_at                          timestamptz NOT NULL,
    created_by_user_id                  uuid NULL,
    updated_by_user_id                  uuid NULL,
    CONSTRAINT fk_cfg_custom_field_version_bindings__custom_field_definition_version_id
        FOREIGN KEY (custom_field_definition_version_id)
        REFERENCES cfg_custom_field_definition_versions (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_cfg_custom_field_version_bindings__tenant_id_version_object_screen_section_level
        UNIQUE (
            tenant_id,
            custom_field_definition_version_id,
            object_type_code,
            screen_code,
            section_code,
            target_level,
            line_context_type
        )
);

CREATE INDEX ix_cfg_custom_field_version_bindings__tenant_id_object_type_code_screen_code
    ON cfg_custom_field_version_bindings (tenant_id, object_type_code, screen_code);

CREATE TABLE cfg_custom_field_propagation_rules (
    id                                      uuid PRIMARY KEY,
    tenant_id                               uuid NOT NULL,
    source_custom_field_definition_version_id uuid NOT NULL,
    source_object_type_code                 text NOT NULL,
    target_object_type_code                 text NOT NULL,
    target_custom_field_definition_id       uuid NULL,
    propagation_mode                        text NOT NULL,
    trigger_event_code                      text NOT NULL,
    overwrite_mode                          text NOT NULL,
    transformation_expression               text NULL,
    rule_status                             text NOT NULL,
    created_at                              timestamptz NOT NULL,
    updated_at                              timestamptz NOT NULL,
    created_by_user_id                      uuid NULL,
    updated_by_user_id                      uuid NULL,
    CONSTRAINT fk_cfg_custom_field_propagation_rules__source_custom_field_definition_version_id
        FOREIGN KEY (source_custom_field_definition_version_id)
        REFERENCES cfg_custom_field_definition_versions (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_cfg_custom_field_propagation_rules__target_custom_field_definition_id
        FOREIGN KEY (target_custom_field_definition_id)
        REFERENCES cfg_custom_field_definitions (id)
        ON DELETE RESTRICT
);

CREATE INDEX ix_cfg_custom_field_propagation_rules__tenant_id_source_target
    ON cfg_custom_field_propagation_rules (tenant_id, source_object_type_code, target_object_type_code);

CREATE TABLE custom_field_values (
    id                                  uuid PRIMARY KEY,
    tenant_id                           uuid NOT NULL,
    custom_field_definition_id          uuid NOT NULL,
    custom_field_definition_version_id  uuid NOT NULL,
    object_type_code                    text NOT NULL,
    target_record_id                    uuid NOT NULL,
    target_level                        text NOT NULL,
    target_line_record_id               uuid NULL,
    value_text                          text NULL,
    value_number                        numeric(18, 6) NULL,
    value_boolean                       boolean NULL,
    value_date                          date NULL,
    value_datetime                      timestamptz NULL,
    value_json                          jsonb NULL,
    value_search_text                   text NULL,
    value_source_type                   text NOT NULL,
    effective_from                      timestamptz NULL,
    effective_to                        timestamptz NULL,
    created_at                          timestamptz NOT NULL,
    updated_at                          timestamptz NOT NULL,
    created_by_user_id                  uuid NULL,
    updated_by_user_id                  uuid NULL,
    row_version                         bigint NOT NULL DEFAULT 1,
    CONSTRAINT fk_custom_field_values__custom_field_definition_id
        FOREIGN KEY (custom_field_definition_id)
        REFERENCES cfg_custom_field_definitions (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_custom_field_values__custom_field_definition_version_id
        FOREIGN KEY (custom_field_definition_version_id)
        REFERENCES cfg_custom_field_definition_versions (id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_custom_field_values__tenant_target_field_scope
        UNIQUE (
            tenant_id,
            custom_field_definition_id,
            object_type_code,
            target_record_id,
            target_line_record_id
        )
);

CREATE INDEX ix_custom_field_values__tenant_id_object_type_code_target_record_id
    ON custom_field_values (tenant_id, object_type_code, target_record_id);

CREATE INDEX ix_custom_field_values__tenant_id_field_value_search_text
    ON custom_field_values (tenant_id, custom_field_definition_id, value_search_text);

CREATE TABLE custom_field_value_events (
    id                      uuid PRIMARY KEY,
    tenant_id               uuid NOT NULL,
    custom_field_value_id   uuid NOT NULL,
    event_type              text NOT NULL,
    old_value_json          jsonb NULL,
    new_value_json          jsonb NULL,
    event_reason            text NULL,
    source_event_code       text NULL,
    created_at              timestamptz NOT NULL,
    created_by_user_id      uuid NULL,
    CONSTRAINT fk_custom_field_value_events__custom_field_value_id
        FOREIGN KEY (custom_field_value_id)
        REFERENCES custom_field_values (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_custom_field_value_events__tenant_id_custom_field_value_id_created_at
    ON custom_field_value_events (tenant_id, custom_field_value_id, created_at);

-- Read model opzionale per filtri/report/etichette
CREATE VIEW custom_field_resolved_values AS
SELECT
    v.tenant_id,
    v.object_type_code,
    v.target_record_id,
    v.target_line_record_id,
    v.custom_field_definition_id,
    dv.field_key,
    dv.label,
    dv.field_type,
    v.value_text AS value_as_text,
    v.value_number AS value_as_number,
    COALESCE(v.value_date, v.value_datetime::date) AS value_as_date,
    dv.is_filterable,
    dv.is_searchable,
    dv.is_reportable,
    dv.is_label_enabled
FROM custom_field_values v
JOIN cfg_custom_field_definition_versions dv
  ON dv.id = v.custom_field_definition_version_id;
