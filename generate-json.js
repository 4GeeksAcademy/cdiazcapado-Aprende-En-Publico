const fs = require("fs").promises;
const path = require("path");
const jsyaml = require("js-yaml");

// Recursively get all files in a directory
async function walk(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });

  for (const file of list) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      const res = await walk(filePath);
      results = results.concat(res);
    } else {
      results.push(filePath);
    }
  }

  return results;
}

// Load YAML file and return { fileName, yaml } or null on error
async function loadYML(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const yaml = jsyaml.load(content);

    if (!yaml) {
      console.error(`YAML parsing failed for file: ${filePath}`);
      return null;
    }

    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    return { fileName, yaml };
  } catch (error) {
    console.error(`Error loading YAML file "${filePath}":`, error.message);
    return null;
  }
}

// Convert all YAML files to JS objects
async function buildResumesData(filePaths) {
  const results = await Promise.all(filePaths.map(loadYML));
  // Filter out failed parses
  return results.filter(r => r !== null).map(({ yaml }) => ({ ...yaml }));
}

// Write JSON to file
async function createContentJSON(content, fileName) {
  const outputPath = path.join("site", "static");
  try {
    await fs.mkdir(outputPath, { recursive: true });
    const filePath = path.join(outputPath, `${fileName}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    console.log(`Created JSON file: ${filePath}`);
  } catch (error) {
    console.error("Error writing JSON file:", error.message);
  }
}

// Main function
(async () => {
  try {
    const yamlFiles = await walk("site/resumes/");
    const resumes = await buildResumesData(yamlFiles);
    await createContentJSON(resumes, "resumes");
    console.log("All resumes processed successfully.");
  } catch (error) {
    console.error("Error processing resumes:", error.message);
    process.exit(1);
  }
})();
