import React, { useEffect, useState } from 'react';
import { getAbsentEmployees, markEmployeeAsPresent } from '../lib/firebase';
import MailLogs from './MailLogs';
import Settings from './Settings';
import ParticleBackground from './ParticleBackground';
import EmployeeManagement from './EmployeeManagement';
import SickLogOverview from './SickLogOverview';
import Dashboard from './Dashboard';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants
const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.5 }
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 }
};

interface AbsentEmployee {
  name: string;
  position: string;
  reason: string;
  reportedAt: string;
}

interface NEASiteProps {
  activeTab?: string;
  onTabChange: (tab: string) => void;
  isDarkMode?: boolean;
  highlightedKpis?: string[];
  onKpiHighlight?: (kpi: string | null) => void;
}

export default function NEASite({ 
  activeTab = 'dashboard', 
  onTabChange, 
  isDarkMode = false,
  highlightedKpis = [],
  onKpiHighlight 
}: NEASiteProps) {
  const [absentEmployees, setAbsentEmployees] = useState<AbsentEmployee[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchAbsentEmployees = async () => {
    const employees = await getAbsentEmployees();
    setAbsentEmployees(employees);
  };

  useEffect(() => {
    fetchAbsentEmployees();
    // Refresh every minute
    const interval = setInterval(() => {
      fetchAbsentEmployees();
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleMarkPresent = async (employeeName: string) => {
    try {
      setIsUpdating(employeeName);
      const success = await markEmployeeAsPresent(employeeName);
      if (success) {
        await fetchAbsentEmployees(); // Refresh the list
      }
    } catch (error) {
      console.error('Error marking employee as present:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'Keine Angabe') return dateString;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrentDate = (date: Date) => {
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${weekday}, ${day}. ${month} ${year}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <motion.div
            key="settings"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
          >
            <Settings isDarkMode={isDarkMode} />
          </motion.div>
        );
      case 'mail-logs':
        return (
          <motion.div
            key="mail-logs"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
          >
            <MailLogs isDarkMode={isDarkMode} />
          </motion.div>
        );
      case 'employees':
        return (
          <motion.div
            key="employees"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
          >
            <EmployeeManagement isDarkMode={isDarkMode} />
          </motion.div>
        );
      case 'sick-overview':
        return (
          <motion.div
            key="sick-overview"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
          >
            <SickLogOverview isDarkMode={isDarkMode} />
          </motion.div>
        );
      default:
        return (
          <motion.div
            key="dashboard"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
          >
            <Dashboard 
              isDarkMode={isDarkMode} 
              highlightedKpis={highlightedKpis}
              onKpiHighlight={onKpiHighlight}
            />
          </motion.div>
        );
    }
  };

  return (
    <motion.div 
      className={`flex flex-col min-h-screen w-full relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-dark via-dark-100 to-dark-200' 
          : 'bg-gradient-to-br from-light-100 via-light-200 to-light-300'
      }`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
        <motion.div 
          className={`w-full h-full ${
            isDarkMode 
              ? 'bg-gradient-to-br from-dark via-dark-100 to-dark-200' 
              : 'bg-gradient-to-br from-light-100 via-light-200 to-light-300'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      </div>
      <ParticleBackground isDarkMode={isDarkMode} />
      <motion.div 
        className="relative flex-1 flex flex-col pt-16 md:pt-0" 
        style={{ zIndex: 2 }}
      >
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
} 