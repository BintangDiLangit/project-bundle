import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "path";

const name = "Bundler2";
const symbol = "BUND2";
const METADATA_PATH = path.join(__dirname, "../../data/metadata.json");

const upload = async () => {
  const LOGO_PATH = path.join(__dirname, "..", "..", "public", "logo.png");

  const file = readFileSync(LOGO_PATH);

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
      const fileContent = readFileSync(METADATA_PATH, "utf-8").trim();
      if (fileContent) {
        metadata = JSON.parse(fileContent);
        if (!Array.isArray(metadata)) {
          console.error("Invalid metadata format, initializing new array.");
          metadata = [];
        }
      } else {
        console.warn(
          "metadata.json is empty, initializing new metadata array."
        );
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
    const fileContent = readFileSync(METADATA_PATH, "utf-8").trim();
    if (!fileContent) {
      console.warn("metadata.json is empty, returning empty array.");
      return [];
    }
    const metadata = JSON.parse(fileContent);
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

uploadMetaData();
