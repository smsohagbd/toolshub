"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotFaq {
  question: string;
  answer?: string;
}

// Helper to parse **bold** and [link text](url) into clickable anchor tags
function renderBoldAndText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={pIdx}>{part}</span>;
  });
}

function parseLineContent(text: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(...renderBoldAndText(text.slice(lastIndex, match.index)));
    }
    const label = match[1];
    const href = match[2];
    elements.push(
      <a
        key={`link-${match.index}`}
        href={href}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold underline hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
      >
        <span>{label}</span>
        <span className="text-[10px]">↗</span>
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(...renderBoldAndText(text.slice(lastIndex)));
  }

  return elements;
}

function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        const renderedLine = parseLineContent(line);

        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
        const isNumber = /^\d+\.\s/.test(trimmed);

        if (isBullet || isNumber) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-indigo-500 font-bold shrink-0 leading-tight">
                {isBullet ? "•" : trimmed.match(/^\d+\./)?.[0]}
              </span>
              <div className="flex-1">
                {renderedLine}
              </div>
            </div>
          );
        }

        return <p key={idx}>{renderedLine}</p>;
      })}
    </div>
  );
}

const DEFAULT_GREETING: Message = {
  role: "assistant",
  content: "আসসালামু আলাইকুম! ToolsHub BD এর এআই অ্যাসিস্ট্যান্টে স্বাগতম। আপনি কোন ডিজিটাল টুলস সম্পর্কে জানতে চান বা কীভাবে বিকাশ/নগদে অর্ডার করবেন তা জিজ্ঞেস করতে পারেন।"
};

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([DEFAULT_GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [quickPrompts, setQuickPrompts] = useState<ChatbotFaq[]>([
    {
      question: "টুলস কীভাবে ডাউনলোড করব?",
      answer: "পেমেন্ট সম্পন্ন করে TrxID সাবমিট করার ৫-১৫ মিনিটের মধ্যে অ্যাডমিন ভেরিফাই করে ডাউনলোড লিংক সক্রিয় করে দেয়। এছাড়াও 'ট্র্যাক অর্ডার' পেজে অর্ডার নম্বর দিয়ে যেকোনো সময় ডাউনলোড করতে পারবেন।"
    },
    {
      question: "বিকাশ বা নগদে কীভাবে কিনব?",
      answer: "পছন্দের টুলস বা কোর্সের 'কিনুন' বাটনে ক্লিক করে বিকাশ বা নগদ পার্সোনাল নম্বরে Send Money করুন এবং TrxID ফর্মটিতে লিখে সাবমিট করুন।"
    },
    {
      question: "৩য়-পক্ষ ড্রাইভ লিংক কীভাবে পাব?",
      answer: "যেসব প্রডাক্টে গুগল ড্রাইভ বা ৩য়-পক্ষ অ্যাক্সেস রয়েছে, সেগুলোতে পেমেন্ট অ্যাপ্রুভ হওয়ার পর ট্র্যাকিং পেজ ও ইউজার ড্যাশবোর্ডে সরাসরি 'Access Now' বাটন দৃশ্যমান হবে।"
    },
    {
      question: "লাইসেন্স কী কতক্ষণে পাওয়া যাবে?",
      answer: "পেমেন্ট অ্যাপ্রুভ হওয়ার সাথে সাথেই ট্র্যাকিং পেজে এবং আপনার ড্যাশবোর্ডে লাইসেন্স কী প্রদর্শিত হবে।"
    }
  ]);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Initialize Session ID & Load Persisted Chat History
  useEffect(() => {
    // 1. Session ID (Persisted in localStorage so reloads keep identity)
    let sid = "";
    try {
      sid = localStorage.getItem("toolshub_chat_session_id") || "";
      if (!sid) {
        sid = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
        localStorage.setItem("toolshub_chat_session_id", sid);
      }
      setSessionId(sid);
    } catch {
      sid = "sess_fallback_" + Date.now();
      setSessionId(sid);
    }

    // 2. Load cached messages from localStorage (up to 10 messages)
    try {
      const cached = localStorage.getItem("toolshub_chat_messages");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.slice(-10));
        }
      }
    } catch {}

    // 3. Fetch user auth status & server-persisted history for logged-in user or session
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((auth) => {
        const email = auth?.authenticated && auth?.user?.email ? auth.user.email : null;
        if (email) setUserEmail(email);
        const query = email ? `user_email=${encodeURIComponent(email)}` : `session_id=${encodeURIComponent(sid)}`;
        return fetch(`/api/chat?${query}`);
      })
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.faqs) && d.faqs.length > 0) {
          setQuickPrompts(d.faqs);
        }
        if (d && Array.isArray(d.history) && d.history.length > 0) {
          const serverHistory: Message[] = d.history.map((h: any) => ({
            role: h.role,
            content: h.content
          }));
          setMessages(serverHistory.slice(-10));
          try {
            localStorage.setItem("toolshub_chat_messages", JSON.stringify(serverHistory.slice(-10)));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Save messages to localStorage whenever they update (keep last 10)
  const saveMessagesToStorage = (updated: Message[]) => {
    try {
      const last10 = updated.slice(-10);
      localStorage.setItem("toolshub_chat_messages", JSON.stringify(last10));
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleQuickPromptClick = (faq: ChatbotFaq) => {
    if (faq.answer) {
      // Instant automated answer
      const updated: Message[] = [
        ...messages,
        { role: "user", content: faq.question },
        { role: "assistant", content: faq.answer }
      ];
      setMessages(updated);
      saveMessagesToStorage(updated);
      return;
    }
    handleSend(faq.question);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    saveMessagesToStorage(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send last 3-5 QA turns as history
      const historyToSend = newMessages.slice(-6);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_email: userEmail,
          history: historyToSend
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const withReply: Message[] = [...newMessages, { role: "assistant", content: data.reply }];
        setMessages(withReply);
        saveMessagesToStorage(withReply);
      } else {
        const withErr: Message[] = [
          ...newMessages,
          {
            role: "assistant",
            content: data.error || "দুঃখিত, এআই সার্ভিসের সাথে সংযোগ করা সম্ভব হয়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          }
        ];
        setMessages(withErr);
        saveMessagesToStorage(withErr);
      }
    } catch (err) {
      const withErr: Message[] = [
        ...newMessages,
        {
          role: "assistant",
          content: "নেটওয়ার্ক সংক্রান্ত কোনো সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।"
        }
      ];
      setMessages(withErr);
      saveMessagesToStorage(withErr);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-5 right-4 sm:right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-105 active:scale-95"
          aria-label="Open Customer Support Chat"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <Bot className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide pr-1">💬 সহায়তা ও চ্যাট</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[390px] h-[530px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  ToolsHub কাস্টমার সাপোর্ট
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="text-[11px] text-indigo-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  অনলাইন ২৪/৭ সহায়তা
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-sm text-xs sm:text-sm"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm"
                  }`}
                >
                  <FormattedMessage text={msg.content} />
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator replacing "উত্তর তৈরি হচ্ছে..." */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl px-3.5 py-2 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    টাইপিং
                  </span>
                  <span className="flex gap-1 items-center pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestion Pills */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPromptClick(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
              >
                {q.question}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="একটি প্রশ্ন লিখুন..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent dark:border-slate-700"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 shadow-md"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
