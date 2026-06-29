"use client";

import { ExternalLink, Coins, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TestingGuide() {
  const steps = [
    {
      title: "Get Base Sepolia ETH",
      desc: "Use the faucet link above to get free testnet ETH to cover transaction fees.",
    },
    {
      title: "Link Email Identity",
      desc: "Link your email inside the 'HFI Registry' card to make your email address payable.",
    },
    {
      title: "Send to Any Email",
      desc: "Go to the Send page, input any recipient email and amount. The funds will be securely held in escrow.",
    },
    {
      title: "Claim via brevo email",
      desc: "The recipient gets an email with a unique CTA. They log in with their wallet, verify OTP, and claim their ETH instantly.",
    },
  ];

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Testing Guide</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Follow these quick steps to test decentralized email-based payments on Base Sepolia.
        </p>
      </div>

      {/* Faucet Link Button */}
      <a
        href="https://faucet.zalalena.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all overflow-hidden"
      >
        {/* Glow behind */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Base Sepolia Faucet
            </p>
            <p className="text-xs text-muted-foreground">Get free testnet ETH</p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors relative z-10" />
      </a>

      {/* Guide Steps */}
      <div className="flex-1 flex flex-col gap-3.5">
        {steps.map((s, idx) => (
          <div key={idx} className="flex gap-3 items-start group">
            <div className="flex flex-col items-center shrink-0 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
                {idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-[1px] h-10 bg-white/5 group-hover:bg-primary/20 transition-colors mt-1.5" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground group-hover:text-primary-foreground transition-colors">
                {s.title}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
