import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client lazily/safely
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // 1. API: Chatbot grounded query
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!ai) {
        // Fallback to high-quality rule-based insights if API key is not configured yet
        const projName = context?.projectName || 'the selected project';
        const closing = context?.closingBalance ?? '0';
        const pendingCol = context?.pendingCollections ?? '0';
        const overdueCol = context?.overdueCollections ?? '0';
        const constructionStatus = context?.constructionStatus || 'On Track';

        return res.json({
          text: `### Real Estate Financial Insights (Local Rule Engine)

I am currently running in **Local Financial Analyzer mode** because the \`GEMINI_API_KEY\` is not yet configured in **Settings > Secrets**. However, I can still analyze your active project's stored data to provide objective financial feedback.

**Project Status Summary for "${projName}":**
*   **Closing Cash Position:** Rs. \`${closing} Lakhs\`
*   **Customer Collections Pending:** Rs. \`${pendingCol} Lakhs\` (with **Rs. ${overdueCol} Lakhs** categorized as **Overdue** past their due dates)
*   **Construction Outlays:** Currently **${constructionStatus}** compared to planned budgets.

**Direct Answer:**
Based on your question: *"${prompt}"*
1.  **Closing Liquidity:** Your closing balance is **Rs. ${closing} Lakhs**. This represents your immediate available liquidity (Opening Balances + Inflow - Outflow).
2.  **Receivables Audit:** Your overdue customer collections are **Rs. ${overdueCol} Lakhs**. Pursuing these overdue accounts immediately is the fastest way to improve project liquidity without taking on expensive bank loans or debt.
3.  **To unlock advanced AI forecasting, scenario planning, and full conversational intelligence:** Please click **Settings** (gear icon) on the top-right in AI Studio, go to **Secrets**, and add a secret named \`GEMINI_API_KEY\` with your Gemini API key. No code changes are required!`
        });
      }

      const systemInstruction = `You are an elite, professional real estate financial consultant and cash flow co-pilot.
You are analyzing the financial sheets for the real estate project "${context?.projectName || 'the selected project'}".

IMPORTANT CRITICAL RULES:
1. Ground every single answer ONLY in the actual stored project numbers provided below.
2. NEVER invent, hallucinate, or assume numbers or metrics not present in the data.
3. If the answer requires data that has not been entered yet, state clearly "No historical record has been logged for this category yet" instead of guessing.
4. Explain any real estate financial term with a short, simple, plain-English helper line (e.g. "Net Cash Flow: the absolute cash left over after paying all expenses this month").
5. Keep your tone professional, encouraging, objective, and clear. Avoid overly long replies.

REAL ESTATE PROJECT DATABASE CONTEXT:
- Active Project: "${context?.projectName || 'None'}"
- Project Status: "${context?.projectStatus || 'Ongoing'}"
- Financial Year: "${context?.financialYear || 'FY 2026-27'}"
- Opening Cash Position: Rs. ${context?.openingBalance || '0'} Lakhs
- Total Inflows: Rs. ${context?.totalInflow || '0'} Lakhs
- Total Outflows: Rs. ${context?.totalOutflow || '0'} Lakhs
- Net Cash Flow: Rs. ${context?.netCashFlow || '0'} Lakhs
- Closing Cash Balance: Rs. ${context?.closingBalance || '0'} Lakhs
- Customer Receivables:
  * Total Receivable: Rs. ${context?.totalReceivables || '0'} Lakhs
  * Collected to Date: Rs. ${context?.collectedAmount || '0'} Lakhs
  * Pending Collection: Rs. ${context?.pendingCollections || '0'} Lakhs
  * OVERDUE Collections: Rs. ${context?.overdueCollections || '0'} Lakhs
- Vendor Payables:
  * Total Payables: Rs. ${context?.totalPayables || '0'} Lakhs
  * Paid to Date: Rs. ${context?.paidAmount || '0'} Lakhs
  * Pending Vendor Bills: Rs. ${context?.pendingPayables || '0'} Lakhs
  * OVERDUE Vendor Bills: Rs. ${context?.overduePayables || '0'} Lakhs
- Historical Monthly Periods:
  ${JSON.stringify(context?.periods || [], null, 2)}
- Customer Collections List:
  ${JSON.stringify(context?.collections || [], null, 2)}
- Vendor Payments List:
  ${JSON.stringify(context?.payments || [], null, 2)}
- Budget Vs Actual Categories Status:
  ${JSON.stringify(context?.budgetVsActual || [], null, 2)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.15,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini Server Route Error:", err);
      res.status(500).json({ error: err.message || "Failed to process question via Gemini." });
    }
  });

  // 2. Vite middleware setup for Development, static serving for Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer();
