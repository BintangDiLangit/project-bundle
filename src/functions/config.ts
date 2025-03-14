import fs from "fs";
import path from "path";
import readline from "readline";

const CONFIG_PATH = path.join(__dirname, "../../data/config.json");

interface Config {
  PK_FOUNDER: string;
  PK_DEV: string;
  RPC_URL: string;
  RPC_WSS: string;
}

/**
 * Reads the current configuration from config.json.
 * @returns {Config} The configuration object.
 */
export function getConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(configData) as Config;
    }
  } catch (error) {
    console.error("Error reading config:", error);
  }
  return { PK_FOUNDER: "", PK_DEV: "", RPC_URL: "", RPC_WSS: "" };
}

/**
 * Updates the configuration while ensuring only allowed fields are modified.
 * @param {Partial<Config>} updates - The new values to update in the configuration.
 */
export function updateConfig(updates: Partial<Config>) {
  try {
    const currentConfig = getConfig();
    const newConfig = { ...currentConfig, ...updates };

    // Ensure only the allowed fields are updated
    const allowedFields: (keyof Config)[] = ["PK_FOUNDER", "PK_DEV", "RPC_URL"];
    Object.keys(newConfig).forEach((key) => {
      if (!allowedFields.includes(key as keyof Config)) {
        throw new Error(`Invalid configuration key: ${key}`);
      }
    });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    console.log("Configuration updated successfully.");
  } catch (error) {
    console.error("Error updating config:", error);
  }
}

/**
 * CLI input handling for updating config.
 */
async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function cliInputConfig() {
  console.log("Enter new configuration values:");

  const PK_FOUNDER =
    process.argv[2] || (await askQuestion("Enter PK_FOUNDER: "));
  const PK_DEV = process.argv[3] || (await askQuestion("Enter PK_DEV: "));
  const RPC_URL = process.argv[4] || (await askQuestion("Enter RPC_URL: "));

  updateConfig({ PK_FOUNDER, PK_DEV, RPC_URL });
}

if (require.main === module) {
  cliInputConfig();
}
