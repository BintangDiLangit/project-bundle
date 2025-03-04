import {
  PublicKey,
  VersionedTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as jito from "jito-ts";
import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";

(async () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  //   const connection = new Connection("https://api.devnet.solana.com");
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(
          "./src/keys/J1togRJwj13hx3FGDKMhXZFdLuqzfsBtd9U6R7PmXPqV.json",
          "utf-8"
        )
      )
    )
  );

  const importantTrasaction = new Transaction();
  importantTrasaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: keypair.publicKey,
      lamports: 1,
    })
  );

  importantTrasaction.feePayer = keypair.publicKey;
  importantTrasaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  importantTrasaction.sign(keypair);

  const sx = await connection.sendRawTransaction(
    importantTrasaction.serialize()
  );

  console.log(sx);

  const client = jito.searcher.searcherClient(
    "block-engine.mainnet.frankfurt.jito.wtf"
  );

  const result = await client.getTipAccounts();

  if (result.ok) {
    const tipAccount = new PublicKey(result.value[0]);
    console.log("Tip account set:", tipAccount.toBase58());

    const tipAmount = 10_000;
    importantTrasaction.add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: tipAccount,
        lamports: tipAmount,
      })
    );
    importantTrasaction.sign(keypair);

    const tx: VersionedTransaction = VersionedTransaction.deserialize(
      importantTrasaction.serialize()
    );

    const bundle = new jito.bundle.Bundle([tx], 5);

    const onSuccess = (bundleResult: BundleResult) => {
      console.log("Bundle sent successfully! " + bundleResult.bundleId);
      if (bundleResult.accepted)
        console.log("Bundle was accepted! " + bundleResult.accepted);
      if (bundleResult.rejected)
        console.log("Bundle was rejected! " + bundleResult.rejected);
      if (bundleResult.dropped)
        console.log("Bundle was dropped! " + bundleResult.dropped);
    };

    const onError = (e: Error) => {
      console.log("Cloud not send bundle! " + e);
    };

    client.onBundleResult(onSuccess, onError);
    const bundleUid = await client.sendBundle(bundle);
    console.log(bundleUid);
  } else {
    console.error("Failed to fetch tip accounts:", result.error);
  }
})();
