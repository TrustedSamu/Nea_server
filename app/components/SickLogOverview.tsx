import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getYear, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface SickLog {
  id: string;
  name: string;
  reason?: string;
  reportedAt: string;
  status: 'active' | 'resolved';
}

interface DayDetails {
  date: string;
  fullDate: string;
  logs: SickLog[];
}

interface SickLogOverviewProps {
  isDarkMode?: boolean;
}

export default function SickLogOverview({ isDarkMode = false }: SickLogOverviewProps) {
  const [sickLogs, setSickLogs] = useState<SickLog[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedGridMonth, setSelectedGridMonth] = useState<number | null>(null);
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayDetails | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'chart'>('grid');
  const [showDayModal, setShowDayModal] = useState(false);
  const [isBackAnimating, setIsBackAnimating] = useState(false);

  const fetchSickLogs = async () => {
    setIsLoading(true);
    try {
      const sickLogsRef = collection(db, 'sicklogs');
      const q = query(sickLogsRef, orderBy('reportedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SickLog[];
      setSickLogs(logs);

      // Get unique years from logs
      const years = [...new Set(logs.map(log => 
        getYear(parseISO(log.reportedAt))
      ))].sort((a, b) => b - a);
      
      setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
    } catch (error) {
      console.error('Error fetching sick logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSickLogs();
  }, []);

  const monthlyData = useMemo(() => {
    const monthCounts = Array(12).fill(0).map((_, idx) => {
      const date = new Date(selectedYear, idx, 1);
      return {
        month: format(date, 'MMM', { locale: de }),
        count: 0,
        monthIndex: idx
      };
    });

    sickLogs.forEach(log => {
      const date = parseISO(log.reportedAt);
      if (getYear(date) === selectedYear) {
        const monthIdx = date.getMonth();
        monthCounts[monthIdx].count++;
      }
    });

    return monthCounts;
  }, [sickLogs, selectedYear]);

  const dailyData = useMemo(() => {
    if (selectedGridMonth === null) return [];

    const monthDate = new Date(selectedYear, selectedGridMonth, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map((day: Date) => {
      const dayLogs = sickLogs.filter(log => {
        const logDate = parseISO(log.reportedAt);
        return isSameDay(logDate, day);
      });

      return {
        date: format(day, 'd.', { locale: de }),
        fullDate: format(day, 'dd.MM.yyyy', { locale: de }),
        count: dayLogs.length,
        logs: dayLogs
      };
    });
  }, [selectedGridMonth, selectedYear, sickLogs]);

  const yearlyTotal = useMemo(() => {
    return monthlyData.reduce((total, month) => total + month.count, 0);
  }, [monthlyData]);

  // Calculate average sickness rate for comparison
  const averageSicknessRate = useMemo(() => {
    const totalSickDays = monthlyData.reduce((total, month) => total + month.count, 0);
    return totalSickDays / 12; // Average per month
  }, [monthlyData]);

  // Check if month is in the future
  const isMonthInFuture = (monthIndex: number) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    if (selectedYear < currentYear) return false;
    if (selectedYear > currentYear) return true;
    return monthIndex > currentMonth;
  };

  // Format data for bar chart - monthly view
  const barChartData = useMemo(() => {
    return monthlyData.map(month => ({
      name: month.month,
      Krankmeldungen: month.count,
      monthIndex: month.monthIndex
    }));
  }, [monthlyData]);

  // Format data for bar chart - daily view
  const dailyBarChartData = useMemo(() => {
    if (selectedChartMonth === null) return [];
    
    return dailyData.map(day => ({
      name: day.date,
      Krankmeldungen: day.count,
      fullDate: day.fullDate,
      logs: day.logs
    }));
  }, [dailyData, selectedChartMonth]);

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            isDarkMode 
              ? 'bg-dark-200/90 border-dark-300 text-light' 
              : 'bg-white/90 border-light-200 text-dark'
          }`}
        >
          <p className="font-semibold text-lg">{selectedChartMonth !== null ? data.fullDate : label}</p>
          <p className={`text-2xl font-bold ${
            isDarkMode ? 'text-accent' : 'text-orange-600'
          }`}>
            {payload[0].value} Krankmeldungen
          </p>
          {selectedChartMonth !== null && data.count > 0 && (
            <p className="text-sm mt-2 opacity-70">Klicken für Details</p>
          )}
        </motion.div>
      );
    }
    return null;
  };

  // Handle bar click for daily view
  const handleDailyBarClick = (data: any) => {
    if (data && data.logs && data.logs.length > 0) {
      setSelectedDayDetails({
        date: data.name,
        fullDate: data.fullDate,
        logs: data.logs
      });
      setShowDayModal(true);
    }
  };

  // Handle bar click
  const handleBarClick = (data: any) => {
    if (data && typeof data.monthIndex === 'number') {
      setSelectedChartMonth(data.monthIndex);
    }
  };

  const handleGridMonthClick = (monthIndex: number) => {
    setSelectedGridMonth(monthIndex);
  };

  const handleBackToOverview = () => {
    setIsBackAnimating(true);
    
    // Wait for the content to animate up, then reset the view
    setTimeout(() => {
      if (viewMode === 'grid') {
        setSelectedGridMonth(null);
      } else {
        setSelectedChartMonth(null);
      }
      setIsBackAnimating(false);
    }, 400); // Match the animation duration
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-8xl mx-auto">
        {/* Futuristic Header */}
        <motion.div 
          className="mb-16 relative"
          variants={itemVariants}
        >
          {/* Background glow effect */}
          <div className={`absolute inset-0 rounded-3xl blur-3xl opacity-20 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-accent/30 via-orange-400/20 to-orange-500/30' 
              : 'bg-gradient-to-r from-accent/20 via-orange-300/15 to-orange-400/20'
          }`} />
          
          <div className={`relative p-8 md:p-12 rounded-3xl border backdrop-blur-xl ${
            isDarkMode 
              ? 'bg-dark-200/40 border-dark-300/50' 
              : 'bg-white/60 border-light-300/50'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <div>
                  <h1 className={`text-4xl md:text-6xl font-bold font-space mb-2 ${
                    isDarkMode ? 'text-light' : 'text-dark'
                  }`}>
                    <span className={isDarkMode ? 'text-light' : 'text-dark'}>
                      Krankmeldungen{' '}
                    </span>
                    <span className="bg-gradient-to-r from-accent via-orange-400 to-orange-500 bg-clip-text text-transparent">
                      {selectedYear}
                    </span>
                  </h1>
                  <p className={`text-lg md:text-xl font-inter font-light ${
                    isDarkMode ? 'text-light-200' : 'text-light-500'
                  }`}>
                    <span className="bg-gradient-to-r from-accent via-orange-400 to-orange-500 bg-clip-text text-transparent font-semibold">
                      {yearlyTotal}
                    </span>{' '}
                    Gesamt - Übersicht & Analyse
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Toggle */}
                <div className={`flex rounded-2xl overflow-hidden border-2 ${
                  isDarkMode ? 'border-dark-400 bg-dark-300/50' : 'border-orange-200 bg-white/50'
                }`}>
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      setSelectedChartMonth(null);
                    }}
                    className={`px-5 py-2 transition-all duration-300 font-medium text-sm ${
                      viewMode === 'grid'
                        ? isDarkMode
                          ? 'bg-accent text-dark shadow-lg'
                          : 'bg-orange-500 text-white shadow-lg'
                        : isDarkMode
                          ? 'text-light-300 hover:bg-dark-400/50'
                          : 'text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    Kalender
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('chart');
                      setSelectedGridMonth(null);
                    }}
                    className={`px-5 py-2 transition-all duration-300 font-medium text-sm ${
                      viewMode === 'chart'
                        ? isDarkMode
                          ? 'bg-accent text-dark shadow-lg'
                          : 'bg-orange-500 text-white shadow-lg'
                        : isDarkMode
                          ? 'text-light-300 hover:bg-dark-400/50'
                          : 'text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    Analyse
                  </button>
                </div>
                {/* Year Navigation */}
                <div className={`flex items-center gap-1 rounded-2xl border-2 ${
                  isDarkMode ? 'border-dark-400 bg-dark-300/50' : 'border-orange-200 bg-white/50'
                }`}>
                  <button
                    onClick={() => setSelectedYear(prev => Math.max(...availableYears.filter(y => y < prev)))}
                    disabled={selectedYear === Math.min(...availableYears)}
                    className={`p-2 transition-all duration-300 rounded-l-xl text-sm ${
                      isDarkMode 
                        ? 'hover:bg-dark-400/50 disabled:text-dark-500' 
                        : 'hover:bg-orange-50 disabled:text-gray-400'
                    }`}
                  >
                    ←
                  </button>
                  <span className={`px-3 py-1 font-bold text-base ${
                    isDarkMode ? 'text-accent' : 'text-orange-600'
                  }`}>
                    {selectedYear}
                  </span>
                  <button
                    onClick={() => setSelectedYear(prev => Math.min(...availableYears.filter(y => y > prev)))}
                    disabled={selectedYear === Math.max(...availableYears)}
                    className={`p-2 transition-all duration-300 rounded-r-xl text-sm ${
                      isDarkMode 
                        ? 'hover:bg-dark-400/50 disabled:text-dark-500' 
                        : 'hover:bg-orange-50 disabled:text-gray-400'
                    }`}
                  >
                    →
                  </button>
                </div>
                {/* Refresh Button */}
                <button
                  onClick={fetchSickLogs}
                  disabled={isLoading}
                  className={`px-5 py-2 rounded-2xl transition-all duration-300 font-medium text-sm ${
                    isDarkMode 
                      ? 'bg-dark-400/50 text-light hover:bg-dark-400 disabled:opacity-50' 
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50'
                  }`}
                >
                  {isLoading ? 'Lädt...' : 'Aktualisieren'}
                </button>

              </div>
            </div>
          </div>
        </motion.div>

                {/* Main Content Area */}
        <div className="space-y-8">
          {/* Back Button - positioned below header */}
          {((viewMode === 'grid' && selectedGridMonth !== null) || 
            (viewMode === 'chart' && selectedChartMonth !== null)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex justify-start relative z-10"
            >
              <motion.button
                onClick={handleBackToOverview}
                animate={{
                  scale: isBackAnimating ? 1.2 : 1,
                  y: isBackAnimating ? -10 : 0,
                  boxShadow: isBackAnimating 
                    ? "0 20px 40px rgba(0,0,0,0.3)" 
                    : "0 4px 6px rgba(0,0,0,0.1)"
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className={`px-6 py-3 rounded-2xl transition-all duration-300 font-medium text-sm shadow-lg hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-dark-400/50 text-light hover:bg-dark-400 border border-dark-300' 
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200'
                }`}
              >
                ← Zurück zur Übersicht
              </motion.button>
            </motion.div>
          )}
          
          {/* Loading State */}
          {isLoading ? (
          <motion.div 
            className="flex items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className={`w-12 h-12 rounded-full border-4 ${
                isDarkMode ? 'border-dark-400' : 'border-orange-200'
              }`} />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              {viewMode === 'grid' ? (
                selectedGridMonth !== null ? (
                  // Modern Monthly Grid View
                  <motion.div 
                    key="monthly-grid"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: isBackAnimating ? 0 : 1, 
                      y: isBackAnimating ? -100 : 0,
                      x: isBackAnimating ? -200 : 0,
                      scale: isBackAnimating ? 0.8 : 1
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: isBackAnimating ? 0.4 : 0.3, 
                      ease: "easeInOut" 
                    }}
                    className="space-y-4"
                  >
                    {dailyData
                      .filter(day => day.count > 0)
                      .map((day, index) => (
                      <motion.div
                        key={index}
                        variants={itemVariants}
                        className={`rounded-3xl overflow-hidden backdrop-blur-xl ${
                          isDarkMode 
                            ? 'bg-dark-200/60 border border-dark-300/50' 
                            : 'bg-white/70 border border-orange-200/50'
                        }`}
                      >
                        {/* Day Header */}
                        <div className={`px-6 py-4 ${
                          isDarkMode 
                            ? 'bg-gradient-to-r from-dark-300/40 to-dark-400/40' 
                            : 'bg-gradient-to-r from-orange-50/60 to-orange-100/40'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                day.count > 2 
                                  ? 'bg-red-500' 
                                  : 'bg-orange-500'
                              }`} />
                              <div className={`text-xl font-bold ${
                                isDarkMode ? 'text-light' : 'text-dark'
                              }`}>
                                {day.fullDate}
                              </div>
                            </div>
                            <div className={`px-4 py-2 rounded-2xl text-sm font-semibold ${
                              day.count > 2 
                                ? isDarkMode 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                                : isDarkMode 
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              {day.count} Krankmeldungen
                            </div>
                          </div>
                        </div>

                        {/* Employee List */}
                        <div className="p-2">
                          {day.logs.map((log, logIndex) => (
                            <motion.div 
                              key={logIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: logIndex * 0.05 }}
                              className={`mx-2 mb-2 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                                isDarkMode 
                                  ? 'bg-dark-300/40 hover:bg-dark-300/60 border border-dark-400/30' 
                                  : 'bg-white/50 hover:bg-white/80 border border-orange-200/30'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold text-lg mb-1 ${
                                    isDarkMode ? 'text-light' : 'text-dark'
                                  }`}>
                                    {log.name}
                                  </div>
                                  {log.reason && (
                                    <div className={`text-sm leading-relaxed ${
                                      isDarkMode ? 'text-light-300' : 'text-orange-600'
                                    }`}>
                                      {log.reason}
                                    </div>
                                  )}
                                </div>
                                <div className={`ml-4 px-4 py-2 rounded-2xl text-sm font-medium ${
                                  log.status === 'active'
                                    ? isDarkMode
                                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                                    : isDarkMode
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                  {log.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                    {dailyData.filter(day => day.count > 0).length === 0 && (
                      <motion.div 
                        variants={itemVariants}
                        className={`p-12 text-center rounded-3xl border-2 ${
                          isDarkMode 
                            ? 'bg-dark-200/30 border-dark-400 text-light-300' 
                            : 'bg-white/50 border-orange-200 text-orange-600'
                        }`}
                      >
                        <div className="text-6xl mb-4">📅</div>
                        <div className="text-xl font-medium">Keine Krankmeldungen</div>
                        <div className="text-sm opacity-70">in diesem Monat</div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  // Modern Year Overview Grid
                  <motion.div 
                    key="year-overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
                  >
                    {monthlyData.map((month, index) => {
                      const isFuture = isMonthInFuture(index);
                      const isAboveAverage = month.count > averageSicknessRate;
                      const isHighRate = month.count > averageSicknessRate * 1.5;
                      
                                             // Dynamic gradient based on sickness rate
                       const getCardGradient = () => {
                         if (isFuture) {
                           return isDarkMode 
                             ? 'from-dark-200/80 to-dark-300/80' 
                             : 'from-white/80 to-orange-50/80';
                         }
                         if (isHighRate) {
                           return isDarkMode 
                             ? 'from-red-500/30 via-orange-500/25 to-orange-400/20' 
                             : 'from-red-100/90 via-orange-100/80 to-orange-50/90';
                         }
                         if (isAboveAverage) {
                           return isDarkMode 
                             ? 'from-orange-500/25 via-accent/20 to-orange-400/15' 
                             : 'from-orange-100/85 via-orange-50/75 to-white/85';
                         }
                         return isDarkMode 
                           ? 'from-dark-200/85 to-dark-300/85' 
                           : 'from-white/90 to-orange-50/90';
                       };

                      const getBorderColor = () => {
                        if (isFuture) {
                          return isDarkMode ? 'border-dark-300/30' : 'border-orange-100/30';
                        }
                        if (isHighRate) {
                          return isDarkMode ? 'border-red-500/40' : 'border-red-300/60';
                        }
                        if (isAboveAverage) {
                          return isDarkMode ? 'border-orange-500/40' : 'border-orange-300/60';
                        }
                        return isDarkMode ? 'border-dark-400' : 'border-orange-200';
                      };

                      return (
                        <motion.button
                          key={month.month}
                          variants={itemVariants}
                          onClick={() => !isFuture && handleGridMonthClick(index)}
                          disabled={isFuture}
                          className={`p-6 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:scale-105 group relative overflow-hidden ${
                            isFuture 
                              ? 'cursor-not-allowed opacity-50 blur-[0.5px]' 
                              : 'cursor-pointer'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${getCardGradient().split(' ').map(c => {
                              if (c.includes('from-')) return c.replace('from-', '');
                              if (c.includes('to-')) return c.replace('to-', '');
                              if (c.includes('via-')) return c.replace('via-', '');
                              return c;
                            }).join(', ')})`
                          }}
                        >
                          {/* Background glow effect for high rates */}
                          {isHighRate && !isFuture && (
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/5 blur-xl" />
                          )}
                          
                          {/* Future month overlay */}
                          {isFuture && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${
                              isDarkMode 
                                ? 'from-dark-300/20 to-dark-400/20' 
                                : 'from-white/40 to-orange-50/40'
                            } backdrop-blur-sm`} />
                          )}

                          <div className={`relative z-10 flex flex-col h-full ${getBorderColor()}`}>
                            <div className={`text-xl font-bold mb-3 ${
                              isFuture 
                                ? isDarkMode ? 'text-light-400' : 'text-orange-300'
                                : isDarkMode ? 'text-accent' : 'text-orange-600'
                            }`}>
                              {month.month}
                            </div>
                            <div className={`text-4xl font-bold mb-2 ${
                              isFuture 
                                ? isDarkMode ? 'text-light-400' : 'text-orange-300'
                                : isDarkMode ? 'text-light' : 'text-dark'
                            }`}>
                              {month.count}
                            </div>
                            <div className={`text-sm ${
                              isFuture 
                                ? isDarkMode ? 'text-light-400' : 'text-orange-300'
                                : isDarkMode ? 'text-light-300' : 'text-orange-500'
                            }`}>
                              Krankmeldungen
                            </div>
                            
                            <div className="flex-1" /> {/* Spacer to push content to top */}
                            
                            {/* Dynamic progress bar */}
                            {!isFuture && month.count > 0 && (
                              <div className="mt-4 space-y-1">
                                <div className={`h-1.5 rounded-full bg-gradient-to-r ${
                                  isHighRate 
                                    ? 'from-red-500 to-orange-500' 
                                    : isAboveAverage 
                                      ? 'from-orange-500 to-accent' 
                                      : 'from-accent to-orange-400'
                                } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out`} />
                                <div className={`h-0.5 rounded-full bg-gradient-to-r ${
                                  isHighRate 
                                    ? 'from-red-400/50 to-orange-400/50' 
                                    : isAboveAverage 
                                      ? 'from-orange-400/50 to-accent/50' 
                                      : 'from-accent/50 to-orange-300/50'
                                } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out delay-100`} />
                              </div>
                            )}
                            
                            {/* Future indicator */}
                            {isFuture && (
                              <div className={`mt-3 text-xs font-medium ${
                                isDarkMode ? 'text-light-400' : 'text-orange-400'
                              }`}>
                                Kommend
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )
              ) : (
                // Modern Chart View
                <motion.div 
                  key="chart-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: isBackAnimating ? 0 : 1, 
                    y: isBackAnimating ? -100 : 0,
                    x: isBackAnimating ? -200 : 0,
                    scale: isBackAnimating ? 0.8 : 1
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: isBackAnimating ? 0.4 : 0.3, 
                    ease: "easeInOut" 
                  }}
                  className={`p-8 rounded-3xl border-2 transition-all duration-300 h-full ${
                    isDarkMode 
                      ? 'bg-dark-200/50 border-dark-400' 
                      : 'bg-white/70 border-orange-200'
                  }`}
                >
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedChartMonth !== null ? (
                        <BarChart 
                          data={dailyBarChartData}
                          onClick={handleDailyBarClick}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
                          />
                          <XAxis 
                            dataKey="name" 
                            tick={{ 
                              fill: isDarkMode ? '#fb923c' : '#9a3412',
                              fontSize: 14,
                              fontWeight: 500
                            }}
                            interval={0}
                            padding={{ left: 20, right: 20 }}
                          />
                          <YAxis 
                            tick={{ 
                              fill: isDarkMode ? '#fb923c' : '#9a3412',
                              fontSize: 14,
                              fontWeight: 500
                            }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="Krankmeldungen" 
                            fill={isDarkMode ? '#fb923c' : '#f97316'} 
                            radius={[8, 8, 0, 0]}
                            className="hover:opacity-80 cursor-pointer"
                          />
                        </BarChart>
                      ) : (
                        <BarChart 
                          data={barChartData}
                          onClick={handleBarClick}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
                          />
                          <XAxis 
                            dataKey="name" 
                            tick={{ 
                              fill: isDarkMode ? '#fb923c' : '#9a3412',
                              fontSize: 14,
                              fontWeight: 500
                            }}
                            interval={0}
                            padding={{ left: 20, right: 20 }}
                          />
                          <YAxis 
                            tick={{ 
                              fill: isDarkMode ? '#fb923c' : '#9a3412',
                              fontSize: 14,
                              fontWeight: 500
                            }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="Krankmeldungen" 
                            fill={isDarkMode ? '#fb923c' : '#f97316'} 
                            radius={[8, 8, 0, 0]}
                            className="hover:opacity-80 cursor-pointer"
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      </div>

      {/* Day Details Modal */}
      <AnimatePresence>
        {showDayModal && selectedDayDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDayModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-3xl border-2 shadow-2xl ${
                isDarkMode 
                  ? 'bg-dark-200 border-dark-400' 
                  : 'bg-white border-orange-200'
              }`}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-accent' : 'text-orange-600'
                  }`}>
                    {selectedDayDetails.fullDate}
                  </h3>
                  <button
                    onClick={() => setShowDayModal(false)}
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-dark-400 text-light-300' 
                        : 'hover:bg-orange-100 text-orange-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  {selectedDayDetails.logs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-2xl border ${
                        isDarkMode 
                          ? 'bg-dark-300/50 border-dark-400' 
                          : 'bg-orange-50/50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-semibold text-lg ${
                            isDarkMode ? 'text-light' : 'text-dark'
                          }`}>
                            {log.name}
                          </div>
                          {log.reason && (
                            <div className={`text-sm mt-1 ${
                              isDarkMode ? 'text-light-300' : 'text-orange-600'
                            }`}>
                              {log.reason}
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.status === 'active'
                            ? isDarkMode
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                            : isDarkMode
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {log.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 