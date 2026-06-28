# 🚀 HFI Pay PoV Quick Start & Demo Manual

This document details the configuration steps, testing methods, and demo flow for verifying the HFI Pay Proof of Vision (PoV).

---

## 1. Setup & Starting the App

First, make sure your dependencies are installed, environment variables are set, and your Next.js application is running:

```powershell
# Install dependencies
pnpm install

# Start the dev server locally
pnpm dev
```

Ensure your `.env.local` contains:
- `MONGODB_URI`: Your MongoDB connection string.
- `BREVO_API_KEY`: Your Brevo transactional key (if using real emails, otherwise fallbacks to console logging).
- `BREVO_SENDER_EMAIL` & `BREVO_SENDER_NAME`.

---

## 2. Seeding the Database

We have initialized a seed route that prepares the environment with **5 Demo Users**, **3 Relays** (demonstrating multi-relay architecture where only `relay-hfi-01` is ONLINE), and sample transactions:

```powershell
# Run this inside a terminal to seed:
Invoke-RestMethod -Uri "http://localhost:3000/api/seed" -Method Post
```

### Seeded Demo Accounts (for recipient testing):
* **Aisha Mohammed**: `aisha@demo.hfipay.dev` (Wallet: `0x84a...`, Relay: `relay-hfi-01`)
* **John Chen**: `john@demo.hfipay.dev` (Wallet: `0x9ba...`, Relay: `relay-west-africa` [Offline])
* **Fatima Al-Rashid**: `fatima@demo.hfipay.dev` (Wallet: `0xcc3...`, Relay: `relay-europe` [Offline])
* **Marcus Johnson**: `marcus@demo.hfipay.dev` (Wallet: `0x7d1...`, Relay: `relay-hfi-01`)
* **Priya Patel**: `priya@demo.hfipay.dev` (Wallet: `0x3e8...`, Relay: `relay-hfi-01`)

---

## 3. Walking the Happy Path Demo

Follow this flow to demonstrate the core value proposition of HFI Pay:

### Step 1: Connect Wallet & Register
1. Open your browser to `http://localhost:3000`.
2. Connect your MetaMask wallet (configured to **Base Sepolia** network).
3. If this wallet has no account, you will be redirected to `/register`.
4. Enter a Display Name and Email (e.g. `your-email@example.com`).
5. Click **Send Verification Code**.
   - *If Brevo is not configured*: Look at your terminal console running Next.js. You will see a debug block containing the **6-digit OTP**. Copy it.
6. Enter the 6-digit OTP to verify and register. You will automatically redirect to the `/dashboard`.

### Step 2: Recipient Identifier Lookup
1. In the **Quick Send** card on the dashboard, type in `aisha@demo.hfipay.dev`.
2. HFI Pay will query the local relay resolver:
   - It verifies that Aisha is a registered user.
   - It resolves the recipient's destination wallet.
   - It displays resolution information showing **Resolved via relay-hfi-01**.
3. Click **Continue** to proceed to the Checkout/Send page.

### Step 3: Escrow deposit (On-chain MetaMask Sign)
1. Enter an amount of ETH (e.g., `0.001`).
2. Click **Lock in Escrow**.
3. MetaMask will prompt to sign and submit a transaction to the `HFI Escrow` contract on **Base Sepolia**.
4. Once confirmed on-chain:
   - Next.js logs the payment intent inside MongoDB.
   - It triggers a notification in both users' inboxes.
   - It sends an email (via Brevo if configured) containing the claim URL.

### Step 4: Claiming Funds
1. Copy the transaction claim link from the confirmation (or retrieve it via database history).
2. Open the claim link: `/claim/[intentId]` (or by its unique transaction reference).
3. Connect the recipient wallet (`0x84a5b...` if testing with Aisha's seeded wallet, or sign in to another browser with the recipient's account).
4. Click **Claim** to call `claimPayment()` on-chain and release the locked ETH directly to the recipient wallet.
