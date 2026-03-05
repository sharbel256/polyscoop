import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import { http } from "wagmi";

const rpcUrl =
  import.meta.env.VITE_POLYGON_RPC_URL || "https://rpc.ankr.com/polygon";
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo";

export const config = getDefaultConfig({
  appName: "polyscoop",
  projectId,
  chains: [polygon],
  transports: {
    [polygon.id]: http(rpcUrl),
  },
  pollingInterval: 30_000,
});
