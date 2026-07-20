import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { MessageSquare, Send, X, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react';

interface ChatbotPanelProps {
  project: Project;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function ChatbotPanel({ project }: ChatbotPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello! I am your real estate cash flow co-pilot. I have full access to **${project.name}**'s financial sheets.
      
Ask me anything about this project's available bank balance, pending vendor bills, budget status, or customer receivables. I am strictly grounded in your stored numbers!`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Project Change
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: `Switched focus to **${project.name}** (${project.status}). I can now assist with any queries on this project's specific records.`
      }
    ]);
  }, [project.id]);

  const sampleQuestions = [
    'How much do we still need to collect from customers?',
    'Why is construction outlay over budget?',
    'What is our closing bank and cash balance?',
    'Are we over budget on any material purchases?'
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setIsLoading(true);

    // Prepare context for server grounding
    const lastPeriod = project.periods[project.periods.length - 1];
    const closingBalance = lastPeriod ? (lastPeriod.bankBalance + lastPeriod.cashInHand) : 0;
    
    let totalInflowVal = 0;
    let totalOutflowVal = 0;
    project.periods.forEach((p) => {
      const pInflow = p.inflows.reduce((sum, i) => sum + (i.actual || 0), 0);
      const pOutflow = p.outflows.reduce((sum, o) => sum + (o.actual || 0), 0);
      totalInflowVal += pInflow;
      totalOutflowVal += pOutflow;
    });

    const count = project.periods.length;
    const avgInflow = count > 0 ? totalInflowVal / count : 0;
    const avgOutflow = count > 0 ? totalOutflowVal / count : 0;

    const forecast30 = {
      inflow: Number(avgInflow.toFixed(2)),
      outflow: Number(avgOutflow.toFixed(2)),
      balance: Number((closingBalance + (avgInflow - avgOutflow)).toFixed(2))
    };

    const forecast90 = {
      inflow: Number((avgInflow * 3).toFixed(2)),
      outflow: Number((avgOutflow * 3).toFixed(2)),
      balance: Number((closingBalance + (avgInflow * 3 - avgOutflow * 3)).toFixed(2))
    };

    const pendingCollections = project.collections
      .filter(c => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);
    const overdueCollections = project.collections
      .filter(c => c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

    const pendingPayables = project.payments
      .filter(p => p.status !== 'Paid')
      .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
    const overduePayables = project.payments
      .filter(p => p.status === 'Overdue')
      .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

    const context = {
      projectName: project.name,
      projectStatus: project.status,
      financialYear: project.financialYear,
      openingBalance: project.periods[0] ? (project.periods[0].bankBalance + project.periods[0].cashInHand) : 0,
      totalInflow: totalInflowVal,
      totalOutflow: totalOutflowVal,
      netCashFlow: totalInflowVal - totalOutflowVal,
      closingBalance,
      totalReceivables: project.collections.reduce((sum, c) => sum + c.amount, 0),
      collectedAmount: project.collections.reduce((sum, c) => sum + c.collectedAmount, 0),
      pendingCollections,
      overdueCollections,
      totalPayables: project.payments.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: project.payments.reduce((sum, p) => sum + p.paidAmount, 0),
      pendingPayables,
      overduePayables,
      budgetVsActual: project.budgetVsActual,
      forecast30,
      forecast90,
      periods: project.periods.map(p => ({
        name: p.name,
        bankBalance: p.bankBalance,
        cashInHand: p.cashInHand,
        inflows: p.inflows.filter(i => i.actual > 0),
        outflows: p.outflows.filter(o => o.actual > 0)
      })),
      collections: project.collections || [],
      payments: project.payments || [],
      transactions: project.transactions || []
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          context
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to get response from server chatbot');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'ai', text: data.text || 'No response.' }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Error: Unable to connect to assistant. ${err.message || 'Make sure your local Express backend server is running on port 3000.'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        id="chatbot-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        title="Ask Financial Co-pilot"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="text-xs font-bold font-display pr-1 hidden sm:inline">Ask Co-pilot</span>
      </button>

      {/* Chat Panel Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-250 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Project Co-pilot</h3>
              <p className="text-[10px] text-gray-500 font-medium">Grounded in {project.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
              >
                {/* Format paragraphs/newlines neatly */}
                <div className="whitespace-pre-wrap space-y-1">
                  {msg.text.split('\n').map((line, idx) => {
                    // Check for lists or bold
                    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                      return <li key={idx} className="ml-3 list-disc mt-1">{line.replace(/^[\s*-]+/, '').trim()}</li>;
                    }
                    // Handle simple bold syntax **bold**
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <p key={idx}>
                          {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-gray-950">{p}</strong> : p)}
                        </p>
                      );
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              </div>
              <span className="text-[9px] text-gray-400 mt-1 uppercase font-mono tracking-wider">
                {msg.sender === 'user' ? 'You' : 'Co-pilot AI'}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 bg-white border border-gray-200 p-3 rounded-xl max-w-max text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Analyzing ledger entries...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion tags (only shown when suggestions exist and chat is open) */}
        {messages.length === 1 && (
          <div className="p-3 bg-white border-t border-gray-150 space-y-1.5">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block font-semibold">Suggested Questions:</span>
            <div className="flex flex-col gap-1.5">
              {sampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="flex items-center justify-between text-left text-[11px] text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-gray-150 transition-all cursor-pointer font-medium"
                >
                  <span>{q}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 ml-1.5 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="p-3 bg-white border-t border-gray-200 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a cash flow question..."
            className="flex-1 bg-gray-50 border border-gray-250 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
