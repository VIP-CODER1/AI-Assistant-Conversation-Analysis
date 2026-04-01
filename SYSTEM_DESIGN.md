# System Design

## 1. Objective
Automate weekly analysis of AI assistant conversations across brands and surface actionable quality and engagement insights.

## 2. Functional Requirements
1. Ingest and analyze conversations and messages from MongoDB.
2. Segment analytics by brand (widgetId).
3. Detect conversation quality patterns: drop-off, unanswered, frustration.
4. Identify common and unanswered user topics.
5. Analyze engagement events and recommendation behavior.
6. Expose insights via API and dashboard.

## 3. Data Model

### conversations
1. _id: ObjectId
2. widgetId: ObjectId
3. createdAt: Date
4. updatedAt: Date

### messages
1. _id: ObjectId
2. conversationId: ObjectId
3. sender: user | agent
4. text: string
5. messageType: text | event
6. metadata.eventType: string (optional)
7. timestamp: Date

Relationship:
1. One conversation has many messages.
2. widgetId maps a conversation to a brand.

## 4. High-Level Architecture

```text
Data Files / Live DB
       |
       v
MongoDB (conversations, messages)
       |
       v
Express API Layer (server.js)
       |
       +--> Analyzer: brandStats.js
       +--> Analyzer: conversation.js
       +--> Analyzer: topics.js
       +--> Analyzer: engagement.js
       |
       v
Aggregated endpoint: /api/insights
       |
       v
Frontend Dashboard (index.html + app.js + styles.css)
```

## 5. Backend Components
1. db.js
   1. Creates and reuses Mongo client connection.
2. server.js
   1. Hosts REST API and static frontend.
   2. Exposes health and analysis endpoints.
3. importData.js
   1. Imports conversations.json and messages.json into MongoDB.
4. analyzers/
   1. brandStats.js: brand-level counts and message splits.
   2. conversation.js: drop-off, unanswered, frustration, response length, peak hours.
   3. topics.js: keyword-driven topic classification and unanswered-topic detection.
   4. engagement.js: event type counts and product suggestion proxies.

## 6. API Design

### GET /api/health
Purpose:
1. Verify DB connectivity.
2. Return conversations/messages document counts.

### GET /api/insights
Purpose:
1. Return all analysis in one payload for dashboard rendering.

Response sections:
1. brands
2. conversationHealth
3. topics
4. engagement

### Supporting endpoints
1. /api/brands
2. /api/health/conversations
3. /api/topics
4. /api/engagement
5. /api/conversations
6. /api/conversations/:id/messages

## 7. Analysis Logic

### Conversation Health
1. Single-turn drop-off:
   1. One user text message and no agent text response.
2. Unanswered:
   1. Last text message in conversation is from user.
3. Frustration signal:
   1. Keyword matching on user text.
4. Response length:
   1. Character length distribution for agent responses.

### Topic Analysis
1. Rule-based keyword classification to predefined topic buckets.
2. Unanswered topic detection by checking if user message has any later agent reply.

### Engagement Analysis
1. Count event types from messageType=event.
2. Parse product metadata from agent message payload (when present).
3. Compute no-product response rate as a hallucination proxy.

## 8. Frontend Design
1. Single-page dashboard with left navigation and section-based views.
2. Each section maps to one insight category.
3. Animated transitions:
   1. Section switch animation
   2. Staggered card reveal
   3. Progressive chart bar fill

## 9. Non-Functional Considerations
1. Performance
   1. Aggregated endpoint minimizes frontend round trips.
2. Maintainability
   1. Analyzer modules keep logic isolated and testable.
3. Scalability
   1. Can cache /api/insights output on schedule for larger datasets.
4. Security
   1. Secrets in .env only.
   2. Avoid broad IP allowlist on Atlas for production.

## 10. Current Limitations
1. Topic classification is keyword-based, not semantic.
2. Hallucination detection is proxy-based, not factual verification.
3. No user auth or RBAC in current dashboard.

## 11. Future Improvements
1. Add LLM-assisted topic clustering and sentiment scoring.
2. Add trend charts (daily/weekly) and anomaly alerts.
3. Add explainability drill-down for each insight.
4. Add test suite for analyzers and API contract validation.
