"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  CheckCheck,
  X,
  Loader2,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DrawerNotif {
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

function getAccent(title: string) {
  if (title.includes("Claim") || title.includes("✅"))
    return "text-emerald-400 bg-emerald-400/10";
  if (title.includes("Refund") || title.includes("↩️"))
    return "text-amber-400 bg-amber-400/10";
  return "text-primary bg-primary/10";
}

export interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  address?: string;
}

export default function NotificationDrawer({
  open,
  onClose,
  address,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [notifs, setNotifs] = useState<DrawerNotif[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!open || !address) return;
    setLoading(true);
    fetch(`/api/notifications?walletAddress=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setNotifs(d.data.notifications ?? []);
      })
      .finally(() => setLoading(false));
  }, [open, address]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!unreadCount) return;
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
    toast.success("All marked as read");
  };

  const markOneRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  const preview = notifs.slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="notif-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col
              bg-[rgba(8,8,20,0.92)] backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center glow-sm">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">
                    Notifications
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    {markingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3 w-3" />
                    )}
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 px-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : preview.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                  <BellOff className="h-10 w-10 stroke-1" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {preview.map((n) => {
                    const Icon = getIcon(n.title);
                    const accent = getAccent(n.title);
                    return (
                      <motion.div
                        key={n._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => !n.read && markOneRead(n._id)}
                        className={`relative p-3.5 rounded-xl border transition-all duration-200 ${
                          n.read
                            ? "border-white/[0.05] opacity-60"
                            : "border-primary/20 bg-primary/[0.04] hover:border-primary/35 cursor-pointer"
                        }`}
                      >
                        {!n.read && (
                          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
                        )}
                        <div className="flex gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-snug mb-0.5 truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDate(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer – View All */}
            <div className="px-4 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  onClose();
                  router.push("/notifications");
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                  bg-white/[0.04] border border-white/[0.08] text-muted-foreground
                  hover:text-foreground hover:bg-white/[0.07] transition-all"
              >
                <Bell className="h-4 w-4" />
                View all notifications
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
