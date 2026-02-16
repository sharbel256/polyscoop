/**
 * Token approval checking and transaction building for Polymarket trading.
 * Uses viem for on-chain reads and ABI encoding.
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  erc20Abi,
  type PublicClient,
} from "viem";
import { polygon } from "viem/chains";
import type {
  OperationType,
  SafeTransaction,
} from "@polymarket/builder-relayer-client";
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
} from "@/constants/tokens";

const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

const APPROVAL_THRESHOLD = 1_000_000_000_000n; // 1M USDC.e

const erc1155Abi = [
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Spenders that need USDC.e (ERC-20) approval. */
const USDC_SPENDERS = [
  { address: CTF_CONTRACT_ADDRESS, name: "CTF Contract" },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: "Neg Risk Adapter" },
  { address: CTF_EXCHANGE_ADDRESS, name: "CTF Exchange" },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: "Neg Risk CTF Exchange" },
] as const;

/** Operators that need outcome token (ERC-1155) approval. */
const OUTCOME_TOKEN_OPERATORS = [
  { address: CTF_EXCHANGE_ADDRESS, name: "CTF Exchange" },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: "Neg Risk Exchange" },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: "Neg Risk Adapter" },
] as const;

const rpcUrl =
  import.meta.env.VITE_POLYGON_RPC_URL || "https://polygon-rpc.com";

const defaultPublicClient = createPublicClient({
  chain: polygon,
  transport: http(rpcUrl),
});

async function checkUsdcApproval(
  safeAddress: string,
  spender: string,
  client: PublicClient = defaultPublicClient as PublicClient
): Promise<boolean> {
  try {
    const allowance = await client.readContract({
      address: USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [safeAddress as `0x${string}`, spender as `0x${string}`],
    });
    return (allowance as bigint) >= APPROVAL_THRESHOLD;
  } catch (error) {
    console.warn(`Failed to check USDC approval for ${spender}:`, error);
    return false;
  }
}

async function checkErc1155Approval(
  safeAddress: string,
  operator: string,
  client: PublicClient = defaultPublicClient as PublicClient
): Promise<boolean> {
  try {
    const isApproved = await client.readContract({
      address: CTF_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc1155Abi,
      functionName: "isApprovedForAll",
      args: [safeAddress as `0x${string}`, operator as `0x${string}`],
    });
    return isApproved as boolean;
  } catch (error) {
    console.warn(`Failed to check ERC1155 approval for ${operator}:`, error);
    return false;
  }
}

/** Check all required token approvals and return a summary. */
export const checkAllApprovals = async (
  safeAddress: string
): Promise<{
  allApproved: boolean;
  usdcApprovals: Record<string, boolean>;
  outcomeTokenApprovals: Record<string, boolean>;
}> => {
  const usdcApprovals: Record<string, boolean> = {};
  const outcomeTokenApprovals: Record<string, boolean> = {};

  await Promise.all(
    USDC_SPENDERS.map(async ({ address, name }) => {
      usdcApprovals[name] = await checkUsdcApproval(safeAddress, address);
    })
  );

  await Promise.all(
    OUTCOME_TOKEN_OPERATORS.map(async ({ address, name }) => {
      outcomeTokenApprovals[name] = await checkErc1155Approval(
        safeAddress,
        address
      );
    })
  );

  const allApproved =
    Object.values(usdcApprovals).every((v) => v) &&
    Object.values(outcomeTokenApprovals).every((v) => v);

  return { allApproved, usdcApprovals, outcomeTokenApprovals };
};

/** Build the list of SafeTransaction objects for all required approvals. */
export const createAllApprovalTxs = (): SafeTransaction[] => {
  const OperationTypeCall = 0 as OperationType;
  const txns: SafeTransaction[] = [];

  for (const { address } of USDC_SPENDERS) {
    txns.push({
      to: USDC_E_CONTRACT_ADDRESS,
      operation: OperationTypeCall,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [address as `0x${string}`, MAX_UINT256],
      }),
      value: "0",
    });
  }

  for (const { address } of OUTCOME_TOKEN_OPERATORS) {
    txns.push({
      to: CTF_CONTRACT_ADDRESS,
      operation: OperationTypeCall,
      data: encodeFunctionData({
        abi: erc1155Abi,
        functionName: "setApprovalForAll",
        args: [address as `0x${string}`, true],
      }),
      value: "0",
    });
  }

  return txns;
};
