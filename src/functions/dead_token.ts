import { struct } from "@solana/buffer-layout";
import { u64, bool } from "@solana/buffer-layout-utils";
import Pumpfun from "../lib/pumpfun";
import rpc from "../lib/rpc";
import base58 from "../lib/base58";
import BN from "bn.js";

const curveLayout = struct<{
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
}>([
  u64("virtualTokenReserves"),
  u64("virtualSolReserves"),
  u64("realTokenReserves"),
  u64("realSolReserves"),
  u64("tokenTotalSupply"),
  bool("complete"),
]);

const main = async () => {
  const pumpfun = new Pumpfun();
  console.log(pumpfun.programId);
  console.log({ slot: await rpc.getSlot(), span: curveLayout.span });
  const list = await rpc.getProgramAccounts(pumpfun.programId, {
    dataSlice: {
      offset: 8,
      length: curveLayout.span,
    },
    filters: [
      // {
      //   memcmp: {
      //     offset: curveLayout.offsetOf('virtualTokenReserves')!,
      //     bytes: new BN('1072726672509045').toBuffer('le', 8).toString('base64'),
      //     encoding: 'base64',
      //   }
      // }
    ],
  });

  console.log(list);
};

main();
