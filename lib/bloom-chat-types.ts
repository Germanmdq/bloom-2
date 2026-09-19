/** Línea de pedido que el chat puede pasar a WhatsApp o al insert de órdenes */
export type BloomChatCartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variants?: { name: string }[];
  observations?: string;
};

export type BloomMenuCheckoutBridge = {
  whatsappNumber: string;
  handleWhatsAppCheckout: () => void;
  handleWhatsAppCheckoutWithCart: (lines: BloomChatCartLine[]) => void;
};
