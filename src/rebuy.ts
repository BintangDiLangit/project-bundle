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
import Pumpfun from "./lib/pumpfun";
import Raydium, { MarketNotFoundInRaydium } from "./lib/raydium";
import base58 from "./lib/base58";
import { createHash } from "node:crypto";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import Lookup from "./lib/lookup";
import rpc from "./lib/rpc";
import BN from "bn.js";

const main = async () => {
  const mint = new PublicKey(""); // contract address
  const pumpfun = new Pumpfun();
  const raydium = new Raydium();

  // origin wallet = seller
  const origin = Keypair.fromSecretKey(base58.decode(""));
  const selling = await rpc
    .getTokenAccountBalance(
      getAssociatedTokenAddressSync(mint, origin.publicKey)
    )
    .then((r) => r.value.amount);
  // if token is on pumpfun max buyers in single tx is 3
  // if token is on raydium max buyers in single tx is 2
  const buyers = [
    Keypair.fromSecretKey(base58.decode("")),
    Keypair.fromSecretKey(base58.decode("")),
    // Keypair.fromSecretKey(base58.decode('')),
  ];
  const middles = buyers.map((buyer) => {
    const seed = createHash("sha256")
      .update(mint.toBuffer())
      .update(origin.secretKey)
      .update(buyer.secretKey)
      .digest();

    return Keypair.fromSeed(seed);
  });

  // lookup address table address list
  const addresses: PublicKey[] = [
    SystemProgram.programId,
    ComputeBudgetProgram.programId,
    SYSVAR_RENT_PUBKEY,
    origin.publicKey,
    getAssociatedTokenAddressSync(mint, origin.publicKey),
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

  // register address lookup table first
  const [lookupAccount, lookupAddress, slot] = await Lookup.initialize(
    origin,
    origin,
    addresses
  );

  console.log({ lookupAddress, slot });

  let instructions: TransactionInstruction[] = [];

  if (isOnPumpfun) {
    const curve = await pumpfun.curve(mint);

    instructions = await pumpfun.sellAndReBuy(
      curve,
      mint,
      origin.publicKey,
      new BN(selling),
      buyers.map((buyer, j) => {
        const middle = middles[j];
        const rebuy = Number(selling) / buyers.length;

        return {
          address: buyer.publicKey,
          middle: middle.publicKey,
          buying: new BN(rebuy),
        };
      })
    );
  } else {
    const market = await raydium.getMarketByMint(mint);
    const keys = await raydium.keys(market!);

    instructions = await raydium.sellAndReBuy(
      keys,
      origin.publicKey,
      Number(selling),
      buyers.map((buyer, j) => {
        const middle = middles[j];
        const rebuy = Number(selling) / buyers.length;

        return {
          address: buyer.publicKey,
          middle: middle.publicKey,
          buying: rebuy,
        };
      })
    );
  }

  const latestBlockhash = await rpc.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: origin.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToV0Message([lookupAccount]);

  const tx = new VersionedTransaction(message);

  tx.sign([origin, ...buyers, ...middles]);

  const signature = await rpc.sendTransaction(tx);

  console.log({ signature });

  await rpc.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });
};

main();
