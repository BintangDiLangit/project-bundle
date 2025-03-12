import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "path";

const name = "Bundler1";
const symbol = "BUND1";
const METADATA_PATH = path.join(__dirname, "../../data/metadata.json");

const upload = async () => {
  const file = readFileSync("../../public/logo.png");

  const form = new FormData();

  form.append("file", new Blob([file], { type: "image/png" }));
  form.append("name", name);
  form.append("symbol", symbol);
  form.append("description", "Bundler is building");
  form.append("twitter", "");
  form.append("telegram", "");
  form.append("website", "https://github.com");
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

export const uploadMetaData = async () => {
  const uri = await upload();
  console.log(uri);

  // Read existing metadata.json or initialize an empty array
  let metadata = [];
  if (existsSync(METADATA_PATH)) {
    try {
      metadata = JSON.parse(readFileSync(METADATA_PATH, "utf-8"));
      if (!Array.isArray(metadata)) {
        metadata = [];
      }
    } catch (error) {
      console.error("Error reading metadata.json, initializing new:", error);
      metadata = [];
    }
  }

  // Append the new metadata entry with name and symbol
  metadata.push({ name, symbol, uri });

  // Write updated metadata back to file
  try {
    writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), "utf-8");
    console.log("Metadata saved to metadata.json");
  } catch (error) {
    console.error("Error writing to metadata.json:", error);
  }
};

export const getUploadedMetadata = (): {
  name: string;
  symbol: string;
  uri: string;
}[] => {
  if (!existsSync(METADATA_PATH)) {
    console.warn("Metadata file not found, returning empty array.");
    return [];
  }

  try {
    const metadata = JSON.parse(readFileSync(METADATA_PATH, "utf-8"));
    if (!Array.isArray(metadata)) {
      console.error("Invalid metadata format, returning empty array.");
      return [];
    }
    return metadata;
  } catch (error) {
    console.error("Error reading metadata.json:", error);
    return [];
  }
};

// uploadMetaData();
