"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AnnouncementBar({ messages, link }: { messages: string[]; link?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (messages.length < 2 || paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 4500);
    return () => clearInterval(t);
  }, [messages.length, paused]);

  const content = (
    <div className="relative h-5 overflow-hidden">
      {messages.map((m, idx) => (
        <p
          key={m}
          className={cn(
            "absolute inset-0 truncate text-center transition-all duration-700 ease-[var(--ease-luxe)]",
            idx === i ? "translate-y-0 opacity-100" : idx < i ? "-translate-y-full opacity-0" : "translate-y-full opacity-0",
          )}
          aria-hidden={idx !== i}
        >
          {m}
        </p>
      ))}
    </div>
  );

  return (
    <div
      className="no-print bg-ink py-2.5 text-[0.7rem] tracking-[0.16em] text-champagne uppercase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Announcements"
    >
      <div className="container-luxe">{link ? <Link href={link} className="block hover:text-ivory">{content}</Link> : content}</div>
    </div>
  );
}
