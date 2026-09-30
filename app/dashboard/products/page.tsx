import { createClient } from "@/lib/supabase/server";
import ProductsClient from "@/components/dashboard/ProductsClient";

export default async function ProductsPage() {
    const supabase = await createClient();

    const [{ data: categories }, { data: products }, { data: rawProducts }] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('products').select('*, categories(name)'),
        supabase.from('raw_products').select('*').eq('active', true),
    ]);

    return (
        <ProductsClient
            initialProducts={products || []}
            initialCategories={categories || []}
            rawProducts={rawProducts || []}
        />
    );
}
