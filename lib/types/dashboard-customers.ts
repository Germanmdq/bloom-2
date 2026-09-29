export type DashboardCustomerRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  customer_number: string;
  /** ISO fecha (YYYY-MM-DD) desde auth.users.user_metadata.birthdate */
  birthdate: string | null;
  defaultAddress: string;
  orderCount: number;
  lastOrderAt: string | null;
  loyaltyPoints: number;
  balance: number;
  isSocio: boolean;
};

export type CustomerOrderRow = {
  id: string;
  created_at: string;
  status: string | null;
  total: number | null;
  paid: boolean;
  cuenta_corriente: boolean;
  customer_name: string | null;
  order_type: string | null;
  delivery_type: string | null;
};
