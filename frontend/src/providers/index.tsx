/**
 * Root providers -- wraps the whole app.
 *
 * Provider stack (outer -> inner):
 *   ThemeProvider  -> light/dark/system theme
 *   Web3Provider   -> wagmi + react-query + RainbowKit
 *   WalletProvider -> unified wallet context (EOA, clients)
 */

import { type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { Web3Provider } from "./Web3Provider";
import { WalletProvider } from "./WalletContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Web3Provider>
          <WalletProvider>{children}</WalletProvider>
        </Web3Provider>
      </AuthProvider>
    </ThemeProvider>
  );
}
