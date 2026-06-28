# HFI Pay (Proof of Vision)

HFI Pay is an identity-first, non-custodial payment protocol that enables users to send and receive cryptocurrency (ETH) using email addresses instead of public wallet addresses. 

This repository implements the **Proof of Vision (PoV)** demonstration, showcasing identity anchoring via decentralized relay concepts and secure, time-locked on-chain escrow contract settlement on the **Base Sepolia** Layer 2 network.

---

## 🚀 Key Features

* **Identifier-Based Routing (Relay Resolution)**: Resolve recipient destinations by querying a simulated multi-relay registration registry (`POST /api/relay/resolve`) using their email address.
* **Non-Custodial Escrow Settlement**: Funds are locked inside the `HfiPayEscrow` smart contract on Base Sepolia. The recipient claims the funds directly via an on-chain interaction.
* **Atomic Passwordless OTP Registration**: Users register their wallet address to their email identity using a one-time passcode (OTP) delivered securely via Brevo.
* **Inbox Notifications**: Polls `/api/notifications` dynamically to list incoming payments, Sent confirmations, successful Claims, and Refund actions.
* **Developer Debug Panel**: Includes a floating visual protocol debugger inside the UI to monitor real-time relay routing queries, MetaMask signatures, and Base block confirmations.

---

## 🛠️ Technology Stack

* **Frontend Framework**: Next.js (App Router, Turbopack)
* **Web3 Integration**: Wagmi, Viem, RainbowKit
* **Smart Contracts**: Solidity (Escrow with locking and claim/refund mechanics)
* **Database**: MongoDB (Mongoose schemas for identities, history, and notifications)
* **Transactional Email**: Brevo API integration

---

## ⚡ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd hifi-pov

# Install dependencies
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hifi-pay-pov

# Brevo Transactional Email Config
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@hfipay.demo
BREVO_SENDER_NAME="HFI Pay"

# Next Public URL (used for claim link generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Running Locally

```bash
# Start Next.js development server
pnpm dev
```

---

## 🧪 Seeding & Test Flow

A seeded mock dataset is provided to quickly populate the UI with relays, notifications, and transactions for demonstration.

### Step 1: Seed the Database
Ensure MongoDB is running locally (or via Atlas URI), and execute the seed request:
```bash
# Command line POST request
curl -X POST http://localhost:3000/api/seed
```
This inserts **3 Relays** (with only `relay-hfi-01` ONLINE), **5 registered users**, and transaction activity.

### Step 2: MetaMask Network Configuration
Configure MetaMask manually to connect with **Base Sepolia**:
* **Network Name**: `Base Sepolia`
* **RPC URL**: `https://sepolia.base.org` (or alternative `https://rpc.ankr.com/base_sepolia`)
* **Chain ID**: `84532`
* **Currency Symbol**: `ETH`
* **Block Explorer**: `https://sepolia.basescan.org`

Use the official **[Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)** or **[Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)** to request free testnet ETH.

---

## 📂 Project Architecture

```
src/
├── app/                  # Next.js App Router Page View Layers & API Routes
│   ├── api/
│   │   ├── auth/         # request-otp, verify-otp
│   │   ├── intents/      # create, claim, refund, history
│   │   ├── relay/        # resolve, status
│   │   └── seed/         # idempotent demo database seeder
│   ├── dashboard/        # Dashboard view layer
│   ├── register/         # OTP verification onboarding flow
│   └── claim/            # Transaction claim route handler
├── components/           # General visual React widgets & UI components
├── features/             # Feature domains (Encapsulating domain logic)
│   ├── relay/            # Types, constants, and resolver services
│   └── send/             # Recipient lookup card component
├── contracts/            # Smart contract ABIs and deployed addresses
├── lib/
│   ├── services/         # Business logic layer (user, intent, notifications)
│   ├── email/            # Brevo transaction dispatch integration
│   ├── mongodb.ts        # Database connection cache handler
│   └── protocol-log.tsx  # Global dev log state provider
└── models/               # MongoDB Mongoose collection definitions
```

---

## 📃 License

Distributed under the MIT License.
