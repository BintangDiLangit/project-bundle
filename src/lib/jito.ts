import { Finality, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { sleep, sleepUntil } from "./utils";

export default class Jito {
  protected id = 1;
  protected tipAccounts: PublicKey[] = [];
  protected queue = 0;
  protected interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected endpoint: string = "https://mainnet.block-engine.jito.wtf/api/v1",
    protected transactionPerSecond = 5
  ) {
    this.interval = setInterval(() => {
      this.queue = 0;
    }, 1000);
  }

  public async shutdown() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  protected async send<R>(path: string, method: string, params: any = []) {
    await sleepUntil(() => this.queue < this.transactionPerSecond);

    this.queue++;

    const url = new URL(`${this.endpoint}/${path}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: this.id++,
        jsonrpc: "2.0",
        method,
        params,
      }),
    });

    return response.json() as Promise<{
      id: number;
      result: R;
    }>;
  }

  async fetchTipAccounts() {
    const { result } = await this.send<string[]>("bundles", "getTipAccounts");

    this.tipAccounts = result.map((r) => new PublicKey(r));
  }

  getTipAccounts() {
    return this.tipAccounts;
  }

  getRandomTipAccount() {
    const accounts = this.getTipAccounts();
    const index = Math.round(Math.random() * (accounts.length - 2));

    return accounts[index];
  }

  async transaction(transaction: VersionedTransaction) {
    const response = await this.send<string>(
      "transactions",
      "sendTransaction",
      [
        Buffer.from(transaction.serialize()).toString("base64"),
        {
          encoding: "base64",
        },
      ]
    );

    if (!response.result) {
      throw new Error(JSON.stringify(response));
    }

    return response.result;
  }

  async bundles(transactions: VersionedTransaction[]) {
    const id = [];

    for (let i = 0; i < transactions.length; i += 5) {
      const batches = transactions.slice(i, i + 5);
      const response = await this.send<string>("bundles", "sendBundle", [
        batches.map((transaction) => {
          return Buffer.from(transaction.serialize()).toString("base64");
        }),
        {
          encoding: "base64",
        },
      ]);

      if (!response.result) {
        throw new Error(JSON.stringify(response));
      }

      id.push(response.result);
    }

    return id;
  }

  async getBundleStatuses(id: string[]) {
    const { result } = await this.send<{
      context: {
        slot: number;
      };
      value: {
        bundle_id: string;
        transactions: string[];
        slot: number;
        confirmation_status: Finality;
        err: {};
      }[];
    }>("bundles", "getBundleStatuses", [id]);

    return result;
  }

  async getInflightBundleStatuses(id: string[]) {
    const { result } = await this.send<{
      context: {
        slot: number;
      };
      value: {
        bundle_id: string;
        status: string;
        landed_slot: number | null;
      }[];
    }>("bundles", "getInflightBundleStatuses", [id]);

    return result;
  }

  async confirms(id: string[]) {
    const confirmations = new Set<string>();
    const interval = 1000;

    for (let i = 0; i < 60_000; i += interval) {
      const r = await this.getInflightBundleStatuses(id);

      console.log(r);

      const status = r?.value?.find((v) => id.includes(v.bundle_id));

      if (status) {
        if (
          status.status.toLocaleLowerCase() === "landed" ||
          status.status.toLocaleLowerCase() === "failed"
        ) {
          confirmations.add(status.bundle_id);
        }
      }

      if (confirmations.size === id.length) {
        break;
      }

      await sleep(interval);
    }

    return await this.getBundleStatuses(id);
  }
}
