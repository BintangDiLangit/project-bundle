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

export async function transferSolToBundle(params: TransferSolBundle) {
  const { amountSol } = params;
  const config = getConfig();
  console.log(config);

  const bundleWallets = getBundleWallets();

  if (!config.PK_FOUNDER) {
    console.error("Founder private key not found in config.json");
    return;
  }

  if (bundleWallets.length === 0) {
    console.error("No bundle wallets found in wallets.json");
    return;
  }

  const balance = (await checkBalance({ privateKey: config.PK_FOUNDER })) ?? 0;

  if (balance < amountSol * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance");
    console.error(`Available balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  const fundingWallet = Keypair.fromSecretKey(base58.decode(config.PK_FOUNDER));

  const solPerWallet = amountSol / bundleWallets.length;
  console.log("Sol per wallet : " + solPerWallet);
  const lamportsPerWallet = solPerWallet * LAMPORTS_PER_SOL;
  console.log("Lamports per wallet : " + lamportsPerWallet);

  if (lamportsPerWallet > 0) {
    for (const wallet of bundleWallets) {
      // console.log(wallet.public_key);

      const recipientPubkey = new PublicKey(wallet.public_key);
      // console.log(recipientPubkey);

      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fundingWallet.publicKey,
          toPubkey: recipientPubkey,
          lamports: lamportsPerWallet,
        })
      );

      // Set transaction properties.
      transaction.feePayer = fundingWallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      // Send the transaction using the funding wallet.
      try {
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [fundingWallet]
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
  amountSol: 0.01, // Example amount to be distributed
};

transferSolToBundle(params);
