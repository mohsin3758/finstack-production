# AI ARCHITECTURE — FinStack ERP v21
**Date:** 2026-05-22 | **Stack:** Claude 3.5 Sonnet + Anthropic SDK

---

## AI FEATURES ROADMAP

| Feature | Phase | Model | Priority |
|---------|-------|-------|---------|
| AI Chat Assistant (CFO queries) | 1 | Claude claude-sonnet-4-20250514 | 🔴 P1 |
| Invoice OCR & auto-fill | 2 | Claude (vision) | 🟠 P2 |
| Payroll anomaly detection | 2 | Claude + rules engine | 🟠 P2 |
| GST compliance assistant | 1 | Claude | 🔴 P1 |
| Finance insights & forecasting | 3 | Claude + data | 🟡 P3 |
| TDS optimization suggestions | 2 | Claude | 🟠 P2 |

---

## AI SERVICE ARCHITECTURE

```
User Query → AI Controller
               ↓
           Context Builder (pulls tenant data)
               ↓
           Claude API (claude-sonnet-4-20250514)
               ↓
           Tool Calls (if needed)
           ├── get_invoice_summary
           ├── get_payroll_stats
           ├── calculate_gst
           └── check_compliance
               ↓
           Response → User
```

---

## IMPLEMENTATION

```bash
cd backend
npm install @anthropic-ai/sdk
```

```javascript
// backend/src/services/aiService.js
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const logger    = require('../utils/logger');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are FinStack AI — an expert CFO assistant for Indian SMEs.
You have deep knowledge of:
- Indian GST (CGST/SGST/IGST), TDS, PF, ESI, Professional Tax
- Indian Accounting Standards (Ind AS)
- MSME regulations and compliance
- Cash flow management for service companies
- Indian payroll regulations (EPFO, ESIC)

You have access to the company's financial data through tools.
Always give specific, actionable advice. Format numbers in Indian system (Lakhs/Crores).
Never give legal advice — recommend consulting a CA for complex matters.
Keep responses concise (2-3 paragraphs max unless asked for detail).`;

// ── Tool definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name:        'get_dashboard_summary',
    description: 'Get company financial KPIs: revenue, expenses, outstanding, profit for current month',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['current_month', 'last_month', 'ytd', 'last_quarter'] }
      },
      required: ['period'],
    },
  },
  {
    name:        'get_invoice_analysis',
    description: 'Analyze invoice data — outstanding amounts, overdue invoices, collection trends',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['overdue', 'pending', 'all'] },
        limit:  { type: 'number', description: 'Number of invoices to analyze (max 20)' },
      },
    },
  },
  {
    name:        'get_payroll_summary',
    description: 'Get payroll summary for a specific month including PF/ESI/PT obligations',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'number', minimum: 1, maximum: 12 },
        year:  { type: 'number', minimum: 2024, maximum: 2030 },
      },
      required: ['month', 'year'],
    },
  },
  {
    name:        'calculate_gst',
    description: 'Calculate GST for a given taxable amount and rate',
    input_schema: {
      type: 'object',
      properties: {
        amount:      { type: 'number', description: 'Taxable amount in INR' },
        gst_rate:    { type: 'number', enum: [0, 5, 12, 18, 28] },
        supply_type: { type: 'string', enum: ['intra', 'inter'] },
      },
      required: ['amount', 'gst_rate', 'supply_type'],
    },
  },
  {
    name:        'check_compliance_deadlines',
    description: 'Get upcoming statutory compliance deadlines (TDS, GSTR, PF, ESI)',
    input_schema: {
      type: 'object',
      properties: {
        months_ahead: { type: 'number', default: 3 },
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────
async function executeTool(toolName, toolInput, companyId) {
  const { Invoice, PayrollRecord, Employee, Transaction } = require('../models');
  const { Op, fn, col } = require('sequelize');
  const { calculateGST } = require('./payrollService');
  const dayjs = require('dayjs');

  switch (toolName) {
    case 'get_dashboard_summary': {
      const now   = dayjs();
      const mFrom = now.startOf('month').format('YYYY-MM-DD');
      const mTo   = now.endOf('month').format('YYYY-MM-DD');
      const [invStats, empCount, txnStats] = await Promise.all([
        Invoice.findOne({
          where: { company_id: companyId, inv_date: { [Op.between]: [mFrom, mTo] } },
          attributes: [[fn('SUM', col('total')), 'total'], [fn('SUM', col('outstanding')), 'outstanding']],
          raw: true,
        }),
        Employee.count({ where: { company_id: companyId, status: 'active' } }),
        Transaction.findOne({
          where: { company_id: companyId, txn_type: 'expense', date: { [Op.between]: [mFrom, mTo] } },
          attributes: [[fn('SUM', col('amount')), 'total']],
          raw: true,
        }),
      ]);
      return {
        period:       `${now.format('MMMM YYYY')}`,
        revenue:      parseFloat(invStats?.total || 0),
        outstanding:  parseFloat(invStats?.outstanding || 0),
        expenses:     parseFloat(txnStats?.total || 0),
        profit:       parseFloat(invStats?.total || 0) - parseFloat(txnStats?.total || 0),
        employees:    empCount,
      };
    }

    case 'calculate_gst': {
      return calculateGST(toolInput.amount, toolInput.gst_rate, toolInput.supply_type);
    }

    case 'check_compliance_deadlines': {
      const now = dayjs();
      const month = now.month() + 1;
      const year = now.year();
      return {
        deadlines: [
          { name: 'TDS Deposit (Sec 192)', due: `7th of next month`, amount_due: 'Check payroll records' },
          { name: 'GSTR-1',  due: `11th of next month (quarterly if QRMP)` },
          { name: 'GSTR-3B', due: `20th of next month` },
          { name: 'PF Deposit', due: `15th of next month` },
          { name: 'ESI Deposit', due: `15th of next month` },
        ],
        current_month: `${month}/${year}`,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main chat function ─────────────────────────────────────────────────────
async function chat(companyId, conversationHistory, userMessage) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { response: 'AI assistant is not configured. Please contact your administrator.', toolsUsed: [] };
  }

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    tools:      TOOLS,
    messages,
  });

  const toolsUsed = [];

  // Agentic loop: handle tool calls
  while (response.stop_reason === 'tool_use') {
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolsUsed.push(block.name);
        logger.info(`[AI] Tool call: ${block.name}`, block.input);
        const result = await executeTool(block.name, block.input, companyId);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      tools:      TOOLS,
      messages,
    });
  }

  const textContent = response.content.find(b => b.type === 'text');
  return {
    response:  textContent?.text || 'I could not generate a response.',
    toolsUsed,
    updatedHistory: [...messages, { role: 'assistant', content: response.content }],
  };
}

module.exports = { chat };
```

---

## AI CONTROLLER & ROUTE

```javascript
// backend/src/controllers/aiController.js
'use strict';
const { chat } = require('../services/aiService');
const { AppError } = require('../middlewares/errorHandler');

// In-memory conversation store (use Redis for production)
const conversations = new Map();

async function aiChat(req, res, next) {
  try {
    const { message, conversation_id } = req.body;
    if (!message?.trim()) throw new AppError('Message is required', 400, 'MISSING_MESSAGE');

    const convKey = `${req.company_id}:${conversation_id || req.user.id}`;
    const history = conversations.get(convKey) || [];

    const { response, toolsUsed, updatedHistory } = await chat(
      req.company_id, history, message
    );

    // Keep last 20 messages to stay within context
    conversations.set(convKey, updatedHistory.slice(-20));

    res.json({ success: true, data: { response, tools_used: toolsUsed, conversation_id: convKey } });
  } catch (e) { next(e); }
}

async function clearConversation(req, res) {
  const convKey = `${req.company_id}:${req.params.id || req.user.id}`;
  conversations.delete(convKey);
  res.json({ success: true, message: 'Conversation cleared' });
}

module.exports = { aiChat, clearConversation };
```

```javascript
// Add to routes/index.js:
const ai = require('../controllers/aiController');
router.post('/ai/chat',                      rbac.permit('reports','read'), ai.aiChat);
router.delete('/ai/conversation/:id',        rbac.permit('reports','read'), ai.clearConversation);
```

---

## ENVIRONMENT

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
FEATURE_AI=true    # Set to enable AI routes
```
