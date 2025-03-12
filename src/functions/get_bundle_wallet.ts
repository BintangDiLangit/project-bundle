import fs from "fs";
import path from "path";

const WALLETS_PATH = path.join(__dirname, "../../data/bundle_wallets.json");

interface BundleWallet {
  public_key: string;
  private_key: string;
}

export function getBundleWallets(): BundleWallet[] {
  try {
    const walletsData = fs.readFileSync(WALLETS_PATH, "utf-8");
    return JSON.parse(walletsData) as BundleWallet[];
  } catch (error) {
    console.error("Error reading wallets:", error);
    return [];
  }
}
