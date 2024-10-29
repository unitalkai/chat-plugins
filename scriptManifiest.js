import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const outputDir = path.join(__dirname, "scripted");

// Helper function to download JSON and images
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filePath);
          response.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close(resolve);
          });
        } else {
          reject(
            `Failed to download file from ${url} (status code: ${response.statusCode})`
          );
        }
      })
      .on("error", reject);
  });
}

// Function to process each JSON file
async function processFile(filePath) {
  try {
    const fileData = fs.readFileSync(filePath, "utf8");
    const jsonContent = JSON.parse(fileData);
    const {
      manifest,
      meta: { avatar },
    } = jsonContent;
    const identifier = jsonContent.identifier;

    const folderName = path.basename(filePath, ".json");
    const fileDir = path.join(outputDir, folderName);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Download manifest JSON
    const manifestPath = path.join(fileDir, "manifest.json");
    const manifestData = await new Promise((resolve, reject) => {
      https
        .get(manifest, (response) => {
          if (response.statusCode === 200) {
            let data = "";
            response.on("data", (chunk) => {
              data += chunk;
            });
            response.on("end", () => resolve(data));
          } else {
            reject(
              `Failed to download manifest from ${manifest} (status code: ${response.statusCode})`
            );
          }
        })
        .on("error", reject);
    });
    fs.writeFileSync(manifestPath, manifestData, "utf8");

    // Download avatar image
    const avatarExt = path.extname(new URL(avatar).pathname);
    const avatarPath = path.join(fileDir, `avatar${avatarExt}`);
    await downloadFile(avatar, avatarPath);

    console.log(`Processed ${identifier} successfully`);
  } catch (error) {
    console.error(`Failed to process ${filePath}:`, error);
  }
}

// Main function to process all JSON files in `src`
async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const files = fs.readdirSync(srcDir).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(srcDir, file);
    await processFile(filePath);
  }

  console.log("All files processed");
}

main().catch(console.error);
