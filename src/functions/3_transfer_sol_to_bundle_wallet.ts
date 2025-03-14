import {
  sendAndConfirmTransaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import { Keypair, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import base58 from "bs58";
import connection from "../lib/rpc";
import { getConfig } from "./config";
import { checkBalance } from "./check_balance";
import { getBundleWallets } from "./get_bundle_wallet";

interface BundleWallet {
  public_key: string;
  private_key: string;
}

interface TransferSolBundle {
  amountSol: number;
}

const MAX_RETRIES = 5; // Maximum number of retries
const BASE_DELAY_MS = 500; // Base delay for exponential backoff

async function getLatestBlockhashWithRetry(retries = 0): Promise<string> {
  try {
    return (await connection.getLatestBlockhash()).blockhash;
  } catch (error: any) {
    if (
      retries < MAX_RETRIES &&
      error.message.includes("429 Too Many Requests")
    ) {
      const delay = BASE_DELAY_MS * Math.pow(2, retries);
      console.warn(`Too many requests, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getLatestBlockhashWithRetry(retries + 1);
    } else {
      throw new Error("Failed to get recent blockhash after retries");
    }
  }
}

async function sendTransactionWithRetry(
  transaction: Transaction,
  fundingWallet: Keypair,
  retries = 0
): Promise<string> {
  try {
    return await sendAndConfirmTransaction(connection, transaction, [
      fundingWallet,
    ]);
  } catch (error: any) {
    if (
      retries < MAX_RETRIES &&
      error.message.includes("429 Too Many Requests")
    ) {
      const delay = BASE_DELAY_MS * Math.pow(2, retries);
      console.warn(`Too many requests, retrying transaction in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendTransactionWithRetry(transaction, fundingWallet, retries + 1);
    } else {
      throw new Error("Failed to send transaction after retries");
    }
  }
}

export async function transferSolToBundle(params: TransferSolBundle) {
  const { amountSol } = params;
  const config = getConfig();

  if (!config.PK_FOUNDER) {
    console.error("Founder private key not found in config.json");
    return;
  }

  const bundleWallets = getBundleWallets();
  if (bundleWallets.length === 0) {
    console.error("No bundle wallets found in wallets.json");
    return;
  }

  const { balance } = (await checkBalance({
    privateKey: config.PK_FOUNDER,
  })) || { balance: 0 };

  if (balance < amountSol * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance");
    console.error(`Available balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  const fundingWallet = Keypair.fromSecretKey(base58.decode(config.PK_FOUNDER));

  const solPerWallet = amountSol / bundleWallets.length;
  const lamportsPerWallet = solPerWallet * LAMPORTS_PER_SOL;

  if (lamportsPerWallet > 0) {
    for (const wallet of bundleWallets) {
      const recipientPubkey = new PublicKey(wallet.public_key);

      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fundingWallet.publicKey,
          toPubkey: recipientPubkey,
          lamports: lamportsPerWallet,
        })
      );

      // Retry fetching blockhash if needed
      transaction.feePayer = fundingWallet.publicKey;
      transaction.recentBlockhash = await getLatestBlockhashWithRetry();

      // Retry sending transaction if needed
      try {
        const signature = await sendTransactionWithRetry(
          transaction,
          fundingWallet
        );
        console.log(
          `Funded wallet ${recipientPubkey.toBase58()} with ${solPerWallet} SOL. Signature: ${signature}`
        );
      } catch (error) {
        console.error(
          `Error funding wallet ${recipientPubkey.toBase58()}:`,
          error
        );
      }
    }
  }
}

// Example function call
const params: TransferSolBundle = {
  amountSol: 0.01,
};

transferSolToBundle(params);
