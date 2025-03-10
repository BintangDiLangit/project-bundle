export type RaydiumIDL = {
  version: "0.3.0";
  name: "raydium_amm";
  instructions: [
    {
      name: "swapBaseIn";
      accounts: [
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "amm";
          isMut: true;
          isSigner: false;
        },
        {
          name: "ammAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "ammOpenOrders";
          isMut: true;
          isSigner: false;
        },
        {
          name: "ammTargetOrders";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolCoinTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolPcTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "serumMarket";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumBids";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumAsks";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumEventQueue";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumCoinVaultAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumPcVaultAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumVaultSigner";
          isMut: false;
          isSigner: false;
        },
        {
          name: "uerSourceTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "uerDestinationTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "userSourceOwner";
          isMut: false;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "amountIn";
          type: "u64";
        },
        {
          name: "minimumAmountOut";
          type: "u64";
        }
      ];
    },
    {
      name: "preInitialize";
      accounts: [
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "ammTargetOrders";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolWithdrawQueue";
          isMut: true;
          isSigner: false;
        },
        {
          name: "ammAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "lpMintAddress";
          isMut: true;
          isSigner: false;
        },
        {
          name: "coinMintAddress";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pcMintAddress";
          isMut: false;
          isSigner: false;
        },
        {
          name: "poolCoinTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolPcTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolTempLpTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumMarket";
          isMut: false;
          isSigner: false;
        },
        {
          name: "userWallet";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "nonce";
          type: "u8";
        }
      ];
    },
    {
      name: "swapBaseOut";
      accounts: [
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "amm";
          isMut: true;
          isSigner: false;
        },
        {
          name: "ammAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "ammOpenOrders";
          isMut: true;
          isSigner: false;
        },
        {
          name: "ammTargetOrders";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolCoinTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolPcTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "serumMarket";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumBids";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumAsks";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumEventQueue";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumCoinVaultAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumPcVaultAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "serumVaultSigner";
          isMut: false;
          isSigner: false;
        },
        {
          name: "uerSourceTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "uerDestinationTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "userSourceOwner";
          isMut: false;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "maxAmountIn";
          type: "u64";
        },
        {
          name: "amountOut";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [];
  types: [
    {
      name: "SwapInstructionBaseIn";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amountIn";
            type: "u64";
          },
          {
            name: "minimumAmountOut";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "SwapInstructionBaseOut";
      type: {
        kind: "struct";
        fields: [
          {
            name: "maxAmountIn";
            type: "u64";
          },
          {
            name: "amountOut";
            type: "u64";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 0;
      name: "AlreadyInUse";
      msg: "AlreadyInUse";
    },
    {
      code: 1;
      name: "InvalidProgramAddress";
      msg: "InvalidProgramAddress";
    },
    {
      code: 2;
      name: "ExpectedMint";
      msg: "ExpectedMint";
    },
    {
      code: 3;
      name: "ExpectedAccount";
      msg: "ExpectedAccount";
    },
    {
      code: 4;
      name: "InvalidCoinVault";
      msg: "InvalidCoinVault";
    },
    {
      code: 5;
      name: "InvalidPCVault";
      msg: "InvalidPCVault";
    },
    {
      code: 6;
      name: "InvalidTokenLP";
      msg: "InvalidTokenLP";
    },
    {
      code: 7;
      name: "InvalidDestTokenCoin";
      msg: "InvalidDestTokenCoin";
    },
    {
      code: 8;
      name: "InvalidDestTokenPC";
      msg: "InvalidDestTokenPC";
    },
    {
      code: 9;
      name: "InvalidPoolMint";
      msg: "InvalidPoolMint";
    },
    {
      code: 10;
      name: "InvalidOpenOrders";
      msg: "InvalidOpenOrders";
    },
    {
      code: 11;
      name: "InvalidSerumMarket";
      msg: "InvalidSerumMarket";
    },
    {
      code: 12;
      name: "InvalidSerumProgram";
      msg: "InvalidSerumProgram";
    },
    {
      code: 13;
      name: "InvalidTargetOrders";
      msg: "InvalidTargetOrders";
    },
    {
      code: 14;
      name: "InvalidWithdrawQueue";
      msg: "InvalidWithdrawQueue";
    },
    {
      code: 15;
      name: "InvalidTempLp";
      msg: "InvalidTempLp";
    },
    {
      code: 16;
      name: "InvalidCoinMint";
      msg: "InvalidCoinMint";
    },
    {
      code: 17;
      name: "InvalidPCMint";
      msg: "InvalidPCMint";
    },
    {
      code: 18;
      name: "InvalidOwner";
      msg: "InvalidOwner";
    },
    {
      code: 19;
      name: "InvalidSupply";
      msg: "InvalidSupply";
    },
    {
      code: 20;
      name: "InvalidDelegate";
      msg: "InvalidDelegate";
    },
    {
      code: 21;
      name: "InvalidSignAccount";
      msg: "Invalid Sign Account";
    },
    {
      code: 22;
      name: "InvalidStatus";
      msg: "InvalidStatus";
    },
    {
      code: 23;
      name: "InvalidInstruction";
      msg: "Invalid instruction";
    },
    {
      code: 24;
      name: "WrongAccountsNumber";
      msg: "Wrong accounts number";
    },
    {
      code: 25;
      name: "WithdrawTransferBusy";
      msg: "Withdraw_transfer is busy";
    },
    {
      code: 26;
      name: "WithdrawQueueFull";
      msg: "WithdrawQueue is full";
    },
    {
      code: 27;
      name: "WithdrawQueueEmpty";
      msg: "WithdrawQueue is empty";
    },
    {
      code: 28;
      name: "InvalidParamsSet";
      msg: "Params Set is invalid";
    },
    {
      code: 29;
      name: "InvalidInput";
      msg: "InvalidInput";
    },
    {
      code: 30;
      name: "ExceededSlippage";
      msg: "instruction exceeds desired slippage limit";
    },
    {
      code: 31;
      name: "CalculationExRateFailure";
      msg: "CalculationExRateFailure";
    },
    {
      code: 32;
      name: "CheckedSubOverflow";
      msg: "Checked_Sub Overflow";
    },
    {
      code: 33;
      name: "CheckedAddOverflow";
      msg: "Checked_Add Overflow";
    },
    {
      code: 34;
      name: "CheckedMulOverflow";
      msg: "Checked_Mul Overflow";
    },
    {
      code: 35;
      name: "CheckedDivOverflow";
      msg: "Checked_Div Overflow";
    },
    {
      code: 36;
      name: "CheckedEmptyFunds";
      msg: "Empty Funds";
    },
    {
      code: 37;
      name: "CalcPnlError";
      msg: "Calc pnl error";
    },
    {
      code: 38;
      name: "InvalidSplTokenProgram";
      msg: "InvalidSplTokenProgram";
    },
    {
      code: 39;
      name: "TakePnlError";
      msg: "Take Pnl error";
    },
    {
      code: 40;
      name: "InsufficientFunds";
      msg: "Insufficient funds";
    },
    {
      code: 41;
      name: "ConversionFailure";
      msg: "Conversion to u64 failed with an overflow or underflow";
    },
    {
      code: 42;
      name: "InvalidUserToken";
      msg: "user token input does not match amm";
    },
    {
      code: 43;
      name: "InvalidSrmMint";
      msg: "InvalidSrmMint";
    },
    {
      code: 44;
      name: "InvalidSrmToken";
      msg: "InvalidSrmToken";
    },
    {
      code: 45;
      name: "TooManyOpenOrders";
      msg: "TooManyOpenOrders";
    },
    {
      code: 46;
      name: "OrderAtSlotIsPlaced";
      msg: "OrderAtSlotIsPlaced";
    },
    {
      code: 47;
      name: "InvalidSysProgramAddress";
      msg: "InvalidSysProgramAddress";
    },
    {
      code: 48;
      name: "InvalidFee";
      msg: "The provided fee does not match the program owner's constraints";
    },
    {
      code: 49;
      name: "RepeatCreateAmm";
      msg: "Repeat create amm about market";
    },
    {
      code: 50;
      name: "NotAllowZeroLP";
      msg: "Not allow Zero LP";
    },
    {
      code: 51;
      name: "InvalidCloseAuthority";
      msg: "Token account has a close authority";
    },
    {
      code: 52;
      name: "InvalidFreezeAuthority";
      msg: "Pool token mint has a freeze authority";
    },
    {
      code: 53;
      name: "InvalidReferPCMint";
      msg: "InvalidReferPCMint";
    },
    {
      code: 54;
      name: "InvalidConfigAccount";
      msg: "InvalidConfigAccount";
    },
    {
      code: 55;
      name: "RepeatCreateConfigAccount";
      msg: "Repeat create staking config account";
    },
    {
      code: 56;
      name: "UnknownAmmError";
      msg: "Unknown Amm Error";
    }
  ];
};

export default {
  version: "0.3.0",
  name: "raydium_amm",
  instructions: [
    {
      name: "swapBaseIn",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false,
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false,
        },
        {
          name: "uerSourceTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "uerDestinationTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userSourceOwner",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "amountIn",
          type: "u64",
        },
        {
          name: "minimumAmountOut",
          type: "u64",
        },
      ],
    },
    {
      name: "preInitialize",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "lpMintAddress",
          isMut: true,
          isSigner: false,
        },
        {
          name: "coinMintAddress",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pcMintAddress",
          isMut: false,
          isSigner: false,
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolTempLpTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false,
        },
        {
          name: "userWallet",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "nonce",
          type: "u8",
        },
      ],
    },
    {
      name: "swapBaseOut",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false,
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false,
        },
        {
          name: "uerSourceTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "uerDestinationTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userSourceOwner",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "maxAmountIn",
          type: "u64",
        },
        {
          name: "amountOut",
          type: "u64",
        },
      ],
    },
  ],
  accounts: [],
  types: [
    {
      name: "SwapInstructionBaseIn",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amountIn",
            type: "u64",
          },
          {
            name: "minimumAmountOut",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "SwapInstructionBaseOut",
      type: {
        kind: "struct",
        fields: [
          {
            name: "maxAmountIn",
            type: "u64",
          },
          {
            name: "amountOut",
            type: "u64",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 0,
      name: "AlreadyInUse",
      msg: "AlreadyInUse",
    },
    {
      code: 1,
      name: "InvalidProgramAddress",
      msg: "InvalidProgramAddress",
    },
    {
      code: 2,
      name: "ExpectedMint",
      msg: "ExpectedMint",
    },
    {
      code: 3,
      name: "ExpectedAccount",
      msg: "ExpectedAccount",
    },
    {
      code: 4,
      name: "InvalidCoinVault",
      msg: "InvalidCoinVault",
    },
    {
      code: 5,
      name: "InvalidPCVault",
      msg: "InvalidPCVault",
    },
    {
      code: 6,
      name: "InvalidTokenLP",
      msg: "InvalidTokenLP",
    },
    {
      code: 7,
      name: "InvalidDestTokenCoin",
      msg: "InvalidDestTokenCoin",
    },
    {
      code: 8,
      name: "InvalidDestTokenPC",
      msg: "InvalidDestTokenPC",
    },
    {
      code: 9,
      name: "InvalidPoolMint",
      msg: "InvalidPoolMint",
    },
    {
      code: 10,
      name: "InvalidOpenOrders",
      msg: "InvalidOpenOrders",
    },
    {
      code: 11,
      name: "InvalidSerumMarket",
      msg: "InvalidSerumMarket",
    },
    {
      code: 12,
      name: "InvalidSerumProgram",
      msg: "InvalidSerumProgram",
    },
    {
      code: 13,
      name: "InvalidTargetOrders",
      msg: "InvalidTargetOrders",
    },
    {
      code: 14,
      name: "InvalidWithdrawQueue",
      msg: "InvalidWithdrawQueue",
    },
    {
      code: 15,
      name: "InvalidTempLp",
      msg: "InvalidTempLp",
    },
    {
      code: 16,
      name: "InvalidCoinMint",
      msg: "InvalidCoinMint",
    },
    {
      code: 17,
      name: "InvalidPCMint",
      msg: "InvalidPCMint",
    },
    {
      code: 18,
      name: "InvalidOwner",
      msg: "InvalidOwner",
    },
    {
      code: 19,
      name: "InvalidSupply",
      msg: "InvalidSupply",
    },
    {
      code: 20,
      name: "InvalidDelegate",
      msg: "InvalidDelegate",
    },
    {
      code: 21,
      name: "InvalidSignAccount",
      msg: "Invalid Sign Account",
    },
    {
      code: 22,
      name: "InvalidStatus",
      msg: "InvalidStatus",
    },
    {
      code: 23,
      name: "InvalidInstruction",
      msg: "Invalid instruction",
    },
    {
      code: 24,
      name: "WrongAccountsNumber",
      msg: "Wrong accounts number",
    },
    {
      code: 25,
      name: "WithdrawTransferBusy",
      msg: "Withdraw_transfer is busy",
    },
    {
      code: 26,
      name: "WithdrawQueueFull",
      msg: "WithdrawQueue is full",
    },
    {
      code: 27,
      name: "WithdrawQueueEmpty",
      msg: "WithdrawQueue is empty",
    },
    {
      code: 28,
      name: "InvalidParamsSet",
      msg: "Params Set is invalid",
    },
    {
      code: 29,
      name: "InvalidInput",
      msg: "InvalidInput",
    },
    {
      code: 30,
      name: "ExceededSlippage",
      msg: "instruction exceeds desired slippage limit",
    },
    {
      code: 31,
      name: "CalculationExRateFailure",
      msg: "CalculationExRateFailure",
    },
    {
      code: 32,
      name: "CheckedSubOverflow",
      msg: "Checked_Sub Overflow",
    },
    {
      code: 33,
      name: "CheckedAddOverflow",
      msg: "Checked_Add Overflow",
    },
    {
      code: 34,
      name: "CheckedMulOverflow",
      msg: "Checked_Mul Overflow",
    },
    {
      code: 35,
      name: "CheckedDivOverflow",
      msg: "Checked_Div Overflow",
    },
    {
      code: 36,
      name: "CheckedEmptyFunds",
      msg: "Empty Funds",
    },
    {
      code: 37,
      name: "CalcPnlError",
      msg: "Calc pnl error",
    },
    {
      code: 38,
      name: "InvalidSplTokenProgram",
      msg: "InvalidSplTokenProgram",
    },
    {
      code: 39,
      name: "TakePnlError",
      msg: "Take Pnl error",
    },
    {
      code: 40,
      name: "InsufficientFunds",
      msg: "Insufficient funds",
    },
    {
      code: 41,
      name: "ConversionFailure",
      msg: "Conversion to u64 failed with an overflow or underflow",
    },
    {
      code: 42,
      name: "InvalidUserToken",
      msg: "user token input does not match amm",
    },
    {
      code: 43,
      name: "InvalidSrmMint",
      msg: "InvalidSrmMint",
    },
    {
      code: 44,
      name: "InvalidSrmToken",
      msg: "InvalidSrmToken",
    },
    {
      code: 45,
      name: "TooManyOpenOrders",
      msg: "TooManyOpenOrders",
    },
    {
      code: 46,
      name: "OrderAtSlotIsPlaced",
      msg: "OrderAtSlotIsPlaced",
    },
    {
      code: 47,
      name: "InvalidSysProgramAddress",
      msg: "InvalidSysProgramAddress",
    },
    {
      code: 48,
      name: "InvalidFee",
      msg: "The provided fee does not match the program owner's constraints",
    },
    {
      code: 49,
      name: "RepeatCreateAmm",
      msg: "Repeat create amm about market",
    },
    {
      code: 50,
      name: "NotAllowZeroLP",
      msg: "Not allow Zero LP",
    },
    {
      code: 51,
      name: "InvalidCloseAuthority",
      msg: "Token account has a close authority",
    },
    {
      code: 52,
      name: "InvalidFreezeAuthority",
      msg: "Pool token mint has a freeze authority",
    },
    {
      code: 53,
      name: "InvalidReferPCMint",
      msg: "InvalidReferPCMint",
    },
    {
      code: 54,
      name: "InvalidConfigAccount",
      msg: "InvalidConfigAccount",
    },
    {
      code: 55,
      name: "RepeatCreateConfigAccount",
      msg: "Repeat create staking config account",
    },
    {
      code: 56,
      name: "UnknownAmmError",
      msg: "Unknown Amm Error",
    },
  ],
} as RaydiumIDL;
