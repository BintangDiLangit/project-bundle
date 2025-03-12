import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import base58 from "../lib/base58";
import Jito from "../lib/jito";
import Pumpfun from "../lib/pumpfun";
import connection, { getLatestBlockhash } from "../lib/rpc.ts";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";
import { getUploadedMetadata } from "./metadata";
import { getConfig } from "./config";

const launch = async () => {
  try {
    const config = getConfig();
    if (!config.PK_DEV) {
      throw new Error(
        "Developer private key (PK_DEV) not found in config.json"
      );
    }

    const devWallet = Keypair.fromSecretKey(base58.decode(config.PK_DEV!));

    const balance = await connection.getBalance(devWallet.publicKey);

    if (balance < 0.05e9) {
      console.error("Insufficient balance");
      return "Insufficient balance";
    }

    // Ambil metadata terbaru
    const metadata = getUploadedMetadata();
    if (metadata.length === 0) {
      console.error("No metadata found. Please upload metadata first.");
      return "No metadata found. Please upload metadata first.";
    }

    const { name, symbol, uri } = metadata[metadata.length - 1];

    if (!uri || !name || !symbol) {
      console.error(
        "Invalid metadata. Ensure name, symbol, and URI are available."
      );
      return "Invalid metadata. Ensure name, symbol, and URI are available.";
    }

    console.log("Metadata retrieved:", { name, symbol, uri });

    // Inisialisasi Jito & Pumpfun
    const jito = new Jito();
    await jito.fetchTipAccounts();

    const pumpfun = new Pumpfun();
    const curve = pumpfun.initialCurve();
    const mint = Keypair.generate();

    const buying = 0.0001e9;
    const buyers = [
      {
        secretKey: config.PK_DEV,
        buying: buying,
      },
      // {
      //   secretKey: '',
      //   buying: 0.0001e9,
      // }
    ].map((r: { secretKey: string; buying: number }) => {
      return {
        wallet: Keypair.fromSecretKey(base58.decode(r.secretKey)),
        buying: r.buying,
      };
    });

    const associatedTokenAccountDevWallet = getAssociatedTokenAddressSync(
      mint.publicKey,
      devWallet.publicKey
    );
    const latestBlockhash = await getLatestBlockhash();

    const firstTx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: devWallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
          SystemProgram.transfer({
            fromPubkey: devWallet.publicKey,
            toPubkey: jito.getRandomTipAccount(),
            lamports: 5000,
          }),
          await pumpfun.create(
            devWallet.publicKey,
            mint.publicKey,
            "TestName",
            "TST",
            "https://example.com"
          ),
          // await pumpfun.create(
          //   devWallet.publicKey,
          //   mint.publicKey,
          //   name,
          //   symbol,
          //   uri
          // ),
          createAssociatedTokenAccountIdempotentInstruction(
            devWallet.publicKey,
            associatedTokenAccountDevWallet,
            devWallet.publicKey,
            mint.publicKey
          ),
          await pumpfun.buy(
            devWallet.publicKey,
            mint.publicKey,
            pumpfun.calculateTokenByLamports(curve, new BN(buying), 0),
            { curve, maxSolCost: new BN(buying * 1.02) }
          ),
        ],
      }).compileToV0Message()
    );

    firstTx.sign([devWallet, mint]);
    const simulation = await connection.simulateTransaction(firstTx);
    console.log("Simulation Result:", JSON.stringify(simulation, null, 2));

    // const sequences = await pumpfun.calculateBundleBuySequence(
    //   mint.publicKey,
    //   buyers.map(({ wallet, buying }) => ({
    //     address: wallet.publicKey,
    //     lamports: buying,
    //   })),
    //   curve
    // );

    // const txs = [firstTx];
    // const batch = 4;

    // for (let i = 0; i < sequences.length; i += batch) {
    //   const chunks = sequences.slice(i, i + batch);
    //   const wallets = buyers
    //     .filter(({ wallet }) =>
    //       chunks.some(({ address }) => address.equals(wallet.publicKey))
    //     )
    //     .map(({ wallet }) => wallet);

    //   const tx = new VersionedTransaction(
    //     new TransactionMessage({
    //       payerKey: devWallet.publicKey,
    //       recentBlockhash: latestBlockhash.blockhash,
    //       instructions: [
    //         ...chunks.flatMap((sequence) => {
    //           const associatedToken = getAssociatedTokenAddressSync(
    //             mint.publicKey,
    //             sequence.address
    //           );

    //           return [
    //             createAssociatedTokenAccountIdempotentInstruction(
    //               sequence.address,
    //               associatedToken,
    //               sequence.address,
    //               mint.publicKey
    //             ),
    //             sequence.instruction,
    //           ];
    //         }),
    //       ],
    //     }).compileToV0Message()
    //   );

    //   tx.sign([devWallet, ...wallets]);
    //   txs.push(tx);
    // }

    // // Simulasi transaksi sebelum dikirim
    // await connection
    //   .simulateTransaction(firstTx)
    //   .then(console.log)
    //   .catch(console.error);

    // // Uncomment untuk eksekusi transaksi
    // const id = await jito.bundles(txs);
    // console.log({ id });
    // const confirmation = await jito.confirms(id);
    // console.log(confirmation?.value);

    // await jito.shutdown();
  } catch (error) {
    console.error("Error in launch function:", error);
  }
};

launch();
