// ABI for HfiPayEscrow.sol
// Generated to match: contracts/HfiPayEscrow.sol

export const ESCROW_ABI = [
  // ─── State Variables (public getters) ───────────────────────────────────────
  {
    name: "nextPaymentId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "CLAIM_PERIOD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "payments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "claimed", type: "bool" },
      { name: "refunded", type: "bool" },
    ],
  },

  // ─── Write Functions ─────────────────────────────────────────────────────────
  {
    name: "createPayment",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    name: "claimPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "refundPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [],
  },

  // ─── Read Functions ──────────────────────────────────────────────────────────
  {
    name: "getPayment",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "sender", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "claimed", type: "bool" },
          { name: "refunded", type: "bool" },
        ],
      },
    ],
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    name: "PaymentCreated",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PaymentClaimed",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
    ],
  },
  {
    name: "PaymentRefunded",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
    ],
  },
] as const;
