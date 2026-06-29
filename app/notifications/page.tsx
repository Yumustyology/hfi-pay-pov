"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Circle,
  Info,
  AlertCircle,
  Loader2,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function getIcon(title: string) {
  if (title.includes("Claim") || title.includes("✅")) return CheckCheck;
  if (title.includes("Incoming") || title.includes("💰")) return Bell;
  if (title.includes("Refund") || title.includes("↩️")) return AlertCircle;
  return Info;
}

function getAccentClass(title: string) {
  if (title.includes("Claim") || title.includes("✅"))
    return "text-emerald-400 bg-emerald-400/10";
  if (title.includes("Refund") || title.includes("↩️"))
    return "text-amber-400 bg-amber-400/10";
  return "text-primary bg-primary/10";
}

export default function NotificationsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/notifications?walletAddress=${address}`);
        const data = await res.json();
        if (data.success) setNotifications(data.data.notifications ?? []);
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isConnected, address, router]);

  const unread = notifications.filter((n) => !n.read);

  const markAllRead = async () => {
    if (unread.length === 0) return;
    try {
      setMarkingAll(true);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="animate-pulse">Loading notifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-sm">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unread.length > 0
                  ? `${unread.length} unread`
                  : "All caught up"}
              </p>
            </div>
          </div>

          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all disabled:opacity-50"
              id="mark-all-read"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {unread.length > 0 && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            <Circle className="h-2 w-2 fill-primary" />
            {unread.length} notification{unread.length > 1 ? "s" : ""} waiting
            for your attention
          </div>
        )}
      </motion.div>

      {notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl border border-white/[0.06] p-16 text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-5">
            <BellOff className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
          <p className="text-muted-foreground text-sm">
            You're all caught up! Payment updates and alerts will appear here.
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {notifications.map((notif, i) => {
          const Icon = getIcon(notif.title);
          const accent = getAccentClass(notif.title);
          return (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              onClick={() => !notif.read && markOneRead(notif._id)}
              className={`relative mb-3 p-5 rounded-2xl border transition-all duration-200 ${
                notif.read
                  ? "glass border-white/[0.05] opacity-70"
                  : "bg-card border-primary/20 hover:border-primary/40 hover:bg-white/[0.03] cursor-pointer"
              }`}
              id={`notification-${notif._id}`}
            >
              {!notif.read && (
                <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-primary pulse-dot" />
              )}

              <div className="flex gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold leading-snug">
                      {notif.title}
                    </h4>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>
                  {!notif.read && (
                    <p className="text-[11px] text-primary mt-2">
                      Click to mark as read
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
