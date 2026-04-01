const { getDb } = require("../db");

const FRUSTRATION_KEYWORDS = [
  "not working",
  "doesn't work",
  "wrong",
  "incorrect",
  "bad",
  "terrible",
  "useless",
  "broken",
  "frustrated",
  "frustrating",
  "still not",
  "didn't help",
  "no help",
  "disappointed",
  "waste",
  "refund",
  "cancel",
  "give up",
  "not helpful",
  "never",
];

function stripStreamJson(text) {
  const marker = "End of stream";
  const idx = String(text || "").indexOf(marker);
  if (idx !== -1) {
    return String(text).slice(0, idx).trim();
  }
  return String(text || "").trim();
}

function toHourUtc(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCHours();
}

async function getConversationHealth() {
  const db = getDb();
  const conversations = db.collection("conversations");
  const messages = db.collection("messages");

  const allConvs = await conversations
    .find({}, { projection: { _id: 1, widgetId: 1 } })
    .toArray();

  const convIds = allConvs.map((c) => c._id);
  const convById = new Map(allConvs.map((c) => [String(c._id), String(c.widgetId)]));

  const allMsgs = await messages
    .find(
      { conversationId: { $in: convIds } },
      {
        projection: {
          conversationId: 1,
          sender: 1,
          messageType: 1,
          text: 1,
          timestamp: 1,
        },
      }
    )
    .toArray();

  const msgGroups = new Map();
  for (const m of allMsgs) {
    const cid = String(m.conversationId);
    if (!msgGroups.has(cid)) msgGroups.set(cid, []);
    msgGroups.get(cid).push(m);
  }

  for (const msgs of msgGroups.values()) {
    msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  let singleTurn = 0;
  let unanswered = 0;
  let frustrated = 0;
  const frustrationExamples = [];
  const responseLengths = [];
  const hourCounts = new Array(24).fill(0);

  const perBrand = new Map();
  function ensureBrand(wid) {
    if (!perBrand.has(wid)) {
      perBrand.set(wid, { total: 0, singleTurn: 0, unanswered: 0, frustrated: 0 });
    }
    return perBrand.get(wid);
  }

  for (const conv of allConvs) {
    const cid = String(conv._id);
    const wid = String(conv.widgetId);
    const msgs = msgGroups.get(cid) || [];

    const brandMetrics = ensureBrand(wid);
    brandMetrics.total += 1;

    const textMsgs = msgs.filter((m) => m.messageType === "text");
    const userMsgs = textMsgs.filter((m) => m.sender === "user");
    const agentMsgs = textMsgs.filter((m) => m.sender === "agent");

    if (userMsgs.length === 1 && agentMsgs.length === 0) {
      singleTurn += 1;
      brandMetrics.singleTurn += 1;
    }

    if (textMsgs.length > 0 && textMsgs[textMsgs.length - 1].sender === "user") {
      unanswered += 1;
      brandMetrics.unanswered += 1;
    }

    for (const m of agentMsgs) {
      responseLengths.push(stripStreamJson(m.text).length);
    }

    let convFrustrated = false;
    for (const m of userMsgs) {
      const text = String(m.text || "").toLowerCase();
      const kw = FRUSTRATION_KEYWORDS.find((k) => text.includes(k));
      if (kw) {
        convFrustrated = true;
        if (frustrationExamples.length < 10) {
          frustrationExamples.push({
            conversationId: cid,
            widgetId: wid,
            text: String(m.text || "").slice(0, 200),
            keyword: kw,
          });
        }
      }

      const hour = toHourUtc(m.timestamp);
      if (hour !== null) hourCounts[hour] += 1;
    }

    if (convFrustrated) {
      frustrated += 1;
      brandMetrics.frustrated += 1;
    }
  }

  const totalConversations = allConvs.length;
  const avgAgentResponseLength = responseLengths.length
    ? Math.round(responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length)
    : 0;

  const responseLengthDistribution = {
    "<100": 0,
    "100-300": 0,
    "300-600": 0,
    "600-1000": 0,
    ">1000": 0,
  };

  for (const length of responseLengths) {
    if (length < 100) responseLengthDistribution["<100"] += 1;
    else if (length < 300) responseLengthDistribution["100-300"] += 1;
    else if (length < 600) responseLengthDistribution["300-600"] += 1;
    else if (length < 1000) responseLengthDistribution["600-1000"] += 1;
    else responseLengthDistribution[">1000"] += 1;
  }

  const perBrandObj = {};
  for (const [wid, data] of perBrand.entries()) {
    const total = data.total || 0;
    perBrandObj[wid] = {
      ...data,
      singleTurnRate: total ? Number(((data.singleTurn / total) * 100).toFixed(1)) : 0,
      unansweredRate: total ? Number(((data.unanswered / total) * 100).toFixed(1)) : 0,
      frustrationRate: total ? Number(((data.frustrated / total) * 100).toFixed(1)) : 0,
    };
  }

  return {
    totalConversations,
    singleTurnDropOff: singleTurn,
    singleTurnDropOffRate: totalConversations
      ? Number(((singleTurn / totalConversations) * 100).toFixed(1))
      : 0,
    unansweredConversations: unanswered,
    unansweredRate: totalConversations
      ? Number(((unanswered / totalConversations) * 100).toFixed(1))
      : 0,
    frustratedConversations: frustrated,
    frustrationRate: totalConversations
      ? Number(((frustrated / totalConversations) * 100).toFixed(1))
      : 0,
    avgAgentResponseLength,
    responseLengthDistribution,
    peakHours: hourCounts.map((count, hour) => ({ hour, count })),
    frustrationExamples,
    perBrand: perBrandObj,
  };
}

module.exports = {
  getConversationHealth,
};
