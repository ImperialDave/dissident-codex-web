"use client";

import { useEffect, useState } from "react";
import { resolveDmDisplayNames } from "@/lib/chatDisplay";
import type { ChatRoom } from "@/models";

export function useDmDisplayNames(rooms: ChatRoom[], myUid: string | undefined) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!myUid) {
      setNames({});
      return;
    }

    let cancelled = false;

    resolveDmDisplayNames(rooms, myUid).then((resolved) => {
      if (!cancelled) setNames(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [rooms, myUid]);

  return names;
}