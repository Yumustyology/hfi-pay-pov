"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Zap,
  Mail,
  Lock,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Mail,
    title: "Email-First Payments",
    desc: "Send ETH using just an email address. No wallet addresses to copy-paste. No mistakes.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Lock,
    title: "Smart Contract Escrow",
    desc: "Funds are locked on-chain until the recipient claims them. You can refund if they don't.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    desc: "Your email is hashed and encrypted. The blockchain only sees wallet addresses - never emails.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    desc: "Recipients get a real email the moment funds are locked. One click to claim.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

const FLOW_STEPS = [
  { label: "Connect Wallet", sub: "MetaMask or any Web3 wallet" },
  { label: "Register Email", sub: "Link your identity - once" },
  {
    label: "Type Recipient Email",
    sub: "We look up their wallet automatically",
  },
  { label: "Funds Locked On-Chain", sub: "Smart contract escrow - trustless" },
  { label: "Recipient Gets Email", sub: "Real-time Brevo notification" },
  { label: "Claim ETH", sub: "One click to release funds" },
];

const STATS = [
  { value: "~2s", label: "Transaction time on Base" },
  { value: "7 days", label: "Auto-refund window" },
  { value: "0%", label: "Platform fees" },
  { value: "Base Sepolia", label: "Live testnet" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function LandingPage() {
  const router = useRouter();
  const { address, status } = useAccount();

  useEffect(() => {
    if (status === "connected" && address) {
      router.push("/dashboard");
    }
  }, [status, address, router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Hero ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-[30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/6 blur-[100px]" />
        <div className="absolute top-[50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-600/6 blur-[100px]" />
      </div>

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 text-sm text-primary font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            Live on Base Sepolia Testnet
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Send <span className="gradient-text">crypto</span>
            <br />
            using just an email
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            HFI Pay replaces wallet addresses with email identities. Funds lock
            in a smart contract until the recipient claims them - no trust
            required.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-brand text-white font-semibold text-base shadow-lg glow-primary hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
              id="hero-get-started text-center justify-center"
            >
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass border border-white/10 text-foreground font-semibold text-base hover:bg-white/[0.07] transition-all duration-200 text-center justify-center"
              id="hero-dashboard"
            >
              Go to Dashboard
            </Link>
          </div>
        </motion.div>

        {/* Flow preview pill */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          className="mt-20 inline-flex items-center gap-2 flex-wrap justify-center"
        >
          {[
            "alice@email.com",
            "→",
            "0.05 ETH",
            "→",
            "Smart Contract",
            "→",
            "bob@email.com",
          ].map((s, i) => (
            <span
              key={i}
              className={
                s === "→"
                  ? "text-muted-foreground text-lg"
                  : s === "Smart Contract"
                    ? "px-4 py-2 rounded-full gradient-brand text-white text-sm font-bold glow-sm"
                    : s === "0.05 ETH"
                      ? "px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm font-semibold"
                      : "px-4 py-2 rounded-full glass border border-white/10 text-sm font-medium"
              }
            >
              {s}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ─── Stats Strip ──────────────────────────────────────────────── */}
      <section className="py-8 border-y border-white/[0.06] glass">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
        >
          {STATS.map(({ value, label }) => (
            <motion.div key={label} variants={item} className="space-y-1">
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for the way people actually send money
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No more sharing 42-character wallet addresses. HFI Pay makes crypto
            feel like sending a bank transfer.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <motion.div
              key={title}
              variants={item}
              className="glass glass-hover card-shine p-6 rounded-2xl border border-white/[0.06] transition-all duration-300 hover:glow-sm group"
            >
              <div
                className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground">
              Six steps from signup to claim.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-0"
          >
            {FLOW_STEPS.map(({ label, sub }, i) => (
              <motion.div key={label} variants={item} className="flex gap-4">
                {/* Connector */}
                <div className="flex flex-col items-center gap-0">
                  <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold shrink-0 glow-sm">
                    {i + 1}
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="step-connector my-1" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-8">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto gradient-border p-px rounded-2xl glow-primary"
        >
          <div className="bg-card rounded-2xl p-10 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to try it?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Connect your wallet, register your email, and send your first
              escrow payment in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl gradient-brand text-white font-semibold hover:opacity-90 transition-all hover:scale-[1.02]"
                id="cta-register"
              >
                Create Account
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/send"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass border border-white/10 text-foreground font-semibold hover:bg-white/[0.07] transition-all"
                id="cta-send"
              >
                Send Payment
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-brand flex items-center justify-center">
              <span className="text-white font-black text-xs">Ħ</span>
            </div>
            <span>HFI Pay · Proof of Value</span>
          </div>
          <p>Built on Base Sepolia · Powered by HFI Protocol</p>
        </div>
      </footer>
    </div>
  );
}
