/* ── AI Conversation Insights Dashboard ─────────────────────────────────── */

const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8000'
  : 'https://ai-assistant-conversation-analysis.onrender.com';

const BRAND_SHORT = {
  '680a0a8b70a26f7a0e24eedd': 'Brand A',
  '69a92ad76dcbf2da868e0f9b': 'Brand B',
  '6983153e1497a62e8542a0ad': 'Brand C',
};

const BRAND_COLORS = ['#6c63ff', '#ff6584', '#00d4aa'];
const TOPIC_COLORS = ['#6c63ff','#00d4aa','#ff6584','#ffd93d','#00b4d8','#ff9a3c','#c77dff','#2ec4b6','#f72585'];

let DATA = {};
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Navigation ─────────────────────────────────────────────────────────── */
const navItems = document.querySelectorAll('.nav-item');

function animateSectionContent(sectionEl) {
  if (!sectionEl || prefersReducedMotion) return;

  const animatedNodes = sectionEl.querySelectorAll('.stat-card, .card, .brand-card, .insight-item, .quote-block');
  animatedNodes.forEach((node, idx) => {
    node.classList.remove('motion-in');
    node.style.setProperty('--delay', `${Math.min(idx * 35, 360)}ms`);
  });

  requestAnimationFrame(() => {
    animatedNodes.forEach(node => node.classList.add('motion-in'));
  });
}

function switchSection(sectionName, clickedItem) {
  const current = document.querySelector('.section.active');
  const next = document.getElementById(`section-${sectionName}`);
  if (!next || current === next) return;

  navItems.forEach(n => n.classList.remove('active'));
  clickedItem.classList.add('active');

  if (prefersReducedMotion || !current) {
    current?.classList.remove('active');
    next.classList.add('active');
    animateSectionContent(next);
    return;
  }

  current.classList.add('is-leaving');
  setTimeout(() => {
    current.classList.remove('active', 'is-leaving');
    next.classList.add('active', 'is-entering');
    animateSectionContent(next);

    requestAnimationFrame(() => {
      next.classList.remove('is-entering');
    });
  }, 170);
}

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchSection(item.dataset.section, item);
  });
});

/* ─── Render Helpers ─────────────────────────────────────────────────────── */

function barChart(containerId, items, { labelKey = 'label', valueKey = 'value', colorClass = '', max = null } = {}) {
  const el = document.getElementById(containerId);
  if (!el || !items?.length) { el && (el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No data</p>'); return; }
  const maxVal = max || Math.max(...items.map(i => i[valueKey])) || 1;
  el.innerHTML = items.map(item => `
    <div class="bar-row">
      <div class="bar-label" title="${item[labelKey]}">${item[labelKey]}</div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" data-target="${Math.max(2, (item[valueKey]/maxVal*100).toFixed(1))}" style="width:0%"></div>
      </div>
      <div class="bar-count">${item[valueKey]}</div>
    </div>
  `).join('');

  animateBars(el);
}

function animateBars(root = document) {
  if (prefersReducedMotion) return;
  const bars = root.querySelectorAll('.bar-fill[data-target]');
  if (!bars.length) return;

  bars.forEach((bar, idx) => {
    bar.style.transitionDelay = `${Math.min(idx * 40, 280)}ms`;
    bar.style.width = '0%';
  });

  requestAnimationFrame(() => {
    bars.forEach(bar => {
      bar.style.width = `${bar.dataset.target}%`;
    });
  });
}

function statCard(label, value, sub = '', valueClass = '') {
  return `
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${valueClass}">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;
}

function pillContainer(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map((item, i) => `
    <div class="pill">
      ${item.label}
      <span class="pill-count">${item.count}</span>
    </div>
  `).join('');
}

function peakHoursHeatmap(data) {
  const container = document.getElementById('peak-hours-heatmap');
  const labels = document.getElementById('peak-hours-labels');
  if (!container || !data?.length) return;

  const maxVal = Math.max(...data.map(d => d.count), 1);

  container.innerHTML = data.map(d => {
    const intensity = d.count / maxVal;
    const alpha = 0.08 + intensity * 0.85;
    const bg = `rgba(108,99,255,${alpha.toFixed(2)})`;
    return `<div class="hour-cell" style="background:${bg}" title="${d.hour}:00 — ${d.count} msgs"></div>`;
  }).join('');

  labels.innerHTML = data.map(d => `<div class="hour-label">${d.hour}</div>`).join('');
}

function insightItem(icon, title, desc, severity = '') {
  return `
    <div class="insight-item severity-${severity}">
      <div class="insight-icon">${icon}</div>
      <div class="insight-body">
        <div class="insight-title">${title}</div>
        <div class="insight-desc">${desc}</div>
      </div>
    </div>`;
}

/* ─── Render Sections ────────────────────────────────────────────────────── */

function renderOverview(d) {
  const ch = d.conversationHealth;
  const en = d.engagement;

  // Stats
  document.getElementById('overview-stats').innerHTML = [
    statCard('Total Conversations', ch.totalConversations),
    statCard('Total Messages', ch.totalConversations ? (d.brands.reduce((s,b)=>s+b.totalMessages,0)) : '—'),
    statCard('Drop-off Rate', `${ch.singleTurnDropOffRate}%`, `${ch.singleTurnDropOff} single-turn convs`, ch.singleTurnDropOffRate > 20 ? 'red' : 'green'),
    statCard('Frustration Rate', `${ch.frustrationRate}%`, `${ch.frustratedConversations} frustrated convs`, ch.frustrationRate > 10 ? 'red' : ''),
    statCard('Unanswered Rate', `${ch.unansweredRate}%`, `${ch.unansweredConversations} left unanswered`, ch.unansweredRate > 15 ? 'red' : 'green'),
    statCard('Avg Response Length', `${ch.avgAgentResponseLength}`, 'characters per agent reply'),
  ].join('');

  // Drop-off chart
  barChart('overview-dropoff-chart', [
    { label: 'Single-turn Drop-off', value: ch.singleTurnDropOff },
    { label: 'Unanswered', value: ch.unansweredConversations },
    { label: 'Frustrated Users', value: ch.frustratedConversations },
  ], { labelKey: 'label', valueKey: 'value', colorClass: 'red' });

  // Events chart
  barChart('overview-events-chart', en.eventTypeCounts.map(e => ({
    label: e.event.replace(/_/g,' '),
    value: e.count,
  })), { labelKey: 'label', valueKey: 'value', colorClass: 'green' });

  // Peak hours
  peakHoursHeatmap(ch.peakHours);
}

function renderBrands(brands, en) {
  // Brand cards
  const bc = document.getElementById('brand-cards');
  bc.innerHTML = brands.map(b => `
    <div class="brand-card">
      <div class="brand-card-accent"></div>
      <div class="brand-name">${b.brandName}</div>
      <div class="brand-stat"><span class="brand-stat-label">Conversations</span><span class="brand-stat-value">${b.conversationCount}</span></div>
      <div class="brand-stat"><span class="brand-stat-label">Total Messages</span><span class="brand-stat-value">${b.totalMessages}</span></div>
      <div class="brand-stat"><span class="brand-stat-label">Avg Msgs / Conv</span><span class="brand-stat-value">${b.avgMessagesPerConversation}</span></div>
      <div class="brand-stat"><span class="brand-stat-label">User Messages</span><span class="brand-stat-value">${b.userMessages}</span></div>
      <div class="brand-stat"><span class="brand-stat-label">Agent Messages</span><span class="brand-stat-value">${b.agentMessages}</span></div>
      <div class="brand-stat"><span class="brand-stat-label">Events</span><span class="brand-stat-value">${b.eventMessages}</span></div>
    </div>
  `).join('');

  barChart('brand-msg-chart', brands.map(b => ({ label: b.brandName, value: b.totalMessages })),
    { labelKey: 'label', valueKey: 'value' });

  barChart('brand-avg-chart', brands.map(b => ({ label: b.brandName, value: b.avgMessagesPerConversation })),
    { labelKey: 'label', valueKey: 'value', colorClass: 'green' });

  // Events by brand
  const beb = document.getElementById('brand-events-chart');
  const eventsByBrand = en.eventsByBrand || {};
  const evBrandData = brands.map(b => ({
    label: b.brandName,
    value: (eventsByBrand[b.widgetId] || []).reduce((s, e) => s + e.count, 0)
  }));
  barChart('brand-events-chart', evBrandData, { labelKey: 'label', valueKey: 'value', colorClass: 'yellow' });
}

function renderHealth(ch) {
  document.getElementById('health-stats').innerHTML = [
    statCard('Single-turn Drop-off', `${ch.singleTurnDropOff}`, `${ch.singleTurnDropOffRate}% of all convs`, 'red'),
    statCard('Unanswered', ch.unansweredConversations, `last msg was from user`, 'red'),
    statCard('Frustrated Users', ch.frustratedConversations, `${ch.frustrationRate}% frustration rate`, ch.frustrationRate > 10 ? 'red' : ''),
    statCard('Avg Response Length', ch.avgAgentResponseLength, 'chars in clean agent reply'),
  ].join('');

  // Response length distribution
  const rld = ch.responseLengthDistribution;
  barChart('resp-len-chart', Object.entries(rld).map(([k,v]) => ({ label: k + ' chars', value: v })),
    { labelKey: 'label', valueKey: 'value', colorClass: 'green' });

  // Drop-off by brand
  const pb = ch.perBrand || {};
  const brandHealthItems = Object.entries(pb).map(([wid, data]) => ({
    label: BRAND_SHORT[wid] || wid.slice(-6),
    value: data.singleTurnRate
  }));
  barChart('brand-health-chart', brandHealthItems, { labelKey: 'label', valueKey: 'value', colorClass: 'red', max: 100 });

  // Frustration examples
  const fe = document.getElementById('frustration-examples');
  if (!ch.frustrationExamples?.length) {
    fe.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No obvious frustration signals detected.</p>';
    return;
  }
  fe.innerHTML = ch.frustrationExamples.slice(0, 6).map(ex => `
    <div class="quote-block">
      <div class="quote-text">${escapeHtml(ex.text)}</div>
      <div class="quote-meta">🔑 Keyword: "${ex.keyword}" · Brand: ${BRAND_SHORT[ex.widgetId] || ex.widgetId.slice(-6)}</div>
    </div>
  `).join('');
}

function renderTopics(t) {
  barChart('topic-freq-chart', t.topicFrequency.map(x => ({ label: x.topic, value: x.count })),
    { labelKey: 'label', valueKey: 'value' });

  barChart('unanswered-topics-chart', t.unansweredTopics.map(x => ({ label: x.topic, value: x.count })),
    { labelKey: 'label', valueKey: 'value', colorClass: 'red' });

  // Topics by brand table
  const tbb = document.getElementById('topics-by-brand');
  const entries = Object.entries(t.topicsByBrand || {});
  if (!entries.length) { tbb.innerHTML = '<p style="color:var(--text-muted)">No data</p>'; return; }

  tbb.innerHTML = entries.map(([wid, topics]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--accent)">${BRAND_SHORT[wid] || wid.slice(-6)}</div>
      <div class="bar-chart">
        ${topics.slice(0,6).map(x => `
          <div class="bar-row">
            <div class="bar-label">${x.topic}</div>
            <div class="bar-track">
              <div class="bar-fill" data-target="${Math.max(2, x.count / (topics[0]?.count || 1) * 100).toFixed(1)}" style="width:0%"></div>
            </div>
            <div class="bar-count">${x.count}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  animateBars(tbb);
}

function renderEngagement(en) {
  document.getElementById('engagement-stats').innerHTML = [
    statCard('Total Events', en.eventTypeCounts.reduce((s,e)=>s+e.count,0), 'user interactions tracked'),
    statCard('Products Suggested', en.topSuggestedProducts.reduce((s,p)=>s+p.count,0), 'total product recommendations'),
    statCard('Agent Replies', en.totalAgentReplies, 'with or without products'),
    statCard('No-Product Replies', `${en.noProductRate}%`, `${en.repliesWithNoProduct} replies`, en.noProductRate > 40 ? 'red' : 'green'),
  ].join('');

  // Event pills
  pillContainer('event-pills', en.eventTypeCounts.map(e => ({
    label: e.event.replace(/_/g,' '),
    count: e.count,
  })));

  // Top products
  barChart('top-products-chart', en.topSuggestedProducts.slice(0,15).map(p => ({
    label: p.handle.length > 40 ? p.handle.slice(0,40)+'…' : p.handle,
    value: p.count,
  })), { labelKey: 'label', valueKey: 'value', colorClass: 'green' });

  // Events by brand
  const ebbEl = document.getElementById('events-by-brand');
  const eventsByBrand = en.eventsByBrand || {};
  ebbEl.innerHTML = Object.entries(eventsByBrand).map(([wid, events]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--accent)">${BRAND_SHORT[wid] || wid.slice(-6)}</div>
      <div class="bar-chart">
        ${events.map(e => `
          <div class="bar-row">
            <div class="bar-label">${e.event.replace(/_/g,' ')}</div>
            <div class="bar-track">
              <div class="bar-fill yellow" data-target="${Math.max(2, e.count/(events[0]?.count||1)*100).toFixed(1)}" style="width:0%"></div>
            </div>
            <div class="bar-count">${e.count}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  animateBars(ebbEl);
}

function renderInsights(d) {
  const ch = d.conversationHealth;
  const en = d.engagement;
  const t  = d.topics;
  const brands = d.brands;

  const insights = [];

  // Drop-off
  if (ch.singleTurnDropOffRate > 15) {
    insights.push({ icon: '⚠️', sev: 'high',
      title: `High single-turn drop-off: ${ch.singleTurnDropOffRate}%`,
      desc: `${ch.singleTurnDropOff} conversations had only one user message with no agent reply. This suggests the assistant may be failing to respond quickly or the greeting flow is not engaging.`
    });
  }

  // Unanswered
  if (ch.unansweredRate > 10) {
    insights.push({ icon: '📭', sev: 'high',
      title: `${ch.unansweredRate}% conversations left unanswered`,
      desc: `In ${ch.unansweredConversations} conversations, the last message came from the user with no agent follow-up. These are likely abandoned or stuck interactions.`
    });
  }

  // Frustration
  if (ch.frustrationRate >= 1) {
    insights.push({ icon: '😤', sev: 'medium',
      title: `Frustration signals in ${ch.frustratedConversations} conversations (${ch.frustrationRate}%)`,
      desc: `Keywords like "not working", "wrong", "cancel", or "refund" appeared in user messages. Review the examples tab to identify recurring pain points.`
    });
  }

  // No-product replies
  if (en.noProductRate > 30) {
    insights.push({ icon: '🤔', sev: 'medium',
      title: `${en.noProductRate}% of agent replies contain no product data`,
      desc: `Agent responses without embedded product JSON could indicate hallucinated answers, out-of-scope questions, or policy-type responses. High rates may signal the assistant is answering questions without backing them with catalog data.`
    });
  }

  // Top gap topic
  if (t.unansweredTopics?.length) {
    const top = t.unansweredTopics[0];
    insights.push({ icon: '❓', sev: 'medium',
      title: `Most unanswered topic: "${top.topic}" (${top.count} times)`,
      desc: `Users asked about this topic ${top.count} times without receiving an agent response. Consider improving the assistant's coverage for this category.`
    });
  }

  // Best topic
  if (t.topicFrequency?.length) {
    const best = t.topicFrequency[0];
    insights.push({ icon: '🔥', sev: 'good',
      title: `Most common question type: "${best.topic}" (${best.count} questions)`,
      desc: `This is the dominant query category. Ensure the assistant's knowledge base is deepest in this area for maximum impact.`
    });
  }

  // Top product
  if (en.topSuggestedProducts?.length) {
    const tp = en.topSuggestedProducts[0];
    insights.push({ icon: '🛍️', sev: 'good',
      title: `Most recommended product: "${tp.handle}" (${tp.count}×)`,
      desc: `This product appears in agent recommendations most frequently. Verify it is correctly described, in stock, and priced accurately.`
    });
  }

  // Per-brand insights
  const pb = ch.perBrand || {};
  const brandDropoffs = Object.entries(pb).map(([wid, data]) => ({ wid, rate: data.singleTurnRate })).sort((a,b) => b.rate - a.rate);
  if (brandDropoffs.length) {
    const worst = brandDropoffs[0];
    insights.push({ icon: '📉', sev: 'medium',
      title: `${BRAND_SHORT[worst.wid] || worst.wid.slice(-6)} has the highest drop-off rate: ${worst.rate}%`,
      desc: `This brand's assistant may have greeting or response latency issues causing users to leave before receiving help.`
    });
  }

  // Response length
  if (ch.avgAgentResponseLength > 800) {
    insights.push({ icon: '📝', sev: 'medium',
      title: `Average agent responses are very long (${ch.avgAgentResponseLength} chars)`,
      desc: `Long responses may overwhelm users in a chat interface. Consider tuning the assistant to give more concise answers and use bullet points.`
    });
  } else if (ch.avgAgentResponseLength < 150) {
    insights.push({ icon: '📝', sev: 'medium',
      title: `Average agent responses are very short (${ch.avgAgentResponseLength} chars)`,
      desc: `Short responses might not provide enough detail to answer product questions. Review whether the assistant is truncating answers.`
    });
  }

  // Add-to-cart success
  const atcEvent = en.eventTypeCounts.find(e => e.event === 'add_to_cart_success');
  const linkClick = en.eventTypeCounts.find(e => e.event === 'link_click');
  if (atcEvent && linkClick) {
    const convRate = ((atcEvent.count / linkClick.count) * 100).toFixed(1);
    insights.push({ icon: '🛒', sev: 'good',
      title: `Link-click to cart conversion: ${convRate}%`,
      desc: `Out of ${linkClick.count} link clicks, ${atcEvent.count} resulted in add-to-cart events — a ${convRate}% conversion from assistant recommendations.`
    });
  }

  const el = document.getElementById('insights-list');
  if (!insights.length) {
    el.innerHTML = '<p style="color:var(--text-muted)">No significant issues detected.</p>';
    return;
  }

  el.innerHTML = insights.map(i => insightItem(i.icon, i.title, i.desc, i.sev)).join('');
}

/* ─── Utilities ──────────────────────────────────────────────────────────── */
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Bootstrap ──────────────────────────────────────────────────────────── */
async function loadData() {
  const badge = document.getElementById('status-badge');

  // Check health
  try {
    const h = await fetch(`${API}/api/health`).then(r => r.json());
    badge.className = 'status-badge ok';
    badge.innerHTML = `<div class="dot"></div> MongoDB · ${h.conversationsInDB} convs · ${h.messagesInDB} msgs`;
  } catch (e) {
    badge.className = 'status-badge error';
    badge.innerHTML = `<div class="dot"></div> Backend offline`;
    document.getElementById('overview-stats').innerHTML = `
      <div style="grid-column:1/-1;padding:20px;color:var(--accent3);font-size:13px">
        ❌ Cannot reach backend at ${API}. Make sure the server is running:
        <br><br><code style="background:rgba(255,255,255,0.06);padding:4px 10px;border-radius:6px">cd backend && npm run dev</code>
      </div>`;
    return;
  }

  // Load all insights
  try {
    const data = await fetch(`${API}/api/insights`).then(r => r.json());
    DATA = data;

    renderOverview(data);
    renderBrands(data.brands, data.engagement);
    renderHealth(data.conversationHealth);
    renderTopics(data.topics);
    renderEngagement(data.engagement);
    renderInsights(data);

  } catch (e) {
    console.error(e);
    badge.className = 'status-badge error';
    badge.innerHTML = `<div class="dot"></div> Analysis error`;
  }
}

loadData();
animateSectionContent(document.querySelector('.section.active'));
