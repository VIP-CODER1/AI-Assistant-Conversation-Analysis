const { getDb } = require("../db");

function extractProductsFromAgentText(text) {
  const marker = "End of stream";
  const idx = String(text || "").indexOf(marker);
  if (idx === -1) return [];

  const jsonStr = String(text).slice(idx + marker.length).trim();
  try {
    const data = JSON.parse(jsonStr);
    const products = data?.data?.products || [];
    return products.map((p) => ({
      handle: p.handle || "",
      title: p.title || "",
      price: p.price || "",
    }));
  } catch {
    return [];
  }
}

async function getEngagementStats() {
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
      { conversationId: { $in: convIds } },
      {
        projection: {
          conversationId: 1,
          sender: 1,
          messageType: 1,
          text: 1,
          metadata: 1,
        },
      }
    )
    .toArray();

  const eventCounts = new Map();
  const eventByBrand = new Map();
  const productSuggestions = new Map();

  let noProductReplies = 0;
  let totalAgentReplies = 0;

  function bump(map, key, by = 1) {
    map.set(key, (map.get(key) || 0) + by);
  }

  for (const m of allMsgs) {
    const wid = convWidget.get(String(m.conversationId)) || "unknown";

    if (m.messageType === "event") {
      const eventType = m.metadata?.eventType || "unknown";
      bump(eventCounts, eventType);

      if (!eventByBrand.has(wid)) eventByBrand.set(wid, new Map());
      bump(eventByBrand.get(wid), eventType);
      continue;
    }

    if (m.messageType === "text" && m.sender === "agent") {
      totalAgentReplies += 1;
      const products = extractProductsFromAgentText(m.text);
      if (!products.length) noProductReplies += 1;

      for (const p of products) {
        if (!p.handle) continue;
        bump(productSuggestions, p.handle);
      }
    }
  }

  const noProductRate = totalAgentReplies
    ? Number(((noProductReplies / totalAgentReplies) * 100).toFixed(1))
    : 0;

  return {
    eventTypeCounts: [...eventCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([event, count]) => ({ event, count })),
    eventsByBrand: Object.fromEntries(
      [...eventByBrand.entries()].map(([wid, events]) => [
        wid,
        [...events.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([event, count]) => ({ event, count })),
      ])
    ),
    topSuggestedProducts: [...productSuggestions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([handle, count]) => ({ handle, count })),
    totalAgentReplies,
    repliesWithNoProduct: noProductReplies,
    noProductRate,
  };
}

module.exports = {
  getEngagementStats,
};
