const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ObjectId } = require("mongodb");

dotenv.config({ path: path.join(__dirname, ".env") });

const { connectToMongo, getDb } = require("./db");
const { getBrandStats } = require("./analyzers/brandStats");
const { getConversationHealth } = require("./analyzers/conversation");
const { getTopicAnalysis } = require("./analyzers/topics");
const { getEngagementStats } = require("./analyzers/engagement");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use("/static", express.static(FRONTEND_DIR));
app.use(express.static(FRONTEND_DIR));
app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

function maybeObjectId(value) {
  if (!value || !ObjectId.isValid(value)) return value;
  return new ObjectId(value);
}

app.get("/api/health", async (_req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });
    const conversationsInDB = await db.collection("conversations").countDocuments({});
    const messagesInDB = await db.collection("messages").countDocuments({});
    res.json({ status: "ok", conversationsInDB, messagesInDB });
  } catch (err) {
    res.status(503).json({ detail: err.message });
  }
});

app.get("/api/brands", async (_req, res) => {
  res.json(await getBrandStats());
});

app.get("/api/health/conversations", async (_req, res) => {
  res.json(await getConversationHealth());
});

app.get("/api/topics", async (_req, res) => {
  res.json(await getTopicAnalysis());
});

app.get("/api/engagement", async (_req, res) => {
  res.json(await getEngagementStats());
});

app.get("/api/insights", async (_req, res) => {
  const [brands, conversationHealth, topics, engagement] = await Promise.all([
    getBrandStats(),
    getConversationHealth(),
    getTopicAnalysis(),
    getEngagementStats(),
  ]);

  res.json({ brands, conversationHealth, topics, engagement });
});

app.get("/api/conversations", async (req, res) => {
  const db = getDb();
  const widgetId = req.query.widget_id;
  const limit = Number(req.query.limit || 20);
  const skip = Number(req.query.skip || 0);

  const query = {};
  if (widgetId) query.widgetId = maybeObjectId(widgetId);

  const conversations = await db
    .collection("conversations")
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const normalized = conversations.map((c) => ({
    ...c,
    _id: String(c._id),
    widgetId: String(c.widgetId),
  }));

  const total = await db.collection("conversations").countDocuments(query);
  res.json({ total, conversations: normalized });
});

app.get("/api/conversations/:conversationId/messages", async (req, res) => {
  const db = getDb();
  const conversationId = req.params.conversationId;

  const idFilter = maybeObjectId(conversationId);
  const query =
    typeof idFilter === "string"
      ? { conversationId: idFilter }
      : { conversationId: { $in: [idFilter, conversationId] } };

  const messages = await db
    .collection("messages")
    .find(query)
    .sort({ timestamp: 1 })
    .toArray();

  res.json({
    messages: messages.map((m) => ({
      ...m,
      _id: String(m._id),
      conversationId: String(m.conversationId),
    })),
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ detail: err.message || "Unexpected server error" });
});

async function start() {
  await connectToMongo();
  app.listen(PORT, () => {
    console.log(`MERN backend running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
