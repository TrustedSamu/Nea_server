import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EnvelopeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/solid';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEmployees } from '../lib/employeeUtils';
import { getSickLogs } from '../lib/sickLogUtils';
import { motion, Variants } from 'framer-motion';
import { easeInOut } from 'framer-motion';

interface DashboardProps {
  isDarkMode?: boolean;
  highlightedKpis?: string[];
  onKpiHighlight?: (kpi: string | null) => void;
}

interface KPIData {
  totalEmployees: number;
  activeSickLeave: number;
  totalSickLeaveThisMonth: number;
  pendingMailLogs: number;
  sicknessRate: number;
  totalSickLeaveDays: number;
}

interface MailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'success' | 'failed';
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const kpiGridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const mailLogsContainerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.8,
      duration: 0.4,
      ease: easeInOut
    }
  }
};

const mailLogsGridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "tween",
      ease: easeInOut,
      duration: 0.3
    }
  }
};

const mailLogCardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: easeInOut
    }
  }
};

const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'accent',
  onClick,
  isDarkMode = true,
  isHighlighted = false
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: { value: number; isPositive: boolean };
  color?: string;
  onClick?: () => void;
  isDarkMode?: boolean;
  isHighlighted?: boolean;
}) => {
  const colorClasses = isDarkMode ? {
    accent: `${isHighlighted ? 'from-accent/40 via-orange-500/30 to-orange-400/20 border-accent scale-105' : 'from-accent/20 via-orange-500/15 to-orange-400/5 border-accent/30'} hover:border-orange-400/50`,
    blue: `${isHighlighted ? 'from-blue-500/40 via-orange-400/30 to-orange-300/20 border-blue-500 scale-105' : 'from-blue-500/20 via-orange-400/10 to-orange-300/5 border-blue-500/30'} hover:border-orange-400/50`,
    green: `${isHighlighted ? 'from-green-500/40 via-orange-400/30 to-orange-300/20 border-green-500 scale-105' : 'from-green-500/20 via-orange-400/10 to-orange-300/5 border-green-500/30'} hover:border-orange-400/50`,
    yellow: `${isHighlighted ? 'from-yellow-500/40 via-orange-400/30 to-orange-300/20 border-yellow-500 scale-105' : 'from-yellow-500/20 via-orange-400/15 to-orange-300/10 border-yellow-500/30'} hover:border-orange-400/50`,
    purple: `${isHighlighted ? 'from-purple-500/40 via-orange-400/30 to-orange-300/20 border-purple-500 scale-105' : 'from-purple-500/20 via-orange-400/10 to-orange-300/5 border-purple-500/30'} hover:border-orange-400/50`,
  } : {
    accent: `${isHighlighted ? 'from-orange-200 via-orange-100 to-white border-orange-400 scale-105 shadow-xl' : 'from-orange-100 via-orange-50 to-white border-orange-200'} hover:border-orange-300 shadow-lg`,
    blue: `${isHighlighted ? 'from-blue-200 via-blue-100 to-white border-blue-400 scale-105 shadow-xl' : 'from-blue-100 via-blue-50 to-white border-blue-200'} hover:border-orange-300 shadow-lg`,
    green: `${isHighlighted ? 'from-green-200 via-green-100 to-white border-green-400 scale-105 shadow-xl' : 'from-green-100 via-green-50 to-white border-green-200'} hover:border-orange-300 shadow-lg`,
    yellow: `${isHighlighted ? 'from-yellow-200 via-yellow-100 to-white border-yellow-400 scale-105 shadow-xl' : 'from-yellow-100 via-yellow-50 to-white border-yellow-200'} hover:border-orange-300 shadow-lg`,
    purple: `${isHighlighted ? 'from-purple-200 via-purple-100 to-white border-purple-400 scale-105 shadow-xl' : 'from-purple-100 via-purple-50 to-white border-purple-200'} hover:border-orange-300 shadow-lg`,
  };

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={`kpi-card bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.accent} cursor-pointer group relative overflow-visible transition-all duration-300 ${isHighlighted ? 'border-2 border-orange-500' : 'border border-transparent'}`}
      onClick={onClick}
      animate={isHighlighted ? { scale: 1.06 } : { scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <motion.p 
            className={`text-sm font-medium mb-1 font-inter ${isDarkMode ? 'text-light-200' : 'text-gray-700'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.p>
          <motion.h3 
            className={`text-3xl font-bold font-space mb-2 ${isDarkMode ? 'text-light' : 'text-gray-900'}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {value}
          </motion.h3>
          <motion.p 
            className={`text-sm font-inter ${isDarkMode ? 'text-light-300' : 'text-gray-600'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {subtitle}
          </motion.p>
        </div>
        <motion.div 
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.accent}`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Icon className={`w-6 h-6 ${isDarkMode ? 'text-light' : 'text-gray-700'}`} />
        </motion.div>
      </div>
      
      {trend && (
        <motion.div 
          className={`flex items-center mt-4 pt-4 border-t ${isDarkMode ? 'border-light/10' : 'border-dark/10'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ArrowTrendingUpIcon 
            className={`w-4 h-4 mr-2 ${
              trend.isPositive ? 'text-green-400' : 'text-red-400 transform rotate-180'
            }`} 
          />
          <span className={`text-sm font-medium ${
            trend.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {Math.abs(trend.value)}%
          </span>
          <span className={`text-sm ml-2 ${isDarkMode ? 'text-light-300' : 'text-gray-600'}`}>
            vs. letzter Monat
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

// Helper functions for email processing
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
};

const extractReasonFromBody = (body: string): string => {
  if (!body) return 'Keine Angabe';
  
  // Extract reason from HTML table format (from supervisorAgent.ts)
  const tableReasonMatch = body.match(/<td class="info-label">Grund<\/td>\s*<td class="info-value">([^<]+)<\/td>/);
  if (tableReasonMatch && tableReasonMatch[1]) {
    return tableReasonMatch[1].trim();
  }
  
  // Extract reason from HTML body using regex
  const reasonMatch = body.match(/<p><strong>Grund:<\/strong>\s*([^<]+)<\/p>/);
  if (reasonMatch && reasonMatch[1]) {
    return reasonMatch[1].trim();
  }
  
  // Fallback: try to extract from different HTML patterns
  const altReasonMatch = body.match(/Grund:\s*([^<\n]+)/);
  if (altReasonMatch && altReasonMatch[1]) {
    return altReasonMatch[1].trim();
  }
  
  // Try to extract from plain text
  const plainTextMatch = body.match(/Grund:\s*([^\n\r]+)/);
  if (plainTextMatch && plainTextMatch[1]) {
    return plainTextMatch[1].trim();
  }
  
  return 'Keine Angabe';
};

const MailLogCard = ({ mailLog, isDarkMode }: { mailLog: MailLog; isDarkMode: boolean }) => {
  const reason = extractReasonFromBody(mailLog.body);

  return (
    <motion.div 
      variants={mailLogCardVariants}
      className={`p-4 rounded-lg border ${
        isDarkMode 
          ? 'bg-dark-200/50 border-dark-300 hover:border-accent/50' 
          : 'bg-white border-orange-200 hover:border-orange-300 shadow-md'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            mailLog.status === 'success' 
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {mailLog.status === 'success' ? 'Gesendet' : 'Fehler'}
          </span>
          <span className={`text-xs font-medium ${isDarkMode ? 'text-light-300' : 'text-orange-600'}`}>
            {formatDate(mailLog.sentAt)}
          </span>
        </div>
        <h4 className={`font-bold text-sm line-clamp-2 ${isDarkMode ? 'text-light' : 'text-gray-900'}`}>
          {mailLog.subject}
        </h4>
        <p className={`text-xs font-medium ${isDarkMode ? 'text-accent' : 'text-orange-700'}`}>
          Grund: {reason}
        </p>
      </div>
    </motion.div>
  );
};

export default function Dashboard({ isDarkMode = true, highlightedKpis = [], onKpiHighlight }: DashboardProps) {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalEmployees: 0,
    activeSickLeave: 0,
    totalSickLeaveThisMonth: 0,
    pendingMailLogs: 0,
    sicknessRate: 0,
    totalSickLeaveDays: 0,
  });
  const [recentMailLogs, setRecentMailLogs] = useState<MailLog[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Add effect to handle highlighting timeouts
  useEffect(() => {
    if (highlightedKpis.length > 0 && onKpiHighlight) {
      const timer = setTimeout(() => {
        onKpiHighlight(null);
      }, 8000); // Reset highlight after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [highlightedKpis, onKpiHighlight]);

  useEffect(() => {
    // Set initial time only on client side to prevent hydration mismatch
    setCurrentTime(new Date());
    
    // Update time every 30 seconds
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const employees = await getEmployees();
      const totalEmployees = employees.length;
      
      // Fetch sick logs
      const sickLogs = await getSickLogs();
      const activeSickLeave = sickLogs.length;
      
      // Calculate sick leave this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthSickLogs = sickLogs.filter(log => {
        const logDate = new Date(log.reportedAt);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      });
      
      // Calculate sickness rate
      const sicknessRate = totalEmployees > 0 ? (activeSickLeave / totalEmployees) * 100 : 0;
      
      // Fetch mail logs
      const mailLogsSnapshot = await getDocs(
        query(collection(db, 'mailLogs'), orderBy('sentAt', 'desc'), limit(5))
      );
      const mailLogs = mailLogsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MailLog[];
      
      setKpiData({
        totalEmployees,
        activeSickLeave,
        totalSickLeaveThisMonth: thisMonthSickLogs.length,
        pendingMailLogs: mailLogs.filter(log => log.status === 'failed').length,
        sicknessRate: Math.round(sicknessRate * 10) / 10,
        totalSickLeaveDays: sickLogs.length // Simplified calculation
      });
      
      setRecentMailLogs(mailLogs);
    } catch (error) {
      // Suppress permission errors during development
      if (error instanceof Error && !error.message.includes('Permission denied')) {
        console.error('Error fetching real data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrentTime = () => {
    if (!currentTime) return ''; // Return empty string during server-side rendering
    const isMobile = window.innerWidth < 768; // Basic mobile check
    const formatStr = isMobile 
      ? 'dd. MMMM HH:mm'
      : 'EEEE, dd. MMMM yyyy - HH:mm:ss';
    return format(currentTime, formatStr, { locale: de });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-screen p-6 md:p-8 lg:p-12"
    >
      <div className="max-w-8xl mx-auto">
        {/* Futuristic Header */}
        <motion.div 
          className="mb-16 relative"
          variants={cardVariants}
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
                    <span className="bg-gradient-to-r from-accent via-orange-400 to-orange-500 bg-clip-text text-transparent">
                      NEA
                    </span>
                    <span className="ml-4 font-light">Dashboard</span>
                  </h1>
                  <p className={`text-lg md:text-xl font-inter font-light ${
                    isDarkMode ? 'text-light-200' : 'text-light-500'
                  }`}>
                    Real-time insights & analytics
                  </p>
                </div>
              </div>
              
              <div className={`text-right space-y-2 ${
                isDarkMode ? 'text-light-300' : 'text-light-500'
              }`}>
                <div className="text-sm font-inter font-medium uppercase tracking-wider opacity-70">
                  Letzte Aktualisierung
                </div>
                <div className="text-lg md:text-xl font-mono font-light">
                  {formatCurrentTime()}
                </div>
                <div className={`w-full h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30`} />
              </div>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full border-4 ${
                isDarkMode ? 'border-dark-300' : 'border-light-300'
              }`} />
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <div className="absolute inset-2 w-20 h-20 rounded-full border-4 border-orange-400 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Grid with improved spacing */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 mb-16"
              variants={kpiGridVariants}
            >
              <KPICard
                title="Gesamte Mitarbeiter"
                value={kpiData.totalEmployees}
                subtitle="Registrierte Mitarbeiter"
                icon={UserGroupIcon}
                color="blue"
                trend={{ value: 2.3, isPositive: true }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('totalEmployees')}
              />
              
              <KPICard
                title="Aktuelle Krankmeldungen"
                value={kpiData.activeSickLeave}
                subtitle="Derzeit krankgeschrieben"
                icon={ExclamationTriangleIcon}
                color="accent"
                trend={{ value: 12, isPositive: false }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('activeSickLeave')}
              />
              
              <KPICard
                title="Krankmeldungen Monat"
                value={kpiData.totalSickLeaveThisMonth}
                subtitle="Neue Krankmeldungen"
                icon={ChartBarIcon}
                color="yellow"
                trend={{ value: 8.1, isPositive: false }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('totalSickLeaveThisMonth')}
              />
              
              <KPICard
                title="Krankheitsrate"
                value={`${kpiData.sicknessRate}%`}
                subtitle="Aktuelle Rate"
                icon={ArrowTrendingUpIcon}
                color="purple"
                trend={{ value: 3.2, isPositive: false }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('sicknessRate')}
              />
              
              <KPICard
                title="E-Mail Fehler"
                value={kpiData.pendingMailLogs}
                subtitle="Fehlgeschlagene Sendungen"
                icon={EnvelopeIcon}
                color="green"
                trend={{ value: 15, isPositive: true }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('pendingMailLogs')}
              />
              
              <KPICard
                title="Gesamte Krankheitstage"
                value={kpiData.totalSickLeaveDays}
                subtitle="Alle erfassten Fälle"
                icon={ClockIcon}
                color="accent"
                trend={{ value: 5.7, isPositive: false }}
                isDarkMode={isDarkMode}
                isHighlighted={highlightedKpis.includes('totalSickLeaveDays')}
              />
            </motion.div>

            {/* iOS Widget-style Email Section */}
            <motion.div 
              variants={mailLogsContainerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {/* Compact Header */}
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-accent/20 to-orange-500/20 border border-accent/30' 
                      : 'bg-gradient-to-br from-accent/10 to-orange-400/10 border border-accent/20'
                  }`}>
                    <EnvelopeIcon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold font-space ${
                      isDarkMode ? 'text-light' : 'text-dark'
                    }`}>
                      E-Mail Status
                    </h2>
                    <p className={`text-xs font-inter font-light ${
                      isDarkMode ? 'text-light-300' : 'text-light-500'
                    }`}>
                      {recentMailLogs.length} Protokolle
                    </p>
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                  kpiData.pendingMailLogs > 0
                    ? isDarkMode 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                    : isDarkMode 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    kpiData.pendingMailLogs > 0 ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  {kpiData.pendingMailLogs > 0 ? `${kpiData.pendingMailLogs} Fehler` : 'OK'}
                </div>
              </motion.div>
              
              {/* iOS Widget-style Email Cards */}
              {recentMailLogs.length > 0 ? (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
                  variants={mailLogsGridVariants}
                >
                  {recentMailLogs.map((mailLog, index) => (
                    <motion.div
                      key={mailLog.id}
                      variants={mailLogCardVariants}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-dark-200/60 via-dark-300/40 to-dark-200/60 border-dark-400/50 hover:border-accent/30' 
                          : 'bg-gradient-to-br from-white/70 via-orange-50/30 to-white/70 border-orange-200/50 hover:border-accent/30'
                      }`}
                    >
                      {/* Status indicator line */}
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                        mailLog.status === 'success'
                          ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`} />
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium mb-1 truncate ${
                              isDarkMode ? 'text-light-200' : 'text-gray-700'
                            }`}>
                              {mailLog.to}
                            </div>
                            <div className={`text-sm font-bold font-space mb-2 line-clamp-2 ${
                              isDarkMode ? 'text-light' : 'text-dark'
                            }`}>
                              {mailLog.subject}
                            </div>
                          </div>
                          <div className={`ml-2 px-1.5 py-0.5 rounded-lg text-xs font-medium ${
                            mailLog.status === 'success'
                              ? isDarkMode
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-green-100 text-green-700 border border-green-200'
                              : isDarkMode
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {mailLog.status === 'success' ? '✓' : '✗'}
                          </div>
                        </div>
                        
                        <div className={`text-xs leading-relaxed mb-2 line-clamp-2 ${
                          isDarkMode ? 'text-light-300' : 'text-gray-600'
                        }`}>
                          {extractReasonFromBody(mailLog.body)}
                        </div>
                        
                        <div className={`text-xs font-mono ${
                          isDarkMode ? 'text-light-400' : 'text-gray-500'
                        }`}>
                          {formatDate(mailLog.sentAt)}
                        </div>
                      </div>
                      
                      {/* Hover effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  className={`text-center py-8 rounded-2xl border backdrop-blur-xl ${
                    isDarkMode 
                      ? 'bg-dark-200/40 border-dark-300/50 text-light-300' 
                      : 'bg-white/60 border-light-300/50 text-light-500'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  <div className={`w-8 h-8 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    isDarkMode 
                      ? 'bg-dark-300/50 border border-dark-300' 
                      : 'bg-light-300/50 border border-light-300'
                  }`}>
                    <EnvelopeIcon className="w-4 h-4 opacity-50" />
                  </div>
                  <p className="text-sm font-inter font-light">Keine E-Mails</p>
                  <p className="text-xs opacity-70 mt-1">System OK</p>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
} 