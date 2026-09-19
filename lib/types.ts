export type Product = {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category: string;
};

export type Category = {
    id: string;
    name: string;
    items: Product[];
};

export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unit';

export type Ingredient = {
    id: string;
    name: string;
    unit: Unit;
    stock: number;
    minStock: number;
    cost: number;
};

export type RecipeItem = {
    ingredientId: string;
    quantity: number;
};

export type ProductRecipe = {
    productId: string;
    ingredients: RecipeItem[];
};

export type TableStatus = 'FREE' | 'OCCUPIED';

export type Table = {
    id: number;
    status: TableStatus;
    total: number;
    order_type?: 'LOCAL' | 'DELIVERY' | 'TAKEAWAY';
    webOrderId?: string;
    clientName?: string;
    items?: any[];
    created_at?: string;
    updated_at?: string;
};

// Dashboard product shape (matches DB schema)
export type DashboardProduct = {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    category_id?: string;
    image_url?: string;
    categories?: { name: string };
};

export type PaymentMethod = 'CASH' | 'CARD' | 'MERCADO_PAGO' | 'BANK_TRANSFER' | 'SANTANDER_RIO' | 'CUENTA_CORRIENTE';

export type OrderItem = {
    id?: string;
    product_id?: string;
    name: string;
    price: number;
    quantity: number;
    is_meta?: boolean;
    details?: Record<string, string>;
};

export type Order = {
    id: string;
    table_id: number | null;
    total: number;
    payment_method?: PaymentMethod | string | null;
    created_at: string;
    created_by?: string;
    items?: OrderItem[];
    customer_name?: string | null;
    customer_phone?: string | null;
    delivery_type?: string | null;
    delivery_info?: string | null;
    order_type?: string | null;
    status?: string | null;
    /** Cobrado en caja */
    paid?: boolean | null;
    customer_id?: string | null;
    delivery_person_id?: number | null;
};

export type Profile = {
    id: string;
    full_name: string;
    role: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'MANAGER' | 'CUSTOMER';
    is_customer: boolean;
    phone?: string;
    address?: string;
    email?: string;
    balance: number;
    coffee_stamps: number;
    birthday?: string;
};
