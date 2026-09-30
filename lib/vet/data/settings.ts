import type { VetSettings } from "../types";
import { DEFAULT_SETTINGS } from "../catalog/settings";

/**
 * Combina la configuración guardada (admin) con los valores por defecto,
 * para que al agregar opciones nuevas en el código no se rompa nada guardado.
 */
export function mergeSettings(stored: Partial<VetSettings> | null | undefined): VetSettings {
  const s = stored ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...s,
    business: {
      ...d.business,
      ...s.business,
      address: { ...d.business.address, ...s.business?.address },
      colors: { ...d.business.colors, ...s.business?.colors },
    },
    shipping: { ...d.shipping, ...s.shipping },
    loyalty: { ...d.loyalty, ...s.loyalty },
    notifications: { ...d.notifications, ...s.notifications, kinds: { ...d.notifications.kinds, ...s.notifications?.kinds } },
    assistant: { ...d.assistant, ...s.assistant },
    automations: d.automations.map((rule) => ({ ...rule, ...s.automations?.find((r) => r.id === rule.id) })),
  };
}
