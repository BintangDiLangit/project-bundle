import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Define the parameters for generating and funding wallets.
interface GenerateWalletParams {
  fundingSecret: string; // Base58-encoded secret key for the funding wallet.
  amountSol: number; // Amount in SOL to fund each new wallet.
  count: number; // Number of wallets to generate.
  outputFile?: string; // File to append wallet details to (default: "wallets.json").
}

// Load environment variables from a .env file (if needed)
dotenv.config();

async function generateAndFundWallets(params: GenerateWalletParams) {
  const {
    fundingSecret,
    amountSol,
    count,
    outputFile = "wallets.json",
  } = params;

  // Connect to Solana devnet (change URL if you want Mainnet Beta)
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  // Load the funding wallet from the base58-encoded secret key.
  const fundingWallet = Keypair.fromSecretKey(bs58.decode(fundingSecret));
  console.log("Funding wallet public key:", fundingWallet.publicKey.toBase58());

  // Calculate lamports to send.
  const lamportsToSend = amountSol * LAMPORTS_PER_SOL;

  // Read existing wallet entries if the file exists.
  const filePath = outputFile;
  let walletEntries: { wallet: string; private_key: string }[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      walletEntries = JSON.parse(fileContent);
      if (!Array.isArray(walletEntries)) {
        walletEntries = [];
      }
    } catch (err) {
      console.error("Error reading existing wallet file, starting fresh:", err);
      walletEntries = [];
    }
  }

  // Loop to generate the desired number of wallets.
  for (let i = 0; i < count; i++) {
    // Generate a new wallet.
    const newWallet = Keypair.generate();
    const publicKey = newWallet.publicKey.toBase58();

    // Encode the secret key as a base58 string instead of a raw array.
    const secretKeyBase58 = bs58.encode(newWallet.secretKey);

    console.log(`Generated wallet ${i + 1}/${count}: ${publicKey}`);

    // Create a transfer transaction to fund the new wallet.
    if (lamportsToSend > 0) {
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fundingWallet.publicKey,
          toPubkey: newWallet.publicKey,
          lamports: lamportsToSend,
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
          `Funded wallet ${publicKey} with ${amountSol} SOL. Signature: ${signature}`
        );
      } catch (error) {
        console.error(`Error funding wallet ${publicKey}:`, error);
      }
    }

    // Append the new wallet details to our list.
    walletEntries.push({
      wallet: publicKey,
      private_key: secretKeyBase58,
    });
  }

  // Save (or update) the wallets JSON file.
  fs.writeFileSync(filePath, JSON.stringify(walletEntries, null, 2));
  console.log(`Wallet details appended to ${filePath}`);
}

// Param
const params: GenerateWalletParams = {
  fundingSecret: process.env.DEV_WALLET!,
  amountSol: 0, // optional
  count: 10,
};

generateAndFundWallets(params).catch(console.error);
