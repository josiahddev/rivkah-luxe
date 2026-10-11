"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/server/auth";
import { BrandLogo } from "@/components/store/logo";
import * as I from "@/components/ui/icons";
import { Drawer } from "@/components/ui/dialog";
import type { NavGroup } from "./nav";

const ICONS: Record<string, (p: { size?: number; className?: string }) => React.ReactNode> = {
  home: I.HomeIcon, bag: I.BagIcon, box: I.BoxIcon, layers: I.LayersIcon, tag: I.TagIcon, users: I.UsersIcon,
  megaphone: I.MegaphoneIcon, star: (p) => <I.StarIcon {...p} />, mail: I.MailIcon, chart: I.ChartIcon, edit: I.EditIcon,
  image: I.ImageIcon, message: I.MessageIcon, truck: I.TruckIcon, settings: I.SettingsIcon, clock: I.ClockIcon, help: I.HelpIcon,
};

function NavList({ groups, badges, onNavigate }: { groups: NavGroup[]; badges: Record<string, number>; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-6">
      {groups.map((g) => (
        <div key={g.title || "top"}>
          {g.title && <p className="mb-2 px-3 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-mist">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
              const Icon = ICONS[item.icon] ?? I.InfoIcon;
              const badge = badges[item.href];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={item.hint}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-[0.92rem] transition-colors",
                      active ? "bg-ivory/10 text-ivory" : "text-mist hover:bg-ivory/5 hover:text-ivory",
                    )}
                  >
                    <Icon size={19} className={active ? "text-champagne" : ""} />
                    <span className="flex-1">{item.label}</span>
                    {badge ? <span className="min-w-5 rounded-full bg-gold px-1.5 text-center text-[0.65rem] font-medium leading-5 text-ink">{badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ groups, badges, storeName, userName, roleLabel, part }: { groups: NavGroup[]; badges: Record<string, number>; storeName: string; userName: string; roleLabel: string; part: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  const footer = (
    <div className="border-t border-ivory/10 p-4">
      <p className="text-sm text-ivory">{userName}</p>
      <p className="text-xs text-mist">{roleLabel}</p>
      <div className="mt-3 flex gap-4 text-xs">
        <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-champagne hover:text-ivory">View store <I.ExternalIcon size={13} /></Link>
        <form action={logout}>
          <button className="inline-flex items-center gap-1 text-mist hover:text-ivory"><I.LogOutIcon size={14} /> Sign out</button>
        </form>
      </div>
    </div>
  );

  if (part === "desktop")
    return (
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink lg:flex">
        <Link href="/admin" aria-label={`${storeName} dashboard`} className="flex h-28 items-center justify-center border-b border-ivory/10 px-5">
          <BrandLogo className="h-20" />
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList groups={groups} badges={badges} />
        </div>
        {footer}
      </aside>
    );

  return (
    <>
      {/* Mobile top bar trigger */}
      <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-md border border-line bg-white lg:hidden" aria-label="Open menu">
        <I.MenuIcon size={22} />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} side="left" title={<span className="font-display italic">{storeName}</span>} className="!bg-ink text-ivory [&_*]:border-ivory/10 [&>div:last-child]:!bg-ink" footer={footer}>
        <div className="p-3">
          <NavList groups={groups} badges={badges} onNavigate={() => setOpen(false)} />
        </div>
      </Drawer>
    </>
  );
}
