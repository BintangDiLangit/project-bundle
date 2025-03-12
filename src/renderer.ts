import { generateAndFundWallets } from "./functions/1_generate_fresh_wallet";

document.getElementById("generate")!.addEventListener("click", async () => {
  const params = {
    fundingSecret: process.env.DEV_WALLET!,
    amountSol: 0,
    count: 1,
  };

  await generateAndFundWallets(params);
  document.getElementById("output")!.textContent = "Wallet generated!";
});
