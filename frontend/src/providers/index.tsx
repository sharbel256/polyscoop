/**
 * Root providers – wraps the whole app.
 *
 * Provider stack (outer → inner):
 *   Web3Provider  → wagmi + react-query + RainbowKit
 *   WalletProvider → unified wallet context (EOA, clients)
 */

import { type ReactNode } from "react";
import { Web3Provider } from "./Web3Provider";
import { WalletProvider } from "./WalletContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <WalletProvider>{children}</WalletProvider>
    </Web3Provider>
  );
}
