import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { bool, struct, u64 } from "@coral-xyz/borsh";
import idl, { PumpfunIDL } from "./pumpfun.idl";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import rpc from "./rpc";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";

interface Curve {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
}

const curveLayout = struct([
  u64("virtualTokenReserves"),
  u64("virtualSolReserves"),
  u64("realTokenReserves"),
  u64("realSolReserves"),
  u64("tokenTotalSupply"),
  bool("complete"),
]);

export default class Pumpfun {
  protected provider: AnchorProvider;
  protected program: Program<PumpfunIDL>;

  constructor(
    public programId = new PublicKey(
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
    ),
    public global = new PublicKey(
      "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
    ),
    public feeAccount = new PublicKey(
      "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
    ),
    public eventAuthority = new PublicKey(
      "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"
    ),
    public mintAuthority = new PublicKey(
      "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM"
    ),
    public mplTokenMetadata = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    )
  ) {
    this.provider = new AnchorProvider(rpc, new Wallet(Keypair.generate()), {
      commitment: "confirmed",
    });

    this.program = new Program(idl, programId, this.provider);
  }

  public keys(mint: PublicKey) {
    return [
      SystemProgram.programId,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SYSVAR_RENT_PUBKEY,
      this.programId,
      this.global,
      this.feeAccount,
      this.eventAuthority,
      this.bonding(mint),
      this.vault(mint),
      this.metadata(mint),
      mint,
    ];
  }

  public bonding(mint: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mint.toBuffer()],
      this.programId
    );

    return address;
  }

  public vault(mint: PublicKey) {
    const bonding = this.bonding(mint);

    return getAssociatedTokenAddressSync(mint, bonding, true);
  }

  public metadata(mint: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        this.mplTokenMetadata.toBuffer(),
        mint.toBuffer(),
      ],
      this.mplTokenMetadata
    );

    return address;
  }

  public async curve(mint: PublicKey) {
    const bonding = this.bonding(mint);

    const curve = await rpc.getAccountInfo(bonding);
    const decoded = curveLayout.decode(curve!.data, 8) as Curve;
    const virtualSolReserves = new BN(decoded.virtualSolReserves);
    const virtualTokenReserves = new BN(decoded.virtualTokenReserves);

    return {
      virtualSolReserves,
      virtualTokenReserves,
      completed: decoded.complete,
    };
  }

  public initialCurve() {
    return {
      virtualTokenReserves: new BN("1072990000000000"),
      virtualSolReserves: new BN("30000279596"),
      completed: false,
    };
  }

  public calculateTokenByLamports(
    curve: Awaited<ReturnType<Pumpfun["curve"]>>,
    lamports: BN,
    slippagePercentage = 0.02
  ) {
    const { virtualTokenReserves, virtualSolReserves } = curve;

    const bought = virtualTokenReserves
      .mul(lamports)
      .div(virtualSolReserves.add(lamports));

    return bought.sub(bought.muln(slippagePercentage));
  }

  public calculateLamportsByToken(
    curve: Awaited<ReturnType<Pumpfun["curve"]>>,
    token: BN,
    slippagePercentage = 0.02
  ) {
    const { virtualTokenReserves, virtualSolReserves } = curve;

    const sold = virtualSolReserves
      .mul(token)
      .div(virtualTokenReserves.sub(token));

    return sold.sub(sold.muln(slippagePercentage));
  }

  public async create(
    user: PublicKey,
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string
  ) {
    return await this.program.methods
      .create(name, symbol, uri, user)
      .accounts({
        global: this.global,
        user,
        mint,
        mintAuthority: this.mintAuthority,
        bondingCurve: this.bonding(mint),
        associatedBondingCurve: this.vault(mint),
        metadata: this.metadata(mint),
        mplTokenMetadata: this.mplTokenMetadata,
      })
      .instruction();
  }

  public async buy(
    buyer: PublicKey,
    mint: PublicKey,
    token: BN,
    options: {
      slippagePercentage?: number;
      maxSolCost?: BN;
      curve?: Awaited<ReturnType<Pumpfun["curve"]>>;
    } = {
      slippagePercentage: 0.02,
    }
  ) {
    let { slippagePercentage, maxSolCost, curve } = options;

    if (!curve) {
      curve = await this.curve(mint);
    }

    if (maxSolCost === undefined) {
      maxSolCost = this.calculateLamportsByToken(
        curve,
        token,
        slippagePercentage
      );

      if (slippagePercentage) {
        maxSolCost = maxSolCost.add(maxSolCost.muln(slippagePercentage));
      }
    }

    return await this.program.methods
      .buy(token, new BN(maxSolCost))
      .accounts({
        global: this.global,
        feeRecipient: this.feeAccount,
        mint,
        bondingCurve: this.bonding(mint),
        associatedBondingCurve: this.vault(mint),
        associatedUser: getAssociatedTokenAddressSync(mint, buyer),
        user: buyer,
      })
      .instruction();
  }

  public async sell(
    seller: PublicKey,
    mint: PublicKey,
    amount: BN,
    options: {
      slippagePercentage?: number;
      minSolOutput?: number;
      curve?: Awaited<ReturnType<Pumpfun["curve"]>>;
    } = {
      slippagePercentage: 0.02,
    }
  ) {
    let { slippagePercentage, minSolOutput, curve } = options;

    if (!curve) {
      curve = await this.curve(mint);
    }

    if (minSolOutput === undefined) {
      minSolOutput = this.calculateLamportsByToken(curve, amount).toNumber();

      if (slippagePercentage) {
        minSolOutput -= minSolOutput * slippagePercentage;
      }
    }

    return await this.program.methods
      .sell(amount, new BN(minSolOutput))
      .accounts({
        global: this.global,
        feeRecipient: this.feeAccount,
        mint,
        bondingCurve: this.bonding(mint),
        associatedBondingCurve: this.vault(mint),
        associatedUser: getAssociatedTokenAddressSync(mint, seller),
        user: seller,
      })
      .instruction();
  }

  public async calculateBundleBuySequence(
    mint: PublicKey,
    buyers: {
      address: PublicKey;
      lamports: number;
    }[],
    curve?: Awaited<ReturnType<Pumpfun["curve"]>>,
    slippagePercentage = 0.02
  ) {
    if (!curve) {
      curve = await this.curve(mint);
    }

    const sequences = [];

    for (const { address, lamports } of buyers) {
      const token = this.calculateTokenByLamports(curve, new BN(lamports), 0);

      const instruction = await this.buy(address, mint, token, {
        curve,
        maxSolCost: new BN(lamports + lamports * slippagePercentage),
      });

      sequences.push({
        address,
        lamports,
        token,
        instruction,
        curve,
      });

      curve.virtualSolReserves = curve.virtualSolReserves.addn(lamports);
      curve.virtualTokenReserves = curve.virtualTokenReserves.sub(token);
    }

    return sequences;
  }

  public async sellAndReBuy(
    curve: Awaited<ReturnType<Pumpfun["curve"]>>,
    mint: PublicKey,
    origin: PublicKey,
    selling: BN,
    destinations: {
      middle: PublicKey;
      address: PublicKey;
      buying: BN;
    }[]
  ) {
    const rent = await getMinimumBalanceForRentExemptAccount(rpc);
    const sell = await this.sell(origin, mint, selling, {
      minSolOutput: 0,
      curve,
    });
    const buys = await Promise.all(
      destinations.map(async (destination) => {
        const lamports = this.calculateLamportsByToken(
          curve,
          destination.buying,
          0
        );
        const swap = await this.buy(
          destination.address,
          mint,
          destination.buying,
          {
            maxSolCost: new BN(Math.round(lamports.toNumber() * 1.02)),
            curve,
          }
        );
        const associatedToken = getAssociatedTokenAddressSync(
          mint,
          destination.address
        );
        const needed = Math.round(lamports.toNumber() * 1.02) + rent * 2;

        return [
          SystemProgram.transfer({
            fromPubkey: origin,
            toPubkey: destination.middle,
            lamports: needed,
          }),
          SystemProgram.transfer({
            fromPubkey: destination.middle,
            toPubkey: destination.address,
            lamports: needed,
          }),
          createAssociatedTokenAccountIdempotentInstruction(
            destination.address,
            associatedToken,
            destination.address,
            mint
          ),
          swap,
        ];
      })
    );

    return [sell, ...buys.flat()];
  }
}
