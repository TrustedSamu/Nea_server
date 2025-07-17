"use-client";

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { GuardrailChip } from './GuardrailChip';
import { DownloadIcon, ClipboardCopyIcon, ArrowUpIcon } from "@radix-ui/react-icons";
import { useTranscript } from '../contexts/TranscriptContext';
import { TranscriptItem } from '../types';

export interface TranscriptProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: () => void;
  downloadRecording?: () => void;
  canSend?: boolean;
  isDarkMode?: boolean;
}

export default function Transcript({
  userText,
  setUserText,
  onSendMessage,
  downloadRecording,
  canSend,
  isDarkMode = false
}: TranscriptProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { transcriptItems } = useTranscript();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptItems]);

  return (
    <div className="flex-grow overflow-y-auto p-6 space-y-4">
      {transcriptItems
        .filter((item) => !item.isHidden)
        .map((item) => {
          const itemId = item.itemId || Math.random().toString();
          const isUser = item.role === "user";
          const timestamp = new Date(
            item.createdAtMs || Date.now()
          ).toLocaleTimeString();
          const guardrailResult = item.guardrailResult;

          const containerClasses = `flex ${
            isUser ? "justify-end" : "justify-start"
          }`;

          const bubbleBase = `px-4 py-3 ${
            isUser
              ? "bg-orange-500 text-white"
              : isDarkMode
              ? "bg-dark-200/80 border border-dark-300 text-light-200"
              : "bg-white border border-light-300 text-dark"
          }`;

          const messageStyle = `mt-1 ${
            isUser ? "text-white" : isDarkMode ? "text-light" : "text-dark"
          }`;

          const displayTitle = item.title || item.data?.content || '';

          return (
            <div key={itemId} className={containerClasses}>
              <div className="max-w-lg">
                <div
                  className={`${bubbleBase} rounded-t-xl ${
                    guardrailResult ? "" : "rounded-b-xl"
                  }`}
                >
                  <div
                    className={`text-xs font-mono ${
                      isUser 
                        ? "text-orange-100" 
                        : isDarkMode 
                        ? "text-light-300" 
                        : "text-light-500"
                    }`}
                  >
                    {timestamp}
                  </div>
                  <div className={`whitespace-pre-wrap ${messageStyle}`}>
                    <ReactMarkdown>{displayTitle}</ReactMarkdown>
                  </div>
                </div>
                {guardrailResult && (
                  <div className="bg-gray-200 px-3 py-2 rounded-b-xl">
                    <GuardrailChip guardrailResult={guardrailResult} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      <div ref={messagesEndRef} />
    </div>
  );
}
