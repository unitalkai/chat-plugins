import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, "scripted");

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });
          response.on("end", () => resolve(JSON.parse(data)));
        } else {
          reject(
            `Failed to download JSON from ${url} (status code: ${response.statusCode})`
          );
        }
      })
      .on("error", reject);
  });
}

async function processManifest(manifestPath, folderName) {
  try {
    const manifestData = fs.readFileSync(manifestPath, "utf8");
    const manifestJson = JSON.parse(manifestData);

    const apiUrl = manifestJson.api?.url;
    if (!apiUrl) {
      console.error(`No API URL found in manifest at ${manifestPath}`);
      return;
    }

    const infoData = await downloadJson(apiUrl);
    const outputFilePath = path.join(path.dirname(manifestPath), "infos.json");

    fs.writeFileSync(outputFilePath, JSON.stringify(infoData, null, 2), "utf8");

    console.log(`Processed API URL in manifest for ${folderName}`);
  } catch (error) {
    console.error(`Failed to process ${manifestPath}:`, error);
  }
}

async function main() {
  const folders = fs.readdirSync(inputDir).filter((folder) => {
    const manifestPath = path.join(inputDir, folder, "manifest.json");
    return fs.existsSync(manifestPath);
  });

  for (const folder of folders) {
    const manifestPath = path.join(inputDir, folder, "manifest.json");
    await processManifest(manifestPath, folder);
  }

  console.log("All manifests processed");
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch(console.error);
