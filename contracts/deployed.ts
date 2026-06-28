// Deployed contract addresses per network
// Update after each deployment with: forge script script/Deploy.s.sol --broadcast

export const DEPLOYED_CONTRACTS = {
  // Base Sepolia Testnet (chainId: 84532)
  84532: {
    escrow: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  // Base Mainnet (chainId: 8453) - for future use
  8453: {
    escrow: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

export type SupportedChainId = keyof typeof DEPLOYED_CONTRACTS;

export function getContractAddress(
  chainId: number,
  contract: keyof (typeof DEPLOYED_CONTRACTS)[SupportedChainId],
): `0x${string}` {
  const chain = DEPLOYED_CONTRACTS[chainId as SupportedChainId];
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain[contract];
}
