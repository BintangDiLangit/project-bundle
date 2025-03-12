import express from "express";
import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";
import base58 from "../lib/base58";
import Jito from "../lib/jito";
import Pumpfun from "../lib/pumpfun";
import connection, { getLatestBlockhash } from "../lib/rpc";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";

// Constants for the token
const TOKEN_NAME = "BUNDLE";
const TOKEN_SYMBOL = "BUND";
const LAMPORTS_PER_SOL = 1e9;

// Interface for the input configuration
interface RebuyConfig {
  initial_capital: number; // in SOL
  rebuy_percentage: number;
  wallet_count: number; // number of buyer wallets to generate
}

class TokenLauncher {
  private config: RebuyConfig;
  private jito: Jito;
  private pumpfun: Pumpfun;
  private curve: any; // depends on pumpfun.initialCurve implementation
  private devWallet: Keypair;
  private mint: Keypair;
  private buyerWallets: Array<{ wallet: Keypair; buying: number }> = [];
  private transactions: VersionedTransaction[] = [];

  constructor(config: RebuyConfig) {
    this.config = config;
    this.jito = new Jito();
    this.pumpfun = new Pumpfun();
    this.mint = Keypair.generate();
    // DEV_WALLET (secret key in base58)
    this.devWallet = Keypair.fromSecretKey(
      base58.decode(process.env.DEV_WALLET!)
    );
  }

  // Upload token metadata to IPFS
  private async uploadMetadata(): Promise<string> {
    const file = readFileSync("logo.png");
    const form = new FormData();
    form.append("file", new Blob([file], { type: "image/png" }));
    form.append("name", TOKEN_NAME);
    form.append("symbol", TOKEN_SYMBOL);
    form.append("description", "Bundler is building");
    form.append("twitter", "");
    form.append("telegram", "");
    form.append("website", "https://github.com");
    form.append("showName", "true");

    const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: form,
    });
    const { metadataUri } = (await metadataResponse.json()) as {
      metadataUri: string;
    };
    return metadataUri;
  }

  // Check if devWallet has enough balance
  private async checkDevWalletBalance(): Promise<boolean> {
    const balance = await connection.getBalance(this.devWallet.publicKey);
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
      console.error("Insufficient balance on devWallet");
      return false;
    }
    return true;
  }

  // Generate buyer wallets based on the number provided and set each one's buying lamports
  private generateBuyerWallets(perWalletBuyingLamports: number): void {
    this.buyerWallets = Array.from({ length: this.config.wallet_count }).map(
      () => {
        const wallet = Keypair.generate();
        return { wallet, buying: perWalletBuyingLamports };
      }
    );
  }

  // Build the first transaction: token creation, associated account, and initial buy by devWallet
  private async buildFirstTransaction(
    uri: string,
    perWalletBuyingLamports: number
  ): Promise<VersionedTransaction> {
    const latestBlockhash = await getLatestBlockhash();
    const associatedTokenAccountDevWallet = getAssociatedTokenAddressSync(
      this.mint.publicKey,
      this.devWallet.publicKey
    );

    const instructions = [
      // Set compute unit price
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      // Transfer a small amount to a random tip account
      SystemProgram.transfer({
        fromPubkey: this.devWallet.publicKey,
        toPubkey: this.jito.getRandomTipAccount(),
        lamports: 5000,
      }),
      // Create token using pumpfun.create
      await this.pumpfun.create(
        this.devWallet.publicKey,
        this.mint.publicKey,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        uri
      ),
      // Create associated token account for devWallet
      createAssociatedTokenAccountIdempotentInstruction(
        this.devWallet.publicKey,
        associatedTokenAccountDevWallet,
        this.devWallet.publicKey,
        this.mint.publicKey
      ),
      // Buy token using devWallet
      await this.pumpfun.buy(
        this.devWallet.publicKey,
        this.mint.publicKey,
        this.pumpfun.calculateTokenByLamports(
          this.curve,
          new BN(perWalletBuyingLamports),
          0
        ),
        {
          curve: this.curve,
          maxSolCost: new BN(perWalletBuyingLamports * 1.02),
        }
      ),
    ];

    const message = new TransactionMessage({
      payerKey: this.devWallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([this.devWallet, this.mint]);
    return tx;
  }

  // Build buyer transactions for token purchase using pumpfun.calculateBundleBuySequence
  private async buildBuyerTransactions(
    perWalletBuyingLamports: number
  ): Promise<void> {
    const latestBlockhash = await getLatestBlockhash();
    const sequences = await this.pumpfun.calculateBundleBuySequence(
      this.mint.publicKey,
      this.buyerWallets.map(({ wallet, buying }) => ({
        address: wallet.publicKey,
        lamports: buying,
      })),
      this.curve
    );

    const batch = 4; // Process 4 wallets per transaction
    for (let i = 0; i < sequences.length; i += batch) {
      const chunks = sequences.slice(i, i + batch);
      const walletsInBatch = this.buyerWallets
        .filter(({ wallet }) =>
          chunks.some(({ address }) => address.equals(wallet.publicKey))
        )
        .map(({ wallet }) => wallet);

      const instructions = chunks.flatMap((sequence) => {
        const associatedToken = getAssociatedTokenAddressSync(
          this.mint.publicKey,
          sequence.address
        );
        return [
          createAssociatedTokenAccountIdempotentInstruction(
            sequence.address,
            associatedToken,
            sequence.address,
            this.mint.publicKey
          ),
          sequence.instruction,
        ];
      });

      const message = new TransactionMessage({
        payerKey: this.devWallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      tx.sign([this.devWallet, ...walletsInBatch]);
      this.transactions.push(tx);
    }
  }

  // Build a sell transaction where each buyer wallet sells its token
  private async buildSellTransaction(
    perWalletBuyingLamports: number
  ): Promise<void> {
    const sellInstructions = [];
    const sellSigners = new Set<Keypair>();

    for (const buyer of this.buyerWallets) {
      // Calculate tokens to sell for this buyer
      const tokensToSell = this.pumpfun.calculateTokenByLamports(
        this.curve,
        new BN(perWalletBuyingLamports),
        0
      );
      console.log(
        `Tokens to sell for buyer ${buyer.wallet.publicKey.toBase58()}: ${tokensToSell.toString()}`
      );

      // Skip if token amount is zero (or adjust as needed)
      if (tokensToSell.isZero()) {
        console.warn(
          `Skipping sell transaction for buyer ${buyer.wallet.publicKey.toBase58()} due to zero token amount`
        );
        continue;
      }

      const sellIx = await this.pumpfun.sell(
        buyer.wallet.publicKey,
        this.mint.publicKey,
        tokensToSell,
        { slippagePercentage: 0.02, curve: this.curve }
      );
      sellInstructions.push(sellIx);
      sellSigners.add(buyer.wallet);
    }

    const message = new TransactionMessage({
      payerKey: this.devWallet.publicKey,
      recentBlockhash: (await getLatestBlockhash()).blockhash,
      instructions: sellInstructions,
    }).compileToV0Message();

    const sellTx = new VersionedTransaction(message);
    sellTx.sign([this.devWallet, ...Array.from(sellSigners)]);
    this.transactions.push(sellTx);
  }

  // Simulate branch transfers – in production, replace with actual SOL transfer transactions
  private async simulateBranchTransfers(
    sourceWallet: Keypair,
    branchCount: number,
    level: number
  ): Promise<void> {
    for (let i = 0; i < branchCount; i++) {
      const branchWallet = Keypair.generate();
      console.log(
        `Level ${level}: Transfer from ${sourceWallet.publicKey.toBase58()} to branch wallet ${branchWallet.publicKey.toBase58()}`
      );
      // Replace this with actual transfer logic and confirmation waiting
    }
  }

  // Execute branching simulation for both Pumpfun and Raydium scenarios
  private async executeBranching(): Promise<void> {
    // For Pumpfun: 2 levels of branching
    for (const buyer of this.buyerWallets) {
      await this.simulateBranchTransfers(buyer.wallet, 3, 1);
      console.log(
        `Level 2: Simulated transfer from each branch wallet (Pumpfun)`
      );
    }

    // For Raydium: 3 levels of branching
    for (const buyer of this.buyerWallets) {
      await this.simulateBranchTransfers(buyer.wallet, 2, 1);
      console.log(
        `Level 2: Simulated transfer from each branch wallet (Raydium)`
      );
      console.log(
        `Level 3: Simulated transfer from one branch wallet (Raydium)`
      );
    }
  }

  // Main run method that executes the token launch process
  public async run(): Promise<void> {
    // Calculate amounts based on the configuration
    const totalSol = this.config.initial_capital;
    const rebuyCapitalSol = totalSol * (this.config.rebuy_percentage / 100);
    const perWalletBuyingSol = rebuyCapitalSol / this.config.wallet_count;
    const perWalletBuyingLamports = perWalletBuyingSol * LAMPORTS_PER_SOL;

    console.log(
      `Initial Capital: ${totalSol} SOL, Rebuy Capital: ${rebuyCapitalSol} SOL, Per Wallet: ${perWalletBuyingSol} SOL`
    );

    // Upload metadata and fetch tip accounts
    const uri = await this.uploadMetadata();
    console.log({ uri });
    await this.jito.fetchTipAccounts();

    // Initialize the bonding curve
    this.curve = this.pumpfun.initialCurve();

    // Check if devWallet has sufficient balance
    if (!(await this.checkDevWalletBalance())) return;

    console.log("Dev Balance Checked");

    // Generate buyer wallets
    console.log("Start Generate Buyer Wallets");
    this.generateBuyerWallets(perWalletBuyingLamports);
    console.log("Buyer Wallets Generated");

    // Clear previous transactions and build the transaction bundle
    this.transactions = [];
    console.log("Start First Transaction");
    const firstTx = await this.buildFirstTransaction(
      uri,
      perWalletBuyingLamports
    );
    console.log("Start Push First Transaction");
    this.transactions.push(firstTx);
    console.log("Start Build Buyer Transaction");
    await this.buildBuyerTransactions(perWalletBuyingLamports);
    console.log("Start Build Sell Transaction");
    await this.buildSellTransaction(perWalletBuyingLamports);

    // Simulate branch transfers
    console.log("Start executeBranching");
    await this.executeBranching();

    // simulate the first transaction
    // console.log("Start Simulation - Optional");
    // await connection
    //   .simulateTransaction(firstTx)
    //   .then(console.log)
    //   .catch(console.error);

    // Send bundle of transactions and wait for confirmation
    console.log("Start Send Bundle of Transaction");
    const bundleId = await this.jito.bundles(this.transactions);
    console.log({ bundleId });
    const confirmation = await this.jito.confirms(bundleId);
    console.log("Transaction Confirmation:", confirmation?.value);

    await this.jito.shutdown();
  }
}

// Set up the Express API
const app = express();
app.use(express.json());

app.post("/launch-token", async (req, res) => {
  try {
    const { initial_capital, rebuy_percentage, wallet_count } = req.body;
    const config: RebuyConfig = {
      initial_capital,
      rebuy_percentage,
      wallet_count,
    };
    const launcher = new TokenLauncher(config);
    await launcher.run();
    res
      .status(200)
      .json({ message: "Token launch process executed successfully" });
  } catch (error: any) {
    console.error("Error in token launch process:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
