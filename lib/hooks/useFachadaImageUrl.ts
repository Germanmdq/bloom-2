"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Mismo fallback que `U.fachada` en la home (asset local). */
export const FACHADA_IMAGE_FALLBACK = "/images/bloom-fachada.png";

export function useFachadaImageUrl() {
  const [src, setSrc] = useState(FACHADA_IMAGE_FALLBACK);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("app_settings").select("fachada_image_url").eq("id", 1).maybeSingle();
      const url = data?.fachada_image_url?.trim();
      if (url) setSrc(url);
    })();
  }, []);

  return src;
}
