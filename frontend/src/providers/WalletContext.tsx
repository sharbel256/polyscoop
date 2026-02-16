import { useMemo, type ReactNode } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { providers } from "ethers";
import type { JsonRpcSigner } from "@ethersproject/providers";
import { WalletContext, type WalletContextValue } from "./walletContextValue";

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
