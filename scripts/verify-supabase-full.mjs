import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zcgctaqzqcpqopforttc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HNrP-eOoDNRb17Q0BfmMQQ_hNuFi50h";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
    console.log("=== DIAGNÓSTICO INTEGRAL DE SUPABASE ===");
    let allGood = true;

    // 1. Categorías
    const { data: catData, error: catErr } = await supabase.from("categories").select("id, name");
    if (catErr) {
        console.error("❌ Categorías error:", catErr.message);
        allGood = false;
    } else {
        console.log(`✓ Categorías: ${catData.length} registradas.`);
    }

    // 2. Productos
    const { data: prodData, error: prodErr } = await supabase.from("products").select("id, name, price");
    if (prodErr) {
        console.error("❌ Productos error:", prodErr.message);
        allGood = false;
    } else {
        console.log(`✓ Productos: ${prodData.length} registrados.`);
    }

    // 3. Mesas (salon_tables)
    const { data: tableData, error: tableErr } = await supabase
        .from("salon_tables")
        .select("id, status, items, order_type")
        .order("id", { ascending: true });

    if (tableErr) {
        console.error("❌ Mesas (salon_tables) error:", tableErr.message);
        allGood = false;
    } else {
        console.log(`✓ Mesas (salon_tables): ${tableData.length} mesas en base de datos.`);
    }

    // Probar abrir Mesa 1 en vivo
    console.log("\nProbando apertura de Mesa 1...");
    const testItems = [
        { id: "test-item-1", name: "Café Doble", price: 2800, quantity: 1 },
        { id: "test-item-2", name: "Medialuna de Manteca", price: 1200, quantity: 2 }
    ];
    const { data: openData, error: openErr } = await supabase
        .from("salon_tables")
        .upsert({
            id: 1,
            status: "OCCUPIED",
            order_type: "LOCAL",
            total: 5200,
            items: testItems,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (openErr) {
        console.error("❌ Error al abrir Mesa 1:", openErr.message);
        allGood = false;
    } else {
        console.log(`✓ ¡Mesa 1 abierta con éxito! Total: $${openData.total}, Estado: ${openData.status}`);
    }

    // 4. Órdenes (orders)
    const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("id, customer_id, delivery_info, cuenta_corriente, paid, status")
        .limit(1);

    if (orderErr) {
        console.error("❌ Órdenes (orders) error:", orderErr.message);
        allGood = false;
    } else {
        console.log("✓ Tabla orders con todas sus columnas verificadas.");
    }

    // 5. Perfiles (profiles)
    const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, role, is_customer, balance, coffee_stamps")
        .limit(1);

    if (profileErr) {
        console.error("❌ Perfiles (profiles) error:", profileErr.message);
        allGood = false;
    } else {
        console.log("✓ Tabla profiles con columnas de fidelidad y roles verificadas.");
    }

    console.log("\n========================================");
    if (allGood) {
        console.log("🎉 ¡TODO PERFECTO! Tu base de datos está 100% lista y completa.");
    } else {
        console.log("⚠️ Hubo algunos detalles pendientes detallados arriba.");
    }
    console.log("========================================");
}

checkDatabase();
