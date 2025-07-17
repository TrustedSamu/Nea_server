"use client";

import React, { useRef, useEffect } from 'react';
import { useEvent } from '../contexts/EventContext';
import SickLeaveStats from './SickLeaveStats';

interface EventsProps {
  isExpanded: boolean;
  isDarkMode?: boolean;
}

interface LoggedEvent {
  eventName: string;
  eventData?: any;
  direction: string;
  timestamp: string;
}

export default function Events({ isExpanded, isDarkMode = false }: EventsProps) {
  const { loggedEvents, chartData } = useEvent();
  const eventLogsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop = eventLogsContainerRef.current.scrollHeight;
    }
  }, [loggedEvents]);

  const getDirectionArrow = (direction: string) => {
    switch (direction) {
      case 'outgoing':
        return '↑';
      case 'incoming':
        return '↓';
      default:
        return '•';
    }
  };

  return (
    <div
      className={`${
        isExpanded ? "w-1/2" : "w-0 overflow-hidden opacity-0"
      } transition-all rounded-xl duration-200 ease-in-out flex flex-col h-full ${
        isDarkMode ? 'bg-dark-200/80 backdrop-blur-sm border border-dark-300' : 'bg-white border border-light-300'
      }`}
    >
      {/* Logs Section */}
      <div className="h-1/2 flex flex-col min-h-0">
        <div className={`flex items-center justify-between px-6 py-3.5 border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-dark-300/60 backdrop-blur-sm border-dark-300' 
            : 'bg-light-100 border-light-300'
        }`}>
          <span className={`font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-light' : 'text-dark'
          }`}>
            Logs
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={eventLogsContainerRef}>
          {loggedEvents.map((log: LoggedEvent, idx: number) => {
            const arrowInfo = getDirectionArrow(log.direction);
            const isError =
              log.eventName.toLowerCase().includes("error") ||
              log.eventData?.response?.status_details?.error != null;

            return (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode 
                    ? isError
                      ? 'bg-red-900/20 text-red-400'
                      : 'text-light-200'
                    : isError
                      ? 'bg-red-50 text-red-700'
                      : 'text-dark'
                }`}
              >
                <span className={`font-mono text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-light-300' : 'text-light-500'
                }`}>
                  {log.timestamp}
                </span>
                <span className="font-mono">{arrowInfo}</span>
                <span className="font-mono text-sm break-all">
                  {log.eventName}
                  {log.eventData && (
                    <span className={`block pl-4 font-mono text-xs transition-colors duration-300 ${
                      isDarkMode 
                        ? isError
                          ? 'text-red-400/70'
                          : 'text-light-300/70'
                        : isError
                          ? 'text-red-600/70'
                          : 'text-light-500'
                    }`}>
                      {JSON.stringify(log.eventData, null, 2)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-1/2 flex flex-col min-h-0 border-t">
        <div className={`flex items-center justify-between px-6 py-3.5 border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-dark-300/60 backdrop-blur-sm border-dark-300' 
            : 'bg-light-100 border-light-300'
        }`}>
          <span className={`font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-light' : 'text-dark'
          }`}>
            Statistiken
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {chartData ? (
            <SickLeaveStats
              data={chartData.data}
              title={chartData.title}
              isDarkMode={isDarkMode}
            />
          ) : (
            <div className={`text-center py-12 transition-colors duration-300 ${
              isDarkMode ? 'text-light-300' : 'text-light-500'
            }`}>
              Fragen Sie nach Krankenstatistiken, um sie hier anzuzeigen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
