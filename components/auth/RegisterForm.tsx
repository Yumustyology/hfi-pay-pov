"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { shortenWallet } from "@/lib/utils";

const registerSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: (user: unknown) => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormValues) => {
    if (!isConnected || !address) {
      setApiError("Please connect your wallet first");
      return;
    }
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.displayName,
          email: data.email,
          walletAddress: address,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setApiError(json.message || json.error || "Registration failed");
        return;
      }
      setSuccess(true);
      toast.success("Account created! Welcome to HFI Pay.");
      onSuccess?.(json.data);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl gradient-brand mx-auto flex items-center justify-center glow-sm">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">
            Connect your wallet first
          </h3>
          <p className="text-muted-foreground text-sm">
            Use the Connect button in the top navigation to get started.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-1">You're registered!</h3>
          <p className="text-muted-foreground text-sm">
            Your email is now linked to your wallet via HFI Pay.
            <br />
            Anyone can send you ETH using just your email address.
          </p>
        </div>
        <div className="flex items-center gap-2 justify-center text-xs text-emerald-400">
          <Shield className="h-3.5 w-3.5" />
          Email encrypted · Identity hashed · Wallet registered
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      id="register-form"
    >
      {/* Wallet (read-only) */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Connected Wallet
        </label>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shrink-0">
            <Wallet className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-mono text-muted-foreground truncate">
            {address}
          </span>
          <span className="ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">
            Connected
          </span>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block">
          Display Name
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            {...register("displayName")}
            placeholder="e.g. John Doe"
            id="register-name"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
        <AnimatePresence>
          {errors.displayName && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-xs flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {errors.displayName.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            id="register-email"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
        <AnimatePresence>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-xs flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {errors.email.message}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Your email is encrypted and hashed - never stored in plaintext.
        </p>
      </div>

      {/* API Error */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-destructive/8 border border-destructive/20"
          >
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{apiError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isLoading}
        id="register-submit"
        className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 glow-sm mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Account…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Create HFI Pay Account
          </>
        )}
      </button>
    </form>
  );
}
