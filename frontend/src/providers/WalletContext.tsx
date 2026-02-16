import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { type PublicClient, type WalletClient } from "viem";
import { providers } from "ethers";
import type { JsonRpcSigner } from "@ethersproject/providers";

interface WalletContextValue {
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

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address: eoaAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const ethersSigner = useMemo<JsonRpcSigner | undefined>(() => {
    if (!walletClient) return undefined;
    try {
      const { chain, transport } = walletClient;
      const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      const provider = new providers.Web3Provider(transport, network);
      return provider.getSigner(walletClient.account.address);
    } catch {
      return undefined;
    }
  }, [walletClient]);

  const value = useMemo<WalletContextValue>(
    () => ({
      eoaAddress,
      isConnected,
      walletClient: walletClient ?? undefined,
      publicClient: publicClient ?? undefined,
      ethersSigner,
    }),
    [eoaAddress, isConnected, walletClient, publicClient, ethersSigner],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
