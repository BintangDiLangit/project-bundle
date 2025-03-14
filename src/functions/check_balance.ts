import { Keypair, PublicKey } from "@solana/web3.js";
import base58 from "../lib/base58";
import connection from "../lib/rpc";
import readline from "readline";

export const checkBalance = async ({ privateKey }: { privateKey: string }) => {
  let wallet: Keypair;

  try {
    if (privateKey.startsWith("[") && privateKey.endsWith("]")) {
      // JSON Uint8Array format (e.g., `[1,2,3,4,...]`)
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      wallet = Keypair.fromSecretKey(secretKey);
    } else {
      // Base58-encoded string
      wallet = Keypair.fromSecretKey(base58.decode(privateKey));
    }

    const balance = await connection.getBalance(wallet.publicKey);
    console.log(
      `Balance of ${wallet.publicKey.toBase58()}: ${balance} lamports`
    );
    return {
      balance: balance,
      pubkey: wallet.publicKey.toBase58(),
    };
  } catch (error) {
    console.error("Error decoding private key:", error);
    return null;
  }
};

// CLI Input Handling
async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function cliInputBalance() {
  const privateKey =
    process.argv[2] || (await askQuestion("Enter private key: "));
  await checkBalance({ privateKey });
}

if (require.main === module) {
  cliInputBalance();
}
