-- ============================================================================
-- Migration: close_table_rpc.sql (CORREGIDA)
-- Tipos verificados:
--   salon_tables.id        → INTEGER
--   orders.table_id        → INTEGER
--   kitchen_tickets.table_id → TEXT  (setup_completo.sql definió TEXT)
--   orders.delivery_person_id → INTEGER
-- ============================================================================

-- Eliminar versiones anteriores (firmas viejas con INT)
DROP FUNCTION IF EXISTS public.close_table_and_create_order(INT, NUMERIC, TEXT, TEXT, BOOLEAN, UUID, UUID, TEXT, NUMERIC, JSONB, INT);
DROP FUNCTION IF EXISTS public.release_table_for_paid_order(UUID);

-- 1. Función RPC para Cierre de Mesa y Creación de Orden en una única transacción atómica
CREATE OR REPLACE FUNCTION public.close_table_and_create_order(
    p_table_id INT,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_status TEXT,
    p_paid BOOLEAN,
    p_waiter_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_discount NUMERIC DEFAULT 0,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_delivery_person_id INT DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- 1. Insertar la orden en orders (table_id es INTEGER, coincide con p_table_id)
    INSERT INTO orders (
        table_id,
        total,
        payment_method,
        waiter_id,
        customer_id,
        customer_name,
        discount,
        items,
        delivery_person_id,
        status,
        paid
    ) VALUES (
        p_table_id,
        p_total,
        p_payment_method,
        p_waiter_id,
        p_customer_id,
        p_customer_name,
        p_discount,
        p_items,
        p_delivery_person_id,
        p_status,
        p_paid
    ) RETURNING id INTO v_order_id;

    -- 2. Liberar la mesa en salon_tables (id es INTEGER, coincide)
    UPDATE salon_tables 
    SET status = 'FREE',
        total = 0,
        items = '[]'::jsonb,
        updated_at = NOW()
    WHERE id = p_table_id;

    -- 3. Marcar las comandas de cocina como DELIVERED (sin borrar historial)
    --    kitchen_tickets.table_id es TEXT → castear p_table_id a TEXT
    UPDATE kitchen_tickets 
    SET status = 'DELIVERED'
    WHERE table_id = p_table_id::TEXT AND status != 'DELIVERED';

    RETURN jsonb_build_object('order_id', v_order_id, 'success', true);
END;
$$;

-- Permisos estrictos
REVOKE EXECUTE ON FUNCTION public.close_table_and_create_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_table_and_create_order TO authenticated, service_role;

-- ============================================================================
-- 2. RPC para Liberación Segura de Mesa en flujos asíncronos
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_table_for_paid_order(
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table_id INT;
    v_order_created_at TIMESTAMPTZ;
    v_order_paid BOOLEAN;
    v_order_status TEXT;
    v_table_updated_at TIMESTAMPTZ;
    v_table_status TEXT;
    v_released BOOLEAN := FALSE;
BEGIN
    -- 1. Obtener la orden y verificar que esté pagada
    SELECT table_id, created_at, paid, status 
    INTO v_table_id, v_order_created_at, v_order_paid, v_order_status
    FROM orders 
    WHERE id = p_order_id;

    IF v_table_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_table_id');
    END IF;

    -- Guard: verificar que la orden esté efectivamente pagada
    IF NOT (v_order_paid = true OR v_order_status IN ('paid', 'completed')) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'order_not_paid');
    END IF;

    -- 2. Obtener estado actual de la mesa en salon_tables
    SELECT status, updated_at 
    INTO v_table_status, v_table_updated_at
    FROM salon_tables 
    WHERE id = v_table_id;

    -- 3. Guard: Solo liberar si la mesa sigue OCCUPIED y NO fue re-ocupada
    --    Contemplar updated_at NULL para mesas viejas sin ese campo
    IF v_table_status = 'OCCUPIED' AND (v_table_updated_at IS NULL OR v_table_updated_at <= v_order_created_at + INTERVAL '2 minutes') THEN
        UPDATE salon_tables 
        SET status = 'FREE',
            total = 0,
            items = '[]'::jsonb,
            updated_at = NOW()
        WHERE id = v_table_id;

        -- kitchen_tickets.table_id es TEXT → castear v_table_id a TEXT
        UPDATE kitchen_tickets 
        SET status = 'DELIVERED'
        WHERE table_id = v_table_id::TEXT 
          AND status != 'DELIVERED' 
          AND created_at <= v_order_created_at + INTERVAL '2 minutes';

        v_released := TRUE;
    END IF;

    RETURN jsonb_build_object('success', true, 'table_id', v_table_id, 'released', v_released);
END;
$$;

-- Permisos estrictos
REVOKE EXECUTE ON FUNCTION public.release_table_for_paid_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_table_for_paid_order TO authenticated, service_role;
