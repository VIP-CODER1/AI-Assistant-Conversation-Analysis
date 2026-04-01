const { getDb } = require("../db");

function buildBrandNames(widgetIds) {
  const sorted = [...widgetIds].sort();
  const map = new Map();
  sorted.forEach((id, idx) => {
    map.set(id, `Brand ${String.fromCharCode(65 + idx)}`);
  });
  return map;
}

async function getBrandStats() {
  const db = getDb();
  const conversations = db.collection("conversations");
  const messages = db.collection("messages");

  const convPerBrand = await conversations
    .aggregate([
      { $group: { _id: "$widgetId", conversationCount: { $sum: 1 } } },
    ])
    .toArray();

  const msgsPerBrand = await messages
    .aggregate([
      {
        $lookup: {
          from: "conversations",
          localField: "conversationId",
          foreignField: "_id",
          as: "conv",
        },
      },
      { $unwind: "$conv" },
      {
        $group: {
          _id: "$conv.widgetId",
          totalMessages: { $sum: 1 },
          userMessages: {
            $sum: { $cond: [{ $eq: ["$sender", "user"] }, 1, 0] },
          },
          agentMessages: {
            $sum: { $cond: [{ $eq: ["$sender", "agent"] }, 1, 0] },
          },
          eventMessages: {
            $sum: { $cond: [{ $eq: ["$messageType", "event"] }, 1, 0] },
          },
        },
      },
    ])
    .toArray();

  const convMap = new Map(
    convPerBrand.map((r) => [String(r._id), r.conversationCount])
  );
  const msgMap = new Map(msgsPerBrand.map((r) => [String(r._id), r]));

  const allWidgetIds = new Set([...convMap.keys(), ...msgMap.keys()]);
  const brandNames = buildBrandNames(allWidgetIds);

  return [...allWidgetIds].sort().map((widgetId) => {
    const conversationCount = convMap.get(widgetId) || 0;
    const msgData = msgMap.get(widgetId) || {};
    const totalMessages = msgData.totalMessages || 0;

    return {
      widgetId,
      brandName: brandNames.get(widgetId) || `Brand ${widgetId.slice(-6)}`,
      conversationCount,
      totalMessages,
      userMessages: msgData.userMessages || 0,
      agentMessages: msgData.agentMessages || 0,
      eventMessages: msgData.eventMessages || 0,
      avgMessagesPerConversation: conversationCount
        ? Number((totalMessages / conversationCount).toFixed(2))
        : 0,
    };
  });
}

module.exports = {
  getBrandStats,
};
