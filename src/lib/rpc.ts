import {
  BlockhashWithExpiryBlockHeight,
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  TokenAccountsFilter,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount as gMBFREA,
  Mint,
  TOKEN_PROGRAM_ID,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import dotenv from "dotenv";
import { sleep } from "./utils";
import { getConfig } from "../functions/config";

dotenv.config();

const config = getConfig();

export const connection = new Connection(
  config.RPC_URL || clusterApiUrl("mainnet-beta"),
  {
    commitment: "confirmed",
    wsEndpoint: config.RPC_WSS,
  }
);

export const getLatestBlockhash = async (
  commitment: Commitment = "confirmed"
): Promise<BlockhashWithExpiryBlockHeight> => {
  try {
    return await connection.getLatestBlockhash(commitment);
  } catch (e) {
    await sleep(100);

    return getLatestBlockhash(commitment);
  }
};

export const getTokenAccountsByOwner = async (
  owner: PublicKey,
  filter: TokenAccountsFilter
) => {
  return connection
    .getTokenAccountsByOwner(owner, filter)
    .then(async (response) => {
      const accounts = response.value.map(({ pubkey, account }) => {
        return unpackAccount(pubkey, account);
      });
      const mints = await getMints(accounts.map((account) => account.mint));

      return accounts.map((account) => {
        return {
          ...account,
          mint: mints.find((m) => m?.address.equals(account.mint)),
        };
      });
    });
};

export const getMultipleAccountBalance = async (addresses: PublicKey[]) => {
  const accounts: {
    address: PublicKey;
    lamports: number;
  }[] = [];
  const actions = [];

  for (let i = 0; i < addresses.length; i += 100) {
    const chunks = addresses.slice(i, i + 100);
    const action = connection.getMultipleAccountsInfo(chunks).then((infos) => {
      accounts.push(
        ...infos.map((info, j) => {
          return {
            address: chunks[j],
            lamports: info?.lamports || 0,
          };
        })
      );
    });

    actions.push(action);
  }

  await Promise.all(actions);

  return accounts;
};

export const getMultipleTokenAccountBalances = async (
  mint: PublicKey,
  owners: PublicKey[],
  programId = TOKEN_PROGRAM_ID
) => {
  const accounts: {
    owner: PublicKey;
    address: PublicKey;
    balance: bigint;
  }[] = [];

  const actions = [];

  for (let i = 0; i < owners.length; i += 100) {
    const chunks = owners.slice(i, i + 100);
    const addresses = chunks.map((owner) =>
      getAssociatedTokenAddressSync(mint, owner, true, programId)
    );
    const action = connection
      .getMultipleAccountsInfo(addresses)
      .then((infos) => {
        infos.map((info, j) => {
          const owner = chunks[j];
          const address = addresses[j];
          let balance = BigInt(0);

          try {
            const account = unpackAccount(address, info, programId);

            balance = account.amount;
          } catch (e) {
            balance = BigInt(0);
          }

          accounts.push({
            owner,
            address,
            balance,
          });
        });
      });

    actions.push(action);
  }

  await Promise.all(actions);

  return accounts;
};

export const getMultipleTokenAccountBalanceByMints = async (
  owner: PublicKey,
  mints: PublicKey[],
  programId = TOKEN_PROGRAM_ID
) => {
  const accounts: {
    address: PublicKey;
    mint: PublicKey;
    balance: bigint;
  }[] = [];

  const actions = [];

  for (let i = 0; i < mints.length; i += 100) {
    const chunks = mints.slice(i, i + 100);
    const addresses = chunks.map((mint) =>
      getAssociatedTokenAddressSync(mint, owner, undefined, programId)
    );
    const action = connection
      .getMultipleAccountsInfo(addresses)
      .then((infos) => {
        infos.map((info, j) => {
          const mint = chunks[j];
          const address = addresses[j];
          let balance = BigInt(0);

          try {
            const account = unpackAccount(address, info, programId);

            balance = account.amount;
          } catch (e) {
            balance = BigInt(0);
          }

          accounts.push({
            mint,
            address,
            balance,
          });
        });
      });

    actions.push(action);
  }

  await Promise.all(actions);

  return accounts;
};

export const getAccounts = async (
  addresses: PublicKey[],
  programId = TOKEN_PROGRAM_ID
) => {
  const accounts: (Account | null)[] = [];
  const actions = [];

  for (let i = 0; i < addresses.length; i += 100) {
    const chunks = addresses.slice(i, i + 100);
    const action = connection.getMultipleAccountsInfo(chunks).then((infos) => {
      accounts.push(
        ...infos.map((info, j) => {
          let account: Account | null = null;

          try {
            account = unpackAccount(chunks[j], info, programId);
          } catch (e) {}

          return account;
        })
      );
    });

    actions.push(action);
  }

  await Promise.all(actions);

  return accounts;
};

export const getMints = async (
  mints: PublicKey[],
  programId = TOKEN_PROGRAM_ID
) => {
  const accounts: (Mint | null)[] = [];
  const actions = [];

  for (let i = 0; i < mints.length; i += 100) {
    const chunks = mints.slice(i, i + 100);
    const action = connection.getMultipleAccountsInfo(chunks).then((infos) => {
      accounts.push(
        ...infos.map((info, j) => {
          let mint: Mint | null = null;

          try {
            mint = unpackMint(chunks[j], info, programId);
          } catch (e) {}

          return mint;
        })
      );
    });

    actions.push(action);
  }

  await Promise.all(actions);

  return accounts;
};

export const getTokenBalance = async (
  mint: PublicKey,
  owner: PublicKey,
  allowOnCurve?: boolean,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) => {
  const associatedToken = getAssociatedTokenAddressSync(
    mint,
    owner,
    allowOnCurve,
    programId,
    associatedTokenProgramId
  );

  return connection
    .getTokenAccountBalance(associatedToken)
    .then((info) => BigInt(info?.value?.amount || 0))
    .catch(() => BigInt(0));
};

export const confirmTransaction = async (
  signature: TransactionSignature,
  blockhash: BlockhashWithExpiryBlockHeight
) => {
  return await connection.confirmTransaction({
    signature,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight + 100,
  });
};

export const getMinimumBalanceForRentExemptAccount = () => gMBFREA(connection);

export const getMinimumBalanceForRentExemptSize = (dataLength: number) => {
  return connection.getMinimumBalanceForRentExemption(dataLength);
};

export default connection;
