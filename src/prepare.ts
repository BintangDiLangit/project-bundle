import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";
import base58 from "./lib/base58";
import Jito from "./lib/jito";
import Pumpfun from "./lib/pumpfun";
import connection, { getLatestBlockhash } from "./lib/rpc";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";

const name = "Bundler";
const symbol = "BUND";

const upload = async () => {
  const file = readFileSync("logo.png");
  const form = new FormData();

  form.append("file", new Blob([file], { type: "image/png" })),
    form.append("name", name),
    form.append("symbol", symbol),
    form.append("description", "Bundler is building"),
    form.append("twitter", ""),
    form.append("telegram", ""),
    form.append("website", "https://github.com"),
    form.append("showName", "true");

  const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: form,
  });

  const { metadataUri } = (await metadataResponse.json()) as {
    metadataUri: string;
  };

  return metadataUri;
};

const main = async () => {
  const uri = await upload();

  console.log({ uri });

  const jito = new Jito();
  await jito.fetchTipAccounts();

  const founderWallet = Keypair.fromSecretKey(
    base58.decode(process.env.FOUNDER_WALLET!)
  );

  const balance = await connection.getBalance(founderWallet.publicKey);

  if (balance < 0.05e9) {
    console.error("Insufficient balance");

    return;
  }
};

main();
