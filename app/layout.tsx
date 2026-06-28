import type { Metadata } from "next";
import "./globals.css";
import AppProvider from "@/providers/AppProvider";
import Navbar from "@/components/layout/Navbar";
import ProtocolDebugPanel from "@/components/ui/ProtocolDebugPanel";
import { ProtocolLogProvider } from "@/lib/protocol-log";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "HFI Pay - Send crypto using email",
  description:
    "HFI Pay lets you send ETH to anyone using their email address. No wallet addresses. No friction. Powered by decentralised identity routing and smart contract escrow.",
  keywords: ["crypto", "ethereum", "payments", "email", "web3", "escrow", "defi"],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "HFI Pay",
    description: "Send ETH to anyone using their email. Powered by HFI Protocol.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ProtocolLogProvider>
          <AppProvider>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <ProtocolDebugPanel />
            <Toaster
              position="top-right"
              richColors
              theme="dark"
              toastOptions={{
                style: {
                  background: "oklch(0.12 0.015 265)",
                  border: "1px solid oklch(0.20 0.015 265)",
                  color: "oklch(0.94 0.01 265)",
                },
              }}
            />
          </AppProvider>
        </ProtocolLogProvider>
      </body>
    </html>
  );
}

