const { getDb } = require("../db");

const TOPIC_PATTERNS = {
  "Product Ingredients": [
    "ingredient",
    "herb",
    "contain",
    "made of",
    "formula",
    "chemical",
    "natural",
  ],
  "Skin Concerns": [
    "acne",
    "oily skin",
    "dry skin",
    "sensitive",
    "dark spot",
    "pigmentation",
    "glowing",
    "brightening",
    "tan",
    "wrinkle",
    "anti-aging",
  ],
  "Usage & How-to": [
    "how to use",
    "how do i",
    "how often",
    "apply",
    "routine",
    "step",
    "morning",
    "night",
    "before",
    "after",
  ],
  "Product Availability": [
    "available",
    "in stock",
    "out of stock",
    "when",
    "restock",
    "buy",
    "where to get",
  ],
  "Pricing & Offers": [
    "price",
    "cost",
    "discount",
    "offer",
    "coupon",
    "deal",
    "cheap",
    "expensive",
    "worth",
  ],
  "Shipping & Orders": [
    "shipping",
    "delivery",
    "order",
    "track",
    "dispatch",
    "return",
    "refund",
    "cancel",
    "paid",
  ],
  "Product Comparison": [
    "vs",
    "versus",
    "difference",
    "better",
    "compare",
    "which one",
    "best for",
    "recommend",
  ],
  "Side Effects & Safety": [
    "safe",
    "side effect",
    "allergy",
    "reaction",
    "irritation",
    "harm",
    "danger",
    "pregnant",
    "child",
  ],
  "Size & Variants": [
    "size",
    "ml",
    "variant",
    "30ml",
    "10ml",
    "combo",
    "pack",
    "quantity",
  ],
  "General Enquiry": [],
};

function detectTopics(text) {
  const lower = String(text || "").toLowerCase();
  const matched = [];

  for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
    if (topic === "General Enquiry") continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(topic);
    }
  }

  return matched.length ? matched : ["General Enquiry"];
}

async function getTopicAnalysis() {
  const db = getDb();
  const conversations = db.collection("conversations");
  const messages = db.collection("messages");

  const convs = await conversations
    .find({}, { projection: { _id: 1, widgetId: 1 } })
    .toArray();
  const convWidget = new Map(convs.map((c) => [String(c._id), String(c.widgetId)]));
  const convIds = convs.map((c) => c._id);

  const allMsgs = await messages
    .find(
      {
        conversationId: { $in: convIds },
        messageType: "text",
      },
      {
        projection: {
          conversationId: 1,
          sender: 1,
          text: 1,
          timestamp: 1,
        },
      }
    )
    .toArray();

  const convMessages = new Map();
  for (const msg of allMsgs) {
    const cid = String(msg.conversationId);
    if (!convMessages.has(cid)) convMessages.set(cid, []);
    convMessages.get(cid).push(msg);
  }

  for (const msgs of convMessages.values()) {
    msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  const topicCounts = new Map();
  const unansweredTopics = new Map();
  const topicByBrand = new Map();

  function bump(map, key, by = 1) {
    map.set(key, (map.get(key) || 0) + by);
  }

  for (const [cid, msgs] of convMessages.entries()) {
    const wid = convWidget.get(cid) || "unknown";
    if (!topicByBrand.has(wid)) topicByBrand.set(wid, new Map());

    for (let i = 0; i < msgs.length; i += 1) {
      const m = msgs[i];
      if (m.sender !== "user") continue;

      const topics = detectTopics(m.text);
      topics.forEach((topic) => {
        bump(topicCounts, topic);
        bump(topicByBrand.get(wid), topic);
      });

      const hasReply = msgs.slice(i + 1).some((nm) => nm.sender === "agent");
      if (!hasReply) {
        topics.forEach((topic) => bump(unansweredTopics, topic));
      }
    }
  }

  return {
    topicFrequency: [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count })),
    unansweredTopics: [...unansweredTopics.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count })),
    topicsByBrand: Object.fromEntries(
      [...topicByBrand.entries()].map(([wid, topics]) => [
        wid,
        [...topics.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([topic, count]) => ({ topic, count })),
      ])
    ),
  };
}

module.exports = {
  getTopicAnalysis,
};
