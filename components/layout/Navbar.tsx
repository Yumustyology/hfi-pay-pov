"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Bell, Send, LayoutDashboard, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import NotificationDrawer from "@/components/ui/NotificationDrawer";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: Send },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [unread, setUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setUnread(0);
      return;
    }
    async function fetchUnread() {
      try {
        const res = await fetch(`/api/notifications?walletAddress=${address}`);
        const data = await res.json();
        if (data.success) {
          const count = (data.data.notifications ?? []).filter(
            (n: { read: boolean }) => !n.read
          ).length;
          setUnread(count);
        }
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-[rgba(8,8,20,0.75)] backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
        >
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center glow-sm transition-all group-hover:scale-105">
            <span className="text-white font-black text-sm">Ħ</span>
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight hidden sm:block">
            HFI<span className="gradient-text">Pay</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "relative p-2 rounded-lg transition-all duration-200 hidden md:inline-flex cursor-pointer",
                drawerOpen
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full gradient-brand text-[10px] font-bold text-white flex items-center justify-center pulse-dot">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          )}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-white/[0.08] bg-[rgba(8,8,20,0.85)] backdrop-blur-2xl px-4 py-2 flex gap-4
        [background-image:linear-gradient(to_bottom,rgba(79,70,229,0.04),transparent)]
        shadow-[0_-1px_0_rgba(255,255,255,0.05),0_-8px_32px_rgba(0,0,0,0.4)]">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1 rounded-lg text-xs font-medium transition-all",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {isConnected && (
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-1 rounded-lg text-xs font-medium transition-all relative cursor-pointer",
              drawerOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Bell className="h-4 w-4" />
            Alerts
            {unread > 0 && (
              <span className="absolute top-0 right-1/4 h-3.5 w-3.5 rounded-full gradient-brand text-[9px] font-bold text-white flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Shared Notification Drawer */}
      <NotificationDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          // Refresh badge count after closing
          if (address) {
            fetch(`/api/notifications?walletAddress=${address}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.success) {
                  setUnread(
                    (d.data.notifications ?? []).filter((n: any) => !n.read).length
                  );
                }
              })
              .catch(() => {});
          }
        }}
        address={address}
      />
    </header>
  );
}
