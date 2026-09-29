import MercadoPagoConfig, { Preference } from "mercadopago";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";

const client = new MercadoPagoConfig({
  accessToken: getMercadoPagoAccessToken() ?? "",
  options: { timeout: 5000 },
});

// Initialize the preference class
export const preference = new Preference(client);

export default client;
