import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  liquidityStateV4Layout,
  OPEN_BOOK_PROGRAM,
} from "@raydium-io/raydium-sdk-v2";
import idl, { RaydiumIDL } from "./raydium.idl.js";
import rpc from "./rpc.ts";
import BN from "bn.js";

export class MarketNotFoundInRaydium extends Error {}

export default class Raydium {
  public program: Program<RaydiumIDL>;
  protected fetchingMarket = new Map<
    string,
    ReturnType<Raydium["getMarket"]>
  >();
  protected fetchingMarketByMint = new Map<
    string,
    ReturnType<Raydium["getMarketByMint"]>
  >();

  constructor(
    public programId = new PublicKey(
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
    )
  ) {
    this.program = new Program(
      idl,
      programId,
      new AnchorProvider(rpc, new Wallet(Keypair.generate()), {
        commitment: "confirmed",
      })
    );
  }

  public async getMarket(
    address: PublicKey
  ): Promise<
    | ({ id: PublicKey } & ReturnType<
        (typeof liquidityStateV4Layout)["decode"]
      >)
    | null
  > {
    if (this.fetchingMarket.has(address.toBase58())) {
      return this.fetchingMarket.get(address.toBase58())!;
    }

    const fetching = rpc.getAccountInfo(address).then((info) => {
      if (!info) {
        return null;
      }

      const decoded = liquidityStateV4Layout.decode(info.data);
      const [id] = PublicKey.findProgramAddressSync(
        [
          this.programId.toBuffer(),
          decoded.marketId.toBuffer(),
          Buffer.from("amm_associated_seed"),
        ],
        this.programId
      );

      return {
        id,
        ...decoded,
      };
    });

    this.fetchingMarket.set(address.toBase58(), fetching);

    return fetching;
  }

  public async getMarketByMint(
    mint: PublicKey,
    base = NATIVE_MINT
  ): Promise<
    | ({ id: PublicKey } & ReturnType<
        (typeof liquidityStateV4Layout)["decode"]
      >)
    | null
  > {
    if (this.fetchingMarketByMint.has(mint.toBase58())) {
      return this.fetchingMarketByMint.get(mint.toBase58())!;
    }

    const fetching = rpc
      .getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: liquidityStateV4Layout.offsetOf("baseMint"),
              bytes: base.toBuffer().toString("base64"),
            },
          },
          {
            memcmp: {
              offset: liquidityStateV4Layout.offsetOf("quoteMint"),
              bytes: mint.toBuffer().toString("base64"),
            },
          },
        ],
      })
      .then((response) => {
        const markets = response.map(({ account }) => {
          const decoded = liquidityStateV4Layout.decode(account.data);
          const [id] = PublicKey.findProgramAddressSync(
            [
              this.programId.toBuffer(),
              decoded.marketId.toBuffer(),
              Buffer.from("amm_associated_seed"),
            ],
            this.programId
          );

          return {
            id,
            ...decoded,
          };
        });

        if (markets.length === 0) {
          return null;
        }

        return markets.shift()!;
      });

    this.fetchingMarketByMint.set(mint.toBase58(), fetching);

    return await fetching;
  }

  public async keys(
    state: NonNullable<Awaited<ReturnType<Raydium["getMarket"]>>>
  ) {
    function getVaultOwnerAndNonce() {
      const vaultSignerNonce = new BN(0);

      while (true) {
        try {
          const vaultOwner = PublicKey.createProgramAddressSync(
            [
              state.marketId.toBuffer(),
              vaultSignerNonce.toArrayLike(Buffer, "le", 8),
            ],
            OPEN_BOOK_PROGRAM
          );
          return vaultOwner;
        } catch (e) {
          vaultSignerNonce.iaddn(1);

          if (vaultSignerNonce.gt(new BN(25555)))
            throw Error("find vault owner error");
        }
      }
    }

    const marketAuthority = getVaultOwnerAndNonce();

    const [id] = PublicKey.findProgramAddressSync(
      [
        this.programId.toBuffer(),
        state.marketId.toBuffer(),
        Buffer.from("amm_associated_seed"),
      ],
      this.programId
    );

    const [authority] = PublicKey.findProgramAddressSync(
      [Buffer.from("amm authority")],
      this.programId
    );

    const [baseVault] = PublicKey.findProgramAddressSync(
      [
        this.programId.toBuffer(),
        state.marketId.toBuffer(),
        Buffer.from("coin_vault_associated_seed"),
      ],
      this.programId
    );

    const [quoteVault] = PublicKey.findProgramAddressSync(
      [
        this.programId.toBuffer(),
        state.marketId.toBuffer(),
        Buffer.from("pc_vault_associated_seed"),
      ],
      this.programId
    );

    return {
      id,
      authority,
      openOrders: state.openOrders,
      targetOrders: state.targetOrders,
      marketProgramId: state.marketProgramId,
      marketId: state.marketId,
      marketAuthority,
      marketBaseVault: id,
      marketQuoteVault: id,
      marketBids: id,
      marketAsks: id,
      marketEventQueue: id,
      baseVault,
      quoteVault,
      baseMint: state.baseMint,
      baseMintProgramId: TOKEN_PROGRAM_ID,
      quoteMint: state.quoteMint,
      quoteMintProgramId: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      computeBudget: ComputeBudgetProgram.programId,
      sysVarRent: SYSVAR_RENT_PUBKEY,
      programId: this.programId,
    };
  }

  public async liquidity(keys: Awaited<ReturnType<Raydium["keys"]>>) {
    const [base, quote] = await Promise.all([
      rpc
        .getTokenAccountBalance(keys.baseVault)
        .then((response) => response.value.amount),
      rpc
        .getTokenAccountBalance(keys.quoteVault)
        .then((response) => response.value.amount),
    ]);

    return {
      base,
      quote,
    };
  }

  public async buyBaseIn(
    keys: Awaited<ReturnType<Raydium["keys"]>>,
    wallet: PublicKey,
    amountIn: number | bigint,
    minimumAmountOut?: number | bigint,
    slippage = 0.01,
    liquidity?: Awaited<ReturnType<Raydium["liquidity"]>>
  ) {
    if (minimumAmountOut === undefined) {
      const { base, quote } = liquidity || (await this.liquidity(keys));

      minimumAmountOut =
        (Number(amountIn) * Number(quote)) / (Number(base) + Number(amountIn));
      minimumAmountOut *= 1 - slippage;
      minimumAmountOut = Math.round(minimumAmountOut);
    }

    const amountInBn = new BN(amountIn.toString());
    const amountOutBn = new BN(minimumAmountOut.toString());
    const uerSourceTokenAccount = getAssociatedTokenAddressSync(
      keys.baseMint,
      wallet
    );
    const uerDestinationTokenAccount = getAssociatedTokenAddressSync(
      keys.quoteMint,
      wallet
    );

    const instruction = await this.program.methods
      .swapBaseIn(amountInBn, amountOutBn)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        amm: keys.id,
        ammAuthority: keys.authority,
        ammOpenOrders: keys.openOrders,
        ammTargetOrders: keys.targetOrders,
        poolCoinTokenAccount: keys.baseVault,
        poolPcTokenAccount: keys.quoteVault,
        serumProgram: keys.marketProgramId,
        serumMarket: keys.marketId,
        serumBids: keys.marketBids,
        serumAsks: keys.marketAsks,
        serumEventQueue: keys.marketEventQueue,
        serumCoinVaultAccount: keys.marketBaseVault,
        serumPcVaultAccount: keys.marketQuoteVault,
        serumVaultSigner: keys.marketAuthority,
        uerSourceTokenAccount,
        uerDestinationTokenAccount,
        userSourceOwner: wallet,
      })
      .instruction();

    instruction.data = Buffer.from([
      0x09,
      ...amountInBn.toBuffer("le", 8),
      ...amountOutBn.toBuffer("le", 8),
    ]);

    return {
      amountIn: amountInBn.toNumber(),
      amountOut: amountOutBn.toNumber(),
      instruction,
    };
  }

  public async buyBaseOut(
    keys: Awaited<ReturnType<Raydium["keys"]>>,
    wallet: PublicKey,
    amountOut: number | bigint,
    maxAmountIn?: number | bigint,
    slippage = 0.01,
    liquidity?: Awaited<ReturnType<Raydium["liquidity"]>>
  ) {
    if (!maxAmountIn) {
      const { base, quote } = liquidity || (await this.liquidity(keys));

      maxAmountIn =
        (Number(base) * Number(amountOut)) /
        (Number(quote) - Number(amountOut));
      maxAmountIn *= 1 + slippage;
      maxAmountIn = Math.round(maxAmountIn);
    }

    const amountInBn = new BN(maxAmountIn.toString());
    const amountOutBn = new BN(amountOut.toString());

    const uerSourceTokenAccount = getAssociatedTokenAddressSync(
      keys.baseMint,
      wallet
    );
    const uerDestinationTokenAccount = getAssociatedTokenAddressSync(
      keys.quoteMint,
      wallet
    );

    const instruction = await this.program.methods
      .swapBaseOut(amountInBn, amountOutBn)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        amm: keys.id,
        ammAuthority: keys.authority,
        ammOpenOrders: keys.openOrders,
        ammTargetOrders: keys.targetOrders,
        poolCoinTokenAccount: keys.baseVault,
        poolPcTokenAccount: keys.quoteVault,
        serumProgram: keys.marketProgramId,
        serumMarket: keys.marketId,
        serumBids: keys.marketBids,
        serumAsks: keys.marketAsks,
        serumEventQueue: keys.marketEventQueue,
        serumCoinVaultAccount: keys.marketBaseVault,
        serumPcVaultAccount: keys.marketQuoteVault,
        serumVaultSigner: keys.marketAuthority,
        uerSourceTokenAccount,
        uerDestinationTokenAccount,
        userSourceOwner: wallet,
      })
      .instruction();

    instruction.data = Buffer.from([
      0x0b,
      ...amountInBn.toBuffer("le", 8),
      ...amountOutBn.toBuffer("le", 8),
    ]);

    return {
      amountIn: amountInBn.toNumber(),
      amountOut: amountOutBn.toNumber(),
      instruction,
    };
  }

  public async sellBaseIn(
    keys: Awaited<ReturnType<Raydium["keys"]>>,
    wallet: PublicKey,
    amountIn: number | bigint,
    minimumAmountOut?: number | bigint,
    slippage = 0.01,
    liquidity?: Awaited<ReturnType<Raydium["liquidity"]>>
  ) {
    if (minimumAmountOut === undefined) {
      const { base, quote } = liquidity || (await this.liquidity(keys));

      minimumAmountOut =
        (Number(base) * Number(amountIn)) / (Number(quote) - Number(amountIn));
      minimumAmountOut *= 1 - slippage;
      minimumAmountOut = Math.round(minimumAmountOut);
    }

    const amountInBn = new BN(amountIn.toString());
    const amountOutBn = new BN(minimumAmountOut.toString());
    const uerSourceTokenAccount = getAssociatedTokenAddressSync(
      keys.quoteMint,
      wallet
    );
    const uerDestinationTokenAccount = getAssociatedTokenAddressSync(
      keys.baseMint,
      wallet
    );

    const instruction = await this.program.methods
      .swapBaseIn(amountInBn, amountOutBn)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        amm: keys.id,
        ammAuthority: keys.authority,
        ammOpenOrders: keys.openOrders,
        ammTargetOrders: keys.targetOrders,
        poolCoinTokenAccount: keys.baseVault,
        poolPcTokenAccount: keys.quoteVault,
        serumProgram: keys.marketProgramId,
        serumMarket: keys.marketId,
        serumBids: keys.marketBids,
        serumAsks: keys.marketAsks,
        serumEventQueue: keys.marketEventQueue,
        serumCoinVaultAccount: keys.marketBaseVault,
        serumPcVaultAccount: keys.marketQuoteVault,
        serumVaultSigner: keys.marketAuthority,
        uerSourceTokenAccount,
        uerDestinationTokenAccount,
        userSourceOwner: wallet,
      })
      .instruction();

    instruction.data = Buffer.from([
      0x09,
      ...amountInBn.toBuffer("le", 8),
      ...amountOutBn.toBuffer("le", 8),
    ]);

    return {
      amountIn: amountInBn.toNumber(),
      amountOut: amountOutBn.toNumber(),
      instruction,
    };
  }

  public async sellAndReBuy(
    keys: Awaited<ReturnType<Raydium["keys"]>>,
    origin: PublicKey,
    selling: number | bigint,
    destinations: {
      middle: PublicKey;
      address: PublicKey;
      buying: number | bigint;
    }[]
  ) {
    const rent = await getMinimumBalanceForRentExemptAccount(rpc);
    const liquidity = await this.liquidity(keys);
    const sell = await this.sellBaseIn(
      keys,
      origin,
      selling,
      0,
      undefined,
      liquidity
    );
    const sellerSolAta = getAssociatedTokenAddressSync(NATIVE_MINT, origin);
    const buys = await Promise.all(
      destinations.map(async (destination) => {
        const swap = await this.buyBaseOut(
          keys,
          destination.address,
          destination.buying,
          undefined,
          undefined,
          liquidity
        );
        const buyerSolAta = getAssociatedTokenAddressSync(
          NATIVE_MINT,
          destination.address
        );
        const buyerQuoteAta = getAssociatedTokenAddressSync(
          keys.quoteMint,
          destination.address
        );
        const needed = Math.round(swap.amountIn + rent * 2);

        return [
          createAssociatedTokenAccountIdempotentInstruction(
            origin,
            buyerSolAta,
            destination.address,
            NATIVE_MINT
          ),
          SystemProgram.transfer({
            fromPubkey: origin,
            toPubkey: destination.middle,
            lamports: needed,
          }),
          SystemProgram.transfer({
            fromPubkey: destination.middle,
            toPubkey: buyerSolAta,
            lamports: needed,
          }),
          createSyncNativeInstruction(buyerSolAta),
          createAssociatedTokenAccountIdempotentInstruction(
            origin,
            buyerQuoteAta,
            destination.address,
            keys.quoteMint
          ),
          swap.instruction,
          createCloseAccountInstruction(
            buyerSolAta,
            destination.address,
            destination.address
          ),
        ];
      })
    );

    return [
      createAssociatedTokenAccountIdempotentInstruction(
        origin,
        sellerSolAta,
        origin,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: origin,
        toPubkey: sellerSolAta,
        lamports: rent,
      }),
      createSyncNativeInstruction(sellerSolAta),
      sell.instruction,
      createCloseAccountInstruction(sellerSolAta, origin, origin),
      ...buys.flat(),
    ];
  }
}
