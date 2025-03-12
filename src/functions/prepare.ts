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

const name = "Bundler";
const symbol = "BUND";

const upload = async () => {
  const file = readFileSync("../../public/logo.png");
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

  const pumpfun = new Pumpfun();
  const curve = pumpfun.initialCurve(); // initial bonding curve state
  const mint = Keypair.generate(); // random contract address token
  // at least have 0.05 SOL
  console.log("test");
  const devWallet = Keypair.fromSecretKey(
    base58.decode(process.env.DEV_WALLET!)
  );

  const balance = await connection.getBalance(devWallet.publicKey);

  if (balance < 0.05e9) {
    console.error("Insufficient balance");

    return;
  }

  const buying = 0.0001e9;
  // add buyer max 16 at least have 0.01 SOL if want to test token creation * bundle
  // leave empty if you want to test token creation only
  const buyers = [
    // {
    //   secretKey: '',
    //   buying: 0.0001e9,
    // },
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

  // first tx will create the token and buy the token by dev wallet
  const firstTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: devWallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100_000,
        }),
        SystemProgram.transfer({
          fromPubkey: devWallet.publicKey,
          toPubkey: jito.getRandomTipAccount(),
          lamports: 5000,
        }),
        await pumpfun.create(
          devWallet.publicKey,
          mint.publicKey,
          name,
          symbol,
          uri
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          devWallet.publicKey,
          associatedTokenAccountDevWallet,
          devWallet.publicKey,
          mint.publicKey
        ),
        await pumpfun.buy(
          devWallet.publicKey,
          mint.publicKey,
          pumpfun.calculateTokenByLamports(curve, new BN(buying), 0), // 0% slippage calculation token price
          { curve, maxSolCost: new BN(buying * 1.02) } // allocate 2% slippage
        ),
      ],
    }).compileToV0Message()
  );

  firstTx.sign([devWallet, mint]);

  const sequences = await pumpfun.calculateBundleBuySequence(
    mint.publicKey,
    buyers.map(({ wallet, buying }) => ({
      address: wallet.publicKey,
      lamports: buying,
    })),
    curve
  );

  const txs = [firstTx];
  const batch = 4; // 4 wallet buy per 1 tx

  for (let i = 0; i < sequences.length; i += batch) {
    const chunks = sequences.slice(i, i + batch);
    const wallets = buyers
      .filter(({ wallet }) => {
        return chunks.some(({ address }) => address.equals(wallet.publicKey));
      })
      .map(({ wallet }) => wallet);

    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: devWallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ...chunks.flatMap((sequence) => {
            const associatedToken = getAssociatedTokenAddressSync(
              mint.publicKey,
              sequence.address
            );

            return [
              createAssociatedTokenAccountIdempotentInstruction(
                sequence.address,
                associatedToken,
                sequence.address,
                mint.publicKey
              ),
              sequence.instruction,
            ];
          }),
        ],
      }).compileToV0Message()
    );

    tx.sign([devWallet, ...wallets]);
    txs.push(tx);
  }

  await connection
    .simulateTransaction(firstTx)
    .then(console.log)
    .catch(console.error);

  // uncomment this to run land txs

  // const id = await jito.bundles(txs)
  //
  // console.log({ id })
  //
  // const confirmation = await jito.confirms(id)
  //
  // console.log(confirmation?.value)
  //
  // testing token CZHdr8JGqTnJJtHk9sAXrWMELM8HXm5FP7NiTKro9uxD

  await jito.shutdown();
};

main();
