const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "helio_intern";

let client;
let db;

async function connectToMongo() {
  if (db) return db;

  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("MongoDB not connected. Call connectToMongo() first.");
  }
  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

module.exports = {
  connectToMongo,
  getDb,
  closeMongo,
};
