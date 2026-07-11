"use client";

/* ============================================================
   Presencia en vivo — quién está mirando el mismo espacio ahora.
   Usa Supabase Realtime Presence sobre un canal por equipo, así
   miembros y facilitador se ven entre sí. Efímero, sin tablas.
   ============================================================ */

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";

export interface PresentUser { userId: string; name: string; initials?: string; role?: string }

export function usePresence(channelKey: string | undefined, me: PresentUser | null): PresentUser[] {
  const [online, setOnline] = useState<PresentUser[]>([]);
  const meId = me?.userId;
  const meName = me?.name;

  useEffect(() => {
    if (!channelKey || !meId) return;
    const sb = getSupabaseBrowserClient();
    const channel = sb.channel(channelKey, { config: { presence: { key: meId } } });

    const sync = () => {
      const state = channel.presenceState<PresentUser>();
      const users = new Map<string, PresentUser>();
      for (const key of Object.keys(state)) {
        const metas = state[key];
        if (metas && metas[0]) users.set(key, metas[0] as PresentUser);
      }
      setOnline([...users.values()]);
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ userId: meId, name: meName, initials: me?.initials, role: me?.role });
    });

    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, meId, meName]);

  return online;
}
