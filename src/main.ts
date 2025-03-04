import { Keypair } from "@solana/web3.js";
import base58 from "./lib/base58";
import connection from "./lib/rpc";

const main = async () => {
  const wallet = Keypair.fromSecretKey(base58.decode(process.env.DEV_WALLET!));
  const balance = await connection.getBalance(wallet.publicKey);

  console.log({ balance });
};

main();
