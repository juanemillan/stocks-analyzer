"use client";
import React, { useRef, useEffect, useCallback } from "react";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";
import type { ChatMessage } from "@/hooks/useChat";

/* ─── Markdown-lite renderer (handles **bold** and \n newlines) ────────── */
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    const lines = part.split("\n");
    return lines.map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

/* ─── Typing indicator ───────────────────────────────────────────────────── */
function TypingDots({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
        <span className="chat-dot text-gray-400 dark:text-gray-500" />
        <span className="chat-dot text-gray-400 dark:text-gray-500" />
        <span className="chat-dot text-gray-400 dark:text-gray-500" />
        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{t("chatThinking", lang)}</span>
      </div>
    </div>
  );
}

/* ─── Bot avatar ─────────────────────────────────────────────────────────── */
function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-none shadow-sm">
      {/* Sparkle / AI icon */}
      <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

/* ─── Single message bubble ──────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && <BotAvatar />}
      <div
        className={[
          "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl",
          isUser
            ? "bg-emerald-500 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-tl-sm",
        ].join(" ")}
      >
        {renderContent(msg.content)}
      </div>
    </div>
  );
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface ChatBarProps {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  isThinking: boolean;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSend: (text: string, context?: string) => void;
  onClear: () => void;
  lang: Lang;
  context?: string;
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function ChatBar({
  messages,
  input,
  setInput,
  isThinking,
  isOpen,
  setIsOpen,
  onSend,
  onClear,
  lang,
  context,
}: ChatBarProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMessages = messages.length > 0;

  /* Auto-scroll to bottom when messages change */
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = useCallback(() => {
    if (input.trim()) onSend(input, context);
  }, [input, onSend, context]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") setIsOpen(false);
    },
    [handleSubmit, setIsOpen]
  );

  return (
    <>
      {/* ── Thread panel ──────────────────────────────────────────────────
          Mobile: fixed above bottom nav + chat bar  (z-[22])
          Desktop: fixed panel anchored bottom-right (z-30)
      ─────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop (mobile only, tapping closes panel) */}
          <div
            className="fixed inset-0 z-[21] md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={[
              "animate-chat-panel",
              // Mobile: full-width, sits between header and chat-bar+nav
              "fixed inset-x-0 bottom-[144px] top-[57px]",
              "md:bottom-[72px] md:top-auto md:right-6 md:left-auto md:w-[380px] md:h-[480px] md:rounded-2xl md:shadow-2xl",
              "z-[22] flex flex-col",
              "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
              "md:border md:border-gray-200 md:dark:border-gray-700",
            ].join(" ")}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-none">
              <div className="flex items-center gap-2">
                <BotAvatar />
                <span className="font-semibold text-sm">{t("chatTitle", lang)}</span>
              </div>
              <div className="flex items-center gap-1">
                {hasMessages && (
                  <button
                    onClick={onClear}
                    title={t("chatClear", lang)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t("chatClear", lang)}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={t("chatClose", lang)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Message thread */}
            <div
              ref={threadRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {!hasMessages && !isThinking && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
                    {lang === "es"
                      ? "Preguntame sobre activos, scores, tu portfolio o cómo funcionan las métricas."
                      : "Ask me about assets, scores, your portfolio, or how any metric works."}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isThinking && <TypingDots lang={lang} />}
            </div>

            {/* Disclaimer */}
            <div className="px-4 pb-2 flex-none">
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
                ⚠️ {t("chatDisclaimer", lang)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────
          Mobile: fixed full-width above bottom nav (bottom: 92px)
          Desktop: fixed floating pill bottom-right
      ─────────────────────────────────────────────────────────────────── */}
      <div
        className={[
          // Mobile: full-width bar below nav
          "fixed inset-x-0 bottom-0 z-[19] md:hidden",
          "bg-white/95 dark:bg-gray-900/98 backdrop-blur-md border-t border-gray-200 dark:border-gray-800",
          "px-3 py-2",
        ].join(" ")}
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {/* Collapse caret when open, bot icon when closed */}
          <button
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else if (hasMessages) {
                setIsOpen(true);
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-white flex-none shadow-sm active:scale-95 transition-transform"
            aria-label="Bullia AI"
          >
            {isOpen ? (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => hasMessages && setIsOpen(true)}
            placeholder={t("chatPlaceholder", lang)}
            disabled={isThinking}
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 transition-colors"
          />

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-white flex-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm"
            aria-label="Send"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Desktop: floating chat button + inline panel ───────────────── */}
      <div className="hidden md:block fixed bottom-6 right-6 z-30">
        {/* Floating toggle button (only shown when panel is closed) */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Bullia AI"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}

        {/* Desktop input bar (shown below panel when open, or standalone) */}
        {isOpen && (
          <div className="w-[380px] bg-white/95 dark:bg-gray-900/98 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-none">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatPlaceholder", lang)}
                disabled={isThinking}
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 transition-colors"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isThinking}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500 text-white flex-none disabled:opacity-40 active:scale-95 transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
