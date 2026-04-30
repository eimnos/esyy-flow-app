-- MD-ODP-Cockpit-02
-- Pass 3: align real runtime data so the cockpit can show ODP -> Phase -> Materials
-- Assumes tenant_test_a as test tenant. Adjust the tenant code below if needed.

DO $$
DECLARE
    v_tenant_code text := 'tenant_test_a';
    v_tenant_id uuid;
    v_project_id uuid;
    v_order_id uuid;
    v_phase_id uuid;
    v_material_product_1_id uuid;
    v_material_product_2_id uuid;
BEGIN
    SELECT id
    INTO v_tenant_id
    FROM public.tenants
    WHERE code = v_tenant_code
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant with code % not found', v_tenant_code;
    END IF;

    -- Reuse an existing project if present, otherwise create a minimal one.
    SELECT id
    INTO v_project_id
    FROM public.projects
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_project_id IS NULL THEN
        INSERT INTO public.projects (
            id,
            tenant_id,
            code,
            name,
            status,
            priority,
            operational_summary,
            ordered_qty,
            produced_qty,
            shipped_qty,
            purchased_qty,
            invoiced_qty,
            order_value_amount,
            purchased_value_amount,
            produced_value_amount,
            invoiced_value_amount,
            invoiced_amount,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            'COMM-ODP-COCKPIT-01',
            'Commessa test cockpit ODP',
            'active',
            'high',
            'Commessa tecnica per validazione ODP → Fase → Materiali',
            100,
            20,
            0,
            10,
            0,
            5000,
            1200,
            800,
            0,
            0,
            now(),
            now()
        )
        RETURNING id INTO v_project_id;
    END IF;

    -- Reuse an existing ODP if present, otherwise create one.
    SELECT id
    INTO v_order_id
    FROM public.production_orders
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_order_id IS NULL THEN
        INSERT INTO public.production_orders (
            id,
            tenant_id,
            project_id,
            document_no,
            status,
            order_code,
            priority,
            planned_start_at,
            due_date,
            is_blocked,
            blocked_reason,
            phases_count,
            delayed_phases_count,
            blocked_phases_count,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            v_project_id,
            'ODP-COCKPIT-01',
            'in_progress',
            'ODP-COCKPIT-01',
            'high',
            now(),
            current_date + 3,
            false,
            null,
            0,
            0,
            0,
            now(),
            now()
        )
        RETURNING id INTO v_order_id;
    END IF;

    -- Prefer the ASM phase if already present; otherwise create it.
    SELECT id
    INTO v_phase_id
    FROM public.production_order_phases
    WHERE production_order_id = v_order_id
      AND phase_code = 'ASM'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_phase_id IS NULL THEN
        INSERT INTO public.production_order_phases (
            id,
            tenant_id,
            production_order_id,
            phase_code,
            phase_name,
            status,
            phase_order,
            planned_start_at,
            planned_end_at,
            due_date,
            is_blocked,
            blocked_reason,
            is_delayed,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            v_order_id,
            'ASM',
            'Assembly',
            'in_progress',
            1,
            now(),
            now() + interval '4 hours',
            current_date + 1,
            false,
            null,
            false,
            now(),
            now()
        )
        RETURNING id INTO v_phase_id;
    END IF;

    -- Ensure product records exist for material rows.
    SELECT id
    INTO v_material_product_1_id
    FROM public.products
    WHERE tenant_id = v_tenant_id
      AND code = 'MAT-ASM-001'
    LIMIT 1;

    IF v_material_product_1_id IS NULL THEN
        INSERT INTO public.products (
            id,
            tenant_id,
            code,
            name,
            status,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            'MAT-ASM-001',
            'Vite assemblaggio',
            'active',
            now(),
            now()
        )
        RETURNING id INTO v_material_product_1_id;
    END IF;

    SELECT id
    INTO v_material_product_2_id
    FROM public.products
    WHERE tenant_id = v_tenant_id
      AND code = 'MAT-ASM-002'
    LIMIT 1;

    IF v_material_product_2_id IS NULL THEN
        INSERT INTO public.products (
            id,
            tenant_id,
            code,
            name,
            status,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            'MAT-ASM-002',
            'Staffa supporto',
            'active',
            now(),
            now()
        )
        RETURNING id INTO v_material_product_2_id;
    END IF;

    -- Insert two real phase-material rows if missing.
    IF NOT EXISTS (
        SELECT 1
        FROM public.production_order_phase_materials
        WHERE production_order_phase_id = v_phase_id
          AND material_code = 'MAT-ASM-001'
    ) THEN
        INSERT INTO public.production_order_phase_materials (
            id,
            tenant_id,
            production_order_phase_id,
            line_no,
            product_id,
            material_code,
            material_name,
            status,
            is_critical,
            planned_qty,
            issued_qty,
            consumed_qty,
            uom_code,
            created_at,
            updated_at,
            row_version
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            v_phase_id,
            10,
            v_material_product_1_id,
            'MAT-ASM-001',
            'Vite assemblaggio',
            'issued',
            true,
            12,
            12,
            8,
            'PZ',
            now(),
            now(),
            1
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.production_order_phase_materials
        WHERE production_order_phase_id = v_phase_id
          AND material_code = 'MAT-ASM-002'
    ) THEN
        INSERT INTO public.production_order_phase_materials (
            id,
            tenant_id,
            production_order_phase_id,
            line_no,
            product_id,
            material_code,
            material_name,
            status,
            is_critical,
            planned_qty,
            issued_qty,
            consumed_qty,
            uom_code,
            created_at,
            updated_at,
            row_version
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            v_phase_id,
            20,
            v_material_product_2_id,
            'MAT-ASM-002',
            'Staffa supporto',
            'planned',
            false,
            2,
            0,
            0,
            'PZ',
            now(),
            now(),
            1
        );
    END IF;

    -- Keep at least one useful warning event linked to the phase.
    IF NOT EXISTS (
        SELECT 1
        FROM public.production_order_phase_events
        WHERE production_order_phase_id = v_phase_id
          AND event_type = 'material_warning'
    ) THEN
        INSERT INTO public.production_order_phase_events (
            id,
            tenant_id,
            production_order_phase_id,
            event_type,
            severity,
            message,
            event_at,
            created_at
        )
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            v_phase_id,
            'material_warning',
            'warning',
            'Materiale critico in consumo sulla fase ASM',
            now(),
            now()
        );
    END IF;

    -- Refresh ODP counters coherently.
    UPDATE public.production_orders po
    SET phases_count = (
            SELECT count(*)
            FROM public.production_order_phases p
            WHERE p.production_order_id = po.id
        ),
        delayed_phases_count = (
            SELECT count(*)
            FROM public.production_order_phases p
            WHERE p.production_order_id = po.id
              AND p.is_delayed = true
        ),
        blocked_phases_count = (
            SELECT count(*)
            FROM public.production_order_phases p
            WHERE p.production_order_id = po.id
              AND p.is_blocked = true
        ),
        updated_at = now()
    WHERE po.id = v_order_id;
END $$;

-- Recreate the support view explicitly to avoid column-order/name drift.
DROP VIEW IF EXISTS public.production_order_phase_overviews;

CREATE VIEW public.production_order_phase_overviews AS
SELECT
    p.id,
    p.tenant_id,
    p.production_order_id,
    p.phase_code,
    p.phase_name,
    p.phase_name AS name,
    p.status,
    p.phase_order,
    p.planned_start_at,
    p.planned_end_at,
    p.due_date,
    p.is_blocked,
    p.blocked_reason,
    p.is_delayed,
    COALESCE(m.materials_count, 0) AS materials_count,
    COALESCE(m.critical_materials_count, 0) AS critical_materials_count,
    COALESCE(e.events_count, 0) AS events_count,
    COALESCE(e.alert_events_count, 0) AS alert_events_count,
    e.last_event_at
FROM public.production_order_phases p
LEFT JOIN LATERAL (
    SELECT
        count(*)::integer AS materials_count,
        count(*) FILTER (WHERE is_critical)::integer AS critical_materials_count
    FROM public.production_order_phase_materials m
    WHERE m.production_order_phase_id = p.id
) m ON true
LEFT JOIN LATERAL (
    SELECT
        count(*)::integer AS events_count,
        count(*) FILTER (WHERE severity IN ('warning', 'error'))::integer AS alert_events_count,
        max(event_at) AS last_event_at
    FROM public.production_order_phase_events e
    WHERE e.production_order_phase_id = p.id
) e ON true;
