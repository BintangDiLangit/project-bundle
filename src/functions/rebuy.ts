import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import Pumpfun from "../lib/pumpfun";
import Raydium, { MarketNotFoundInRaydium } from "../lib/raydium";
import base58 from "../lib/base58";
import { createHash } from "node:crypto";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import Lookup from "../lib/lookup";
import rpc from "../lib/rpc";
import BN from "bn.js";
import { getBundleWallets } from "./get_bundle_wallet";
import { getConfig } from "./config";

interface RebuyProps {
  publicMint: string;
}

export const rebuy = async ({ publicMint }: RebuyProps) => {
  // Mint is the contract address for the token
  const mint = new PublicKey(publicMint);
  const pumpfun = new Pumpfun();
  const raydium = new Raydium();

  const config = getConfig();
  // Use the developer wallet (origin) which should hold the tokens
  const origin = Keypair.fromSecretKey(base58.decode(config.PK_DEV));

  // Get the associated token account for origin and mint, then query its balance
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    origin.publicKey
  );
  const selling = await rpc
    .getTokenAccountBalance(associatedTokenAccount)
    .then((r) => r.value.amount);

  // Get bundle wallets (buyers)
  const bundleWallets = getBundleWallets();
  let buyers: Keypair[] = [];
  bundleWallets.forEach((bw) => {
    buyers.push(Keypair.fromSecretKey(base58.decode(bw.private_key)));
  });

  console.log("Buyers:", buyers);

  // Derive middle keypairs using a deterministic seed
  const middles = buyers.map((buyer) => {
    const seed = createHash("sha256")
      .update(mint.toBuffer())
      .update(origin.secretKey)
      .update(buyer.secretKey)
      .digest();
    return Keypair.fromSeed(seed);
  });

  // Build lookup address table addresses list
  const addresses: PublicKey[] = [
    SystemProgram.programId,
    ComputeBudgetProgram.programId,
    SYSVAR_RENT_PUBKEY,
    origin.publicKey,
    associatedTokenAccount,
    ...buyers.flatMap((buyer) => [
      buyer.publicKey,
      getAssociatedTokenAddressSync(mint, buyer.publicKey),
    ]),
    ...middles.map((m) => m.publicKey),
  ];

  let isOnPumpfun = false;

  try {
    const { completed } = await pumpfun.curve(mint);
    isOnPumpfun = !completed;

    if (completed) {
      const market = await raydium.getMarketByMint(mint);
      if (!market) {
        throw new MarketNotFoundInRaydium(
          `Market not found for mint ${mint.toString()}`
        );
      }
      const keys = await raydium.keys(market);
      addresses.push(...Object.values(keys));
      addresses.push(
        getAssociatedTokenAddressSync(market.baseMint, origin.publicKey),
        getAssociatedTokenAddressSync(market.quoteMint, origin.publicKey),
        ...buyers.flatMap((buyer) => [
          getAssociatedTokenAddressSync(market.baseMint, buyer.publicKey),
          getAssociatedTokenAddressSync(market.quoteMint, buyer.publicKey),
        ])
      );
    } else {
      addresses.push(...pumpfun.keys(mint));
    }
  } catch (e) {
    throw e;
  }

  // Initialize the address lookup table
  const [lookupAccount, lookupAddress, slot] = await Lookup.initialize(
    origin,
    origin,
    addresses
  );

  console.log({ lookupAddress: lookupAddress.toBase58(), slot });

  // Set maximum buyers per transaction to avoid oversize transactions
  const maxBuyersPerTx = 2; // Adjust this value as needed
  const latestBlockhash = await rpc.getLatestBlockhash();

  if (isOnPumpfun) {
    // Using pumpfun.sellAndReBuy method and splitting transactions
    for (let i = 0; i < buyers.length; i += maxBuyersPerTx) {
      const chunkBuyers = buyers.slice(i, i + maxBuyersPerTx);
      const chunkMiddles = middles.slice(i, i + maxBuyersPerTx);
      const rebuyAmount = new BN(Number(selling) / buyers.length);

      const curve = await pumpfun.curve(mint);
      const instructions: TransactionInstruction[] = await pumpfun.sellAndReBuy(
        curve,
        mint,
        origin.publicKey,
        new BN(selling),
        chunkBuyers.map((buyer, j) => ({
          address: buyer.publicKey,
          middle: chunkMiddles[j].publicKey,
          buying: rebuyAmount,
        }))
      );

      const message = new TransactionMessage({
        payerKey: origin.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
      }).compileToV0Message([lookupAccount]);

      const tx = new VersionedTransaction(message);

      // Debug: Check transaction size
      const serializedMessage = tx.message.serialize();
      console.log(`Transaction size: ${serializedMessage.length} bytes`);
      if (serializedMessage.length > 1232) {
        throw new Error(
          `Transaction too large (${serializedMessage.length} bytes)`
        );
      }

      tx.sign([origin, ...chunkBuyers, ...chunkMiddles]);

      const signature = await rpc.sendTransaction(tx);
      console.log({ signature });

      await rpc.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
    }
  } else {
    // Using raydium.sellAndReBuy method and splitting transactions
    const market = await raydium.getMarketByMint(mint);
    const keys = await raydium.keys(market!);
    for (let i = 0; i < buyers.length; i += maxBuyersPerTx) {
      const chunkBuyers = buyers.slice(i, i + maxBuyersPerTx);
      const chunkMiddles = middles.slice(i, i + maxBuyersPerTx);
      const rebuyAmount = Number(selling) / buyers.length;

      const instructions: TransactionInstruction[] = await raydium.sellAndReBuy(
        keys,
        origin.publicKey,
        Number(selling),
        chunkBuyers.map((buyer, j) => ({
          address: buyer.publicKey,
          middle: chunkMiddles[j].publicKey,
          buying: rebuyAmount,
        }))
      );

      const message = new TransactionMessage({
        payerKey: origin.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
      }).compileToV0Message([lookupAccount]);

      const tx = new VersionedTransaction(message);

      const serializedMessage = tx.message.serialize();
      console.log(`Transaction size: ${serializedMessage.length} bytes`);
      if (serializedMessage.length > 1232) {
        throw new Error(
          `Transaction too large (${serializedMessage.length} bytes)`
        );
      }

      tx.sign([origin, ...chunkBuyers, ...chunkMiddles]);

      const signature = await rpc.sendTransaction(tx);
      console.log({ signature });

      await rpc.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
    }
  }
};
