const fs = require("node:fs/promises");
const path = require("node:path");
const { EJSON } = require("bson");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const { connectToMongo, closeMongo } = require("./db");

const DATA_DIR = path.join(__dirname, "..");

async function loadJsonArray(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return EJSON.parse(raw);
}

async function importData() {
  const db = await connectToMongo();

  const collections = [
    ["conversations", "conversations.json"],
    ["messages", "messages.json"],
  ];

  for (const [collectionName, filename] of collections) {
    const filePath = path.join(DATA_DIR, filename);

    try {
      await fs.access(filePath);
    } catch {
      console.error(`File not found: ${filePath}`);
      process.exitCode = 1;
      return;
    }

    const collection = db.collection(collectionName);
    const existing = await collection.countDocuments({});
    if (existing > 0) {
      console.log(`Skipping '${collectionName}' import. Collection already has ${existing} docs.`);
      continue;
    }

    const records = await loadJsonArray(filePath);
    if (!Array.isArray(records)) {
      throw new Error(`${filename} must contain a JSON array.`);
    }

    if (records.length > 0) {
      await collection.insertMany(records);
    }
    console.log(`Imported ${records.length} docs into '${collectionName}'.`);
  }

  const convCount = await db.collection("conversations").countDocuments({});
  const msgCount = await db.collection("messages").countDocuments({});
  console.log(`Final counts -> conversations: ${convCount}, messages: ${msgCount}`);
}

importData()
  .catch((err) => {
    console.error("Import failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongo();
  });
