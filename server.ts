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

  // 1b. API: Forecast Recommendations & Analysis
  app.post("/api/recommendations", async (req, res) => {
    try {
      const { context, threshold = 20 } = req.body;
      if (!context) {
        return res.status(400).json({ error: "Context is required" });
      }

      const projName = context.projectName || "Selected Project";
      const currentBalance = context.closingBalance || 0;
      const forecast30Balance = context.forecast30?.balance || 0;
      const forecast90Balance = context.forecast90?.balance || 0;
      const overdueCollections = context.overdueCollections || 0;
      const overduePayables = context.overduePayables || 0;

      // Find variances
      let constructionOverrun = 0;
      let materialsOverrun = 0;
      if (context.budgetVsActual) {
        const constCost = context.budgetVsActual.find((b: any) => b.category === "Construction Cost");
        if (constCost && constCost.actual > constCost.budgeted) {
          constructionOverrun = constCost.actual - constCost.budgeted;
        }
        const matCost = context.budgetVsActual.find((b: any) => b.category === "Material Purchase");
        if (matCost && matCost.actual > matCost.budgeted) {
          materialsOverrun = matCost.actual - matCost.budgeted;
        }
      }

      // Generate local rule-based recommendations as baseline & fallback
      const localRecs: string[] = [];
      let localShortageAlert = null;
      let localGrowthTrend = "Steady";

      // 1. Shortage Check
      if (forecast30Balance < threshold) {
        localShortageAlert = `CRITICAL: Cash reserve projected to fall to Rs. ${forecast30Balance.toFixed(2)} L (below minimum threshold Rs. ${threshold} L) in next 30 days!`;
      } else if (forecast90Balance < threshold) {
        localShortageAlert = `WARNING: Long-term cash reserve projected to fall to Rs. ${forecast90Balance.toFixed(2)} L (below safety threshold Rs. ${threshold} L) within 90 days.`;
      }

      // 2. Growth Analysis
      if (context.periods && context.periods.length >= 2) {
        const last = context.periods[context.periods.length - 1];
        const prev = context.periods[context.periods.length - 2];
        const lastNet = (last.inflows?.reduce((s: number, i: any) => s + (i.actual || 0), 0) || 0) - (last.outflows?.reduce((s: number, o: any) => s + (o.actual || 0), 0) || 0);
        const prevNet = (prev.inflows?.reduce((s: number, i: any) => s + (i.actual || 0), 0) || 0) - (prev.outflows?.reduce((s: number, o: any) => s + (o.actual || 0), 0) || 0);
        
        if (lastNet > prevNet + 5) {
          localGrowthTrend = `Accelerating: Net cash inflow increased from Rs. ${prevNet.toFixed(1)} L to Rs. ${lastNet.toFixed(1)} L, showing rising sales velocity.`;
        } else if (lastNet < prevNet - 5) {
          localGrowthTrend = `Declining: Spend velocity has exceeded income, dropping net cash flow from Rs. ${prevNet.toFixed(1)} L to Rs. ${lastNet.toFixed(1)} L. Action is recommended to curb expenses.`;
        } else {
          localGrowthTrend = `Steady: Balance fluctuations remain stable at around Rs. ${lastNet.toFixed(1)} L net monthly.`;
        }
      } else {
        localGrowthTrend = "Steady: Project is in early stage of cash flow tracking.";
      }

      // 3. Dynamic suggested actions
      if (overdueCollections > 0) {
        localRecs.push(`Follow up with overdue customers immediately to retrieve Rs. ${overdueCollections.toFixed(2)} Lakhs in outstanding receipts. This will raise your cash buffer.`);
      } else if (context.pendingCollections > 0) {
        localRecs.push(`Incentivize early installment payments for schedule-active customers (Rs. ${context.pendingCollections.toFixed(2)} Lakhs pending) by offering a minor 1-2% pre-payment rebate.`);
      }

      if (constructionOverrun > 0) {
        localRecs.push(`Reduce secondary discretionary spending immediately. Your active Construction outlay is Rs. ${constructionOverrun.toFixed(2)} Lakhs OVER planned budgets.`);
      }
      if (materialsOverrun > 0) {
        localRecs.push(`Negotiate deferred material procurement options with vendors to mitigate the Rs. ${materialsOverrun.toFixed(2)} Lakhs budget over-expenditure.`);
      }

      if (overduePayables > 0) {
        localRecs.push(`Establish a structured pay-off program with partners for Rs. ${overduePayables.toFixed(2)} Lakhs in overdue accounts payable to avoid interest penalties or progress holds.`);
      }

      if (forecast30Balance < threshold) {
        localRecs.push(`Defer Rs. 15-20 Lakhs of non-essential consultant, utility, or office overhead expenses to maintain liquidity next month.`);
      }

      if (localRecs.length < 3) {
        localRecs.push("Maintain a strict checking account reserve buffer of 20% to prevent unexpected subcontractor premium charges.");
        localRecs.push("Regularly update milestone collection cycles to sync contractor invoices with cash inflow dates.");
      }

      // If Gemini is available, refine recommendations using AI!
      if (ai) {
        const prompt = `You are a professional real estate financial analyst. Review this cash flow context and provide:
1. 3-4 highly specific, actionable, plain-English suggested actions grounded in these real numbers to keep cash reserves above the Rs. ${threshold} L threshold.
2. Growth Trend Analysis (a brief 1-2 sentence read).
3. Shortage Alert details.

CONTEXT:
Project: ${projName}
Closing Balance: Rs. ${currentBalance} Lakhs
Configurable Threshold: Rs. ${threshold} Lakhs
30-Day Proj Cash Position: Rs. ${forecast30Balance} Lakhs
90-Day Proj Cash Position: Rs. ${forecast90Balance} Lakhs
Pending Collections: Rs. ${context.pendingCollections} Lakhs (Overdue: Rs. ${overdueCollections} Lakhs)
Pending Payables: Rs. ${context.pendingPayables} Lakhs (Overdue: Rs. ${overduePayables} Lakhs)
Construction Overrun: Rs. ${constructionOverrun} Lakhs
Materials Overrun: Rs. ${materialsOverrun} Lakhs

YOUR RESPONSE MUST BE VALID JSON MATCHING THIS EXACT FORMAT:
{
  "recommendations": ["suggestion 1 with real numbers", "suggestion 2 with real numbers", "suggestion 3"],
  "growthTrend": "short plain-English explanation",
  "shortageAlert": "alert text or null"
}
Do not return any markdown codeblocks or wrapper around the JSON. Return only the raw JSON.`;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          });

          const parsed = JSON.parse(response.text.trim());
          if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
            return res.json({
              recommendations: parsed.recommendations,
              growthTrend: parsed.growthTrend || localGrowthTrend,
              shortageAlert: parsed.shortageAlert || localShortageAlert,
              aiPowered: true
            });
          }
        } catch (geminiErr) {
          console.error("Gemini recommendations error, falling back:", geminiErr);
        }
      }

      // Fallback response
      res.json({
        recommendations: localRecs.slice(0, 4),
        growthTrend: localGrowthTrend,
        shortageAlert: localShortageAlert,
        aiPowered: false
      });

    } catch (err: any) {
      console.error("Recommendations Route Error:", err);
      res.status(500).json({ error: "Failed to generate recommendations" });
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
