import { Keypair } from "@solana/web3.js";
import { createHash } from "node:crypto";
import base58 from "../lib/base58";

const root = Keypair.fromSecretKey(
  Buffer.from(
    "393e71ad56f1950da6093d489170cd39cca20c5a5d4e4dfdb8ca55c91f02061ce89200e2edd65bfa1d03bcb398b4ceb148a8796057a256512ab4a634789fa982",
    "hex"
  )
);

console.log({
  root: root.publicKey.toBase58(), // GeriJSxxGacWCHiHhiKftQtFZzsSG97mKqWLtbVRLYhX
});

const seed1 = createHash("sha256")
  .update(root.secretKey)
  .update("iterasi1")
  .digest();
const seed2 = createHash("sha256")
  .update(root.secretKey)
  .update("iterasi2")
  .digest();
const seed3 = createHash("sha256")
  .update(root.secretKey)
  .update("iterasi3")
  .digest();

const rebuy1 = Keypair.fromSeed(seed1);
const rebuy2 = Keypair.fromSeed(seed2);
const rebuy3 = Keypair.fromSeed(seed3);

console.log({
  seed1: seed1.toString("hex"), // b6c9f31e4fd55c1551f333c741772d677ad0ac7f9116e1b191a753678f56a38d
  rebuy1: rebuy1.publicKey.toBase58(), // 9NcSSmjj7urs1zMxXMF8EJxpgn9WXXZzacgtLGheFXwT
  seed2: seed2.toString("hex"), // 24e937e9f2af7c4cd31ffcfc334595503fbdaaf7be0f950539b63beb72aed266
  rebuy2: rebuy2.publicKey.toBase58(), // GXu2eSXwTa7eqqMmGti12GYDPzLoX95mNpU56yFT2jH6
  seed3: seed3.toString("hex"), // 604bd778459d192896641e092cc1c9d7f51857b5fec249f37ee266f57e1a95e3
  rebuy3: rebuy3.publicKey.toBase58(), // 44xUD6gBsbzZTQUP5aoP1SfWgFH9pEEfgcYeBLFQFKBA
});
