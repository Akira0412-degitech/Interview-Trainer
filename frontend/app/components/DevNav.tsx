"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { label: "Interview", href: "/interview" },
  { label: "Session Setup", href: "/session" },
];

export default function DevNav() {
  const pathname = usePathname();

  return (
    <div className="fixed top-2 left-2 z-[9999] flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2 py-1 backdrop-blur-sm shadow-lg">
      <span className="text-zinc-600 text-[10px] font-mono mr-1">DEV</span>
      {PAGES.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
            pathname === p.href
              ? "bg-orange-500/20 text-orange-400 font-medium"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
