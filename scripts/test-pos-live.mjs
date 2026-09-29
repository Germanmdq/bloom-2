import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zcgctaqzqcpqopforttc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HNrP-eOoDNRb17Q0BfmMQQ_hNuFi50h";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
    console.log("=== INICIANDO PRUEBA DE BLOOM POS ===");

    // 1. Verificar conexión y productos
    console.log("\n1. Verificando productos en base de datos...");
    const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .limit(3);

    if (prodErr) {
        console.error("❌ Error leyendo productos:", prodErr.message);
        return;
    }
    console.log(`✓ Productos encontrados (${prods.length}):`, prods.map(p => `${p.name} ($${p.price})`).join(", "));

    // 2. Probar abrir Mesa 1 en salon_tables
    console.log("\n2. Abriendo Mesa 1 con comanda de prueba...");
    const testItems = [
        { id: prods[0]?.id || "item-1", name: prods[0]?.name || "Café con Leche", price: Number(prods[0]?.price) || 2500, quantity: 2 },
        { id: prods[1]?.id || "item-2", name: prods[1]?.name || "Medialuna", price: Number(prods[1]?.price) || 1200, quantity: 3 }
    ];
    const total = testItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    const { data: tableData, error: tableErr } = await supabase
        .from("salon_tables")
        .upsert({
            id: 1,
            status: "OCCUPIED",
            order_type: "LOCAL",
            total: total,
            items: testItems,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (tableErr) {
        console.error("❌ Error al abrir Mesa 1:", tableErr.message);
    } else {
        console.log("✓ Mesa 1 abierta con éxito!");
        console.log(`  - Estado: ${tableData.status}`);
        console.log(`  - Total: $${tableData.total}`);
        console.log(`  - Ítems: ${testItems.map(i => `${i.quantity}x ${i.name}`).join(", ")}`);
    }

    // 3. Crear una orden web de prueba (Delivery)
    console.log("\n3. Creando un pedido web de Delivery de prueba...");
    const webOrderItems = [
        { id: prods[2]?.id || "item-3", name: prods[2]?.name || "Tarta Individual", price: Number(prods[2]?.price) || 4500, quantity: 1 }
    ];
    const webTotal = webOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
            customer_name: "Mateo (Prueba Delivery)",
            customer_phone: "223-555-1234",
            order_type: "WEB",
            delivery_type: "delivery",
            delivery_info: "Calle Falsa 123 - Timbre B",
            items: webOrderItems,
            total: webTotal,
            status: "pending",
            paid: false,
            payment_method: "PENDING"
        })
        .select()
        .single();

    if (orderErr) {
        console.error("❌ Error al crear pedido de delivery:", orderErr.message);
    } else {
        console.log("✓ Pedido de Delivery creado con éxito!");
        console.log(`  - ID: ${orderData.id}`);
        console.log(`  - Cliente: ${orderData.customer_name}`);
        console.log(`  - Total: $${orderData.total}`);
        console.log(`  - Dirección: ${orderData.delivery_info}`);
    }

    console.log("\n=== PRUEBA FINALIZADA CON ÉXITO ===");
}

runTest();
