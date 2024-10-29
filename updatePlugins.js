import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folderPath = path.join(__dirname, "src");
const processJsonFiles = () => {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return console.error("Error reading folder:", err);
    }

    const jsonFiles = files.filter((file) => path.extname(file) === ".json");

    jsonFiles.forEach((file) => {
      const filePath = path.join(folderPath, file);

      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          return console.error("Error reading file:", err);
        }

        let jsonContent;
        try {
          jsonContent = JSON.parse(data);
        } catch (error) {
          return console.error("Error parsing JSON:", error);
        }

        if (jsonContent.meta) {
          jsonContent.meta.featured = false;
        } else {
          jsonContent.meta = { featured: false };
        }

        const updatedJsonContent = JSON.stringify(jsonContent, null, 2);
        fs.writeFile(filePath, updatedJsonContent, "utf8", (err) => {
          if (err) {
            return console.error("Error writing file:", err);
          }
          console.log(`File ${file} updated successfully!`);
        });
      });
    });
  });
};

processJsonFiles();
