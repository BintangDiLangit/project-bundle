import {
  sendAndConfirmTransaction,
  SystemProgram,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import base58 from "bs58";
import connection from "../lib/rpc";
import { checkBalance } from "./check_balance";
import { getConfig } from "./config";
import { getBundleWallets } from "./get_bundle_wallet";

export async function transferBackToFounder() {
  const config = getConfig();
  if (!config.PK_FOUNDER) {
    console.error("Founder private key not found in config.json");
    return;
  }

  const founderPublicKey = Keypair.fromSecretKey(
    base58.decode(config.PK_FOUNDER)
  ).publicKey;
  const bundleWallets = getBundleWallets();

  if (bundleWallets.length === 0) {
    console.error("No bundle wallets found in wallets.json");
    return;
  }

  for (const wallet of bundleWallets) {
    try {
      const balance =
        (await checkBalance({ privateKey: wallet.private_key })) ?? 0;

      if (balance > 0) {
        const bundleWalletKeypair = Keypair.fromSecretKey(
          base58.decode(wallet.private_key)
        );

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: bundleWalletKeypair.publicKey,
            toPubkey: founderPublicKey,
            lamports: balance - 5000,
          })
        );

        transaction.feePayer = bundleWalletKeypair.publicKey;
        transaction.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [bundleWalletKeypair]
        );
        console.log(
          `Transferred ${balance / 1_000_000_000} SOL from ${
            wallet.public_key
          } to founder. Signature: ${signature}`
        );
      } else {
        console.log(`Skipping wallet ${wallet.public_key}, no balance.`);
      }
    } catch (error) {
      console.error(
        `Error transferring from wallet ${wallet.public_key}:`,
        error
      );
    }
  }
}

// Example execution
if (require.main === module) {
  transferBackToFounder();
}
