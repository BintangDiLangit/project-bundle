import {
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import rpc, { getLatestBlockhash } from "./rpc.ts";

export default class Lookup {
  public static async initialize(
    payer: Keypair,
    authority: Keypair,
    addresses: PublicKey[]
  ) {
    const unique = new Set<string>();

    addresses.forEach((address) => unique.add(address.toBase58()));
    addresses = Array.from(unique).map((address) => new PublicKey(address));

    if (addresses.length > 255) {
      throw new Error("Too many addresses");
    }

    let latestBlockhash = await getLatestBlockhash();
    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 5000,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1_000_000,
      }),
    ];

    const slot = await rpc.getSlot();
    const [ix, lookupTable] = AddressLookupTableProgram.createLookupTable({
      payer: payer.publicKey,
      authority: authority.publicKey,
      recentSlot: slot,
    });

    console.log({ lookupTable });

    instructions.push(ix);
    instructions.push(
      AddressLookupTableProgram.extendLookupTable({
        lookupTable,
        authority: authority.publicKey,
        payer: payer.publicKey,
        addresses: addresses.slice(0, 20),
      })
    );

    const transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
      }).compileToV0Message()
    );

    transaction.sign([payer]);

    const signature = await rpc.sendTransaction(transaction, {
      skipPreflight: true,
    });

    console.log({ signature });

    await rpc.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight + 120,
    });

    const remaining = addresses.slice(20);
    const txs = [];

    latestBlockhash = await rpc.getLatestBlockhash();

    for (let i = 0; i < remaining.length; i += 20) {
      const chunks = remaining.slice(i, i + 20);

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: payer.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitLimit({
              units: 5000,
            }),
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 1_000_000,
            }),
            AddressLookupTableProgram.extendLookupTable({
              lookupTable,
              authority: authority.publicKey,
              payer: payer.publicKey,
              addresses: chunks,
            }),
          ],
        }).compileToV0Message()
      );

      tx.sign([payer]);
      txs.push(tx);
    }

    await Promise.all(
      txs.map(async (tx) => {
        const sign = await rpc.sendTransaction(tx, {
          skipPreflight: true,
        });

        console.log({ signature: sign });

        await rpc.confirmTransaction({
          signature: sign,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight + 120,
        });
      })
    );

    const addressLookupTable = await rpc
      .getAddressLookupTable(lookupTable)
      .then((response) => response.value!);

    return [addressLookupTable, lookupTable, slot] as const;
  }
}
