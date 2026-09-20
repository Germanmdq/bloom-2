import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zcgctaqzqcpqopforttc.supabase.co',
  'sb_publishable_HNrP-eOoDNRb17Q0BfmMQQ_hNuFi50h'
);

const { data, error } = await supabase
  .from('orders')
  .update({ status: 'cancelled' })
  .eq('status', 'pending')
  .select('id, customer_name, status');

if (error) {
  console.error('Error:', error.message, JSON.stringify(error));
} else {
  console.log('Canceladas:', data?.length ?? 0, JSON.stringify(data));
}

const { error: e2 } = await supabase.from('salon_tables').update({ status: 'FREE', total: 0, items: [] }).neq('status', 'FREE');
console.log('salon_tables:', e2 ? e2.message : 'OK');

const { error: e3 } = await supabase.from('kitchen_tickets').update({ status: 'CANCELLED' }).eq('status', 'PENDING');
console.log('kitchen_tickets:', e3 ? e3.message : 'OK');
