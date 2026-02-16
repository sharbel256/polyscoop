import { createContext } from "react";
import type { PublicClient, WalletClient } from "viem";
import type { JsonRpcSigner } from "@ethersproject/providers";

export interface WalletContextValue {
  /** The user's EOA address (browser wallet) */
  eoaAddress: `0x${string}` | undefined;
  /** Whether a wallet is connected */
  isConnected: boolean;
  /** viem WalletClient for signing */
  walletClient: WalletClient | undefined;
  /** viem PublicClient for reads */
  publicClient: PublicClient | undefined;
  /** ethers v5 signer – required by Polymarket SDKs */
  ethersSigner: JsonRpcSigner | undefined;
}

export const WalletContext = createContext<WalletContextValue | null>(null);
