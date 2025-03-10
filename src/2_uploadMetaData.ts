import { readFileSync } from "node:fs";

const name = "Bundler";
const symbol = "BUND";

const upload = async () => {
  const file = readFileSync("logo.png");
  const form = new FormData();

  form.append("file", new Blob([file], { type: "image/png" })),
    form.append("name", name),
    form.append("symbol", symbol),
    form.append("description", "Bundler is building"),
    form.append("twitter", ""),
    form.append("telegram", ""),
    form.append("website", "https://github.com"),
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

const uploadMetaData = async () => {
  const uri = await upload();
};

uploadMetaData();
