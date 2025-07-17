import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GearIcon, 
  EnvelopeClosedIcon, 
  ChatBubbleIcon, 
  HomeIcon, 
  SunIcon, 
  MoonIcon, 
  PersonIcon,
  DashboardIcon,
  HamburgerMenuIcon,
  Cross1Icon,
  BarChartIcon
} from '@radix-ui/react-icons';

interface SitePanelProps {
  currentSite: string;
  activeTab?: string;
  onSiteChange: (site: string) => void;
  onTabChange?: (tab: string) => void;
  isDarkMode?: boolean;
  onDarkModeChange?: () => void;
}

// Animation variants
const subMenuVariants = {
  hidden: { 
    opacity: 0,
    height: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  },
  visible: { 
    opacity: 1,
    height: 'auto',
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

const menuItemVariants = {
  hidden: { 
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2
    }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2
    }
  }
};

const SidePanel: React.FC<SitePanelProps> = ({
  currentSite,
  activeTab,
  onSiteChange,
  onTabChange,
  isDarkMode = false,
  onDarkModeChange
}) => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`fixed top-4 left-4 z-50 md:hidden p-3 rounded-lg transition-all duration-300 ${
          isDarkMode 
            ? 'bg-dark-200/90 border border-dark-300 text-light hover:border-accent/50' 
            : 'bg-white/90 border border-light-300 text-dark hover:border-accent/50'
        }`}
      >
        {isMobileMenuOpen ? 
          <Cross1Icon className="w-5 h-5" /> : 
          <HamburgerMenuIcon className="w-5 h-5" />
        }
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-72 z-50 transform transition-transform duration-300 md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isDarkMode 
          ? 'bg-dark-300/95 border-r border-dark-100/20' 
          : 'bg-light-100/95 border-r border-light-300/50'
      } backdrop-blur-xl`}>
        <div className="p-8 h-full flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className={`text-2xl md:text-3xl font-bold font-space ${
                isDarkMode ? 'text-light' : 'text-dark'
              }`}>
                <span className="bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">
                  NEA
                </span>
                <span className="ml-2 font-light">Tools</span>
              </h2>
              {/* Dark Mode Toggle */}
              {onDarkModeChange && (
                <button
                  onClick={onDarkModeChange}
                  className={`p-3 rounded-xl transition-all duration-300 shadow hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                    isDarkMode 
                      ? 'bg-dark-200 border border-gray-700 text-orange-400 hover:bg-dark-300' 
                      : 'bg-white border border-light-300 text-orange-400 hover:bg-orange-50'
                  }`}
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
                  )}
                </button>
              )}
            </div>
            <p className={`text-sm font-inter font-light ${
              isDarkMode ? 'text-light-200' : 'text-light-500'
            }`}>
              Agent Management
            </p>
          </div>

          {/* Main Navigation */}
          <div className="space-y-4 mb-8">
            <div className={`text-xs font-semibold uppercase tracking-wider font-inter mb-4 px-2 ${
              isDarkMode ? 'text-light-300' : 'text-light-500'
            }`}>
              Navigation
            </div>
            
            <button
              onClick={() => {
                onSiteChange('default');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${
                currentSite === 'default'
                  ? 'bg-gradient-to-r from-accent to-orange-500 text-dark font-semibold shadow-lg shadow-orange-400/25'
                  : isDarkMode
                    ? 'bg-dark-200/30 border border-dark-300/50 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-400/10 text-light hover:bg-dark-200/50'
                    : 'bg-white/30 border border-light-300/50 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-400/10 text-dark hover:bg-white/50'
              }`}
            >
              {/* Background glow effect */}
              {currentSite === 'default' && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-orange-500/20 blur-xl" />
              )}
              
              <div className="relative flex items-center gap-4 w-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  currentSite === 'default'
                    ? 'bg-white/20 text-dark'
                    : isDarkMode
                      ? 'bg-dark-300/50 text-orange-400 group-hover:bg-orange-400/10'
                      : 'bg-light-300/50 text-orange-400 group-hover:bg-orange-400/10'
                }`}>
                  <ChatBubbleIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-inter font-medium">Agentic Chat</span>
              </div>
            </button>
            
            <button
              onClick={() => {
                onSiteChange('nea');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${
                currentSite === 'nea'
                  ? 'bg-gradient-to-r from-accent to-orange-500 text-dark font-semibold shadow-lg shadow-orange-400/25'
                  : isDarkMode
                    ? 'bg-dark-200/30 border border-dark-300/50 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-400/10 text-light hover:bg-dark-200/50'
                    : 'bg-white/30 border border-light-300/50 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-400/10 text-dark hover:bg-white/50'
              }`}
            >
              {/* Background glow effect */}
              {currentSite === 'nea' && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-orange-500/20 blur-xl" />
              )}
              
              <div className="relative flex items-center gap-4 w-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  currentSite === 'nea'
                    ? 'bg-white/20 text-dark'
                    : isDarkMode
                      ? 'bg-dark-300/50 text-orange-400 group-hover:bg-orange-400/10'
                      : 'bg-light-300/50 text-orange-400 group-hover:bg-orange-400/10'
                }`}>
                  <HomeIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-inter font-medium">NEA Dashboard</span>
              </div>
            </button>
          </div>

          {/* NEA Sub-Navigation */}
          <AnimatePresence>
            {currentSite === 'nea' && onTabChange && (
              <motion.div 
                className="space-y-4 flex-1"
                variants={subMenuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <motion.div 
                  className={`h-px bg-gradient-to-r from-accent/20 via-orange-400/50 to-orange-500/20 mb-6`}
                  variants={menuItemVariants}
                />
                
                <motion.div 
                  variants={menuItemVariants}
                  className={`text-xs font-semibold uppercase tracking-wider font-inter mb-4 px-2 ${
                    isDarkMode ? 'text-light-300' : 'text-light-500'
                  }`}>
                  Dashboard Sections
                </motion.div>
                
                <motion.button
                  variants={menuItemVariants}
                  onClick={() => {
                    onTabChange('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-accent/20 to-orange-500/20 border border-accent/40 text-accent font-semibold'
                      : isDarkMode
                        ? 'bg-dark-200/20 border border-dark-300/30 hover:border-accent/30 hover:bg-dark-200/30 text-light'
                        : 'bg-white/20 border border-light-300/30 hover:border-accent/30 hover:bg-white/30 text-dark'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === 'dashboard'
                      ? 'bg-accent/20 text-accent'
                      : isDarkMode
                        ? 'bg-dark-300/50 text-light-300 group-hover:text-accent'
                        : 'bg-light-300/50 text-light-500 group-hover:text-accent'
                  }`}>
                    <DashboardIcon className="w-4 h-4" />
                  </div>
                  <span className="font-inter text-sm">Dashboard</span>
                </motion.button>
                
                <motion.button
                  variants={menuItemVariants}
                  onClick={() => {
                    onTabChange('employees');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group ${
                    activeTab === 'employees'
                      ? 'bg-gradient-to-r from-accent/20 to-orange-500/20 border border-accent/40 text-accent font-semibold'
                      : isDarkMode
                        ? 'bg-dark-200/20 border border-dark-300/30 hover:border-accent/30 hover:bg-dark-200/30 text-light'
                        : 'bg-white/20 border border-light-300/30 hover:border-accent/30 hover:bg-white/30 text-dark'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === 'employees'
                      ? 'bg-accent/20 text-accent'
                      : isDarkMode
                        ? 'bg-dark-300/50 text-light-300 group-hover:text-accent'
                        : 'bg-light-300/50 text-light-500 group-hover:text-accent'
                  }`}>
                    <PersonIcon className="w-4 h-4" />
                  </div>
                  <span className="font-inter text-sm">Mitarbeiter</span>
                </motion.button>
                
                <motion.button
                  variants={menuItemVariants}
                  onClick={() => {
                    onTabChange('sick-overview');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group ${
                    activeTab === 'sick-overview'
                      ? 'bg-gradient-to-r from-accent/20 to-orange-500/20 border border-accent/40 text-accent font-semibold'
                      : isDarkMode
                        ? 'bg-dark-200/20 border border-dark-300/30 hover:border-accent/30 hover:bg-dark-200/30 text-light'
                        : 'bg-white/20 border border-light-300/30 hover:border-accent/30 hover:bg-white/30 text-dark'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === 'sick-overview'
                      ? 'bg-accent/20 text-accent'
                      : isDarkMode
                        ? 'bg-dark-300/50 text-light-300 group-hover:text-accent'
                        : 'bg-light-300/50 text-light-500 group-hover:text-accent'
                  }`}>
                                         <BarChartIcon className="w-4 h-4" />
                  </div>
                  <span className="font-inter text-sm">Krankmeldungen</span>
                </motion.button>
                
                <motion.button
                  variants={menuItemVariants}
                  onClick={() => {
                    onTabChange('mail-logs');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group ${
                    activeTab === 'mail-logs'
                      ? 'bg-gradient-to-r from-accent/20 to-orange-500/20 border border-accent/40 text-accent font-semibold'
                      : isDarkMode
                        ? 'bg-dark-200/20 border border-dark-300/30 hover:border-accent/30 hover:bg-dark-200/30 text-light'
                        : 'bg-white/20 border border-light-300/30 hover:border-accent/30 hover:bg-white/30 text-dark'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === 'mail-logs'
                      ? 'bg-accent/20 text-accent'
                      : isDarkMode
                        ? 'bg-dark-300/50 text-light-300 group-hover:text-accent'
                        : 'bg-light-300/50 text-light-500 group-hover:text-accent'
                  }`}>
                    <EnvelopeClosedIcon className="w-4 h-4" />
                  </div>
                  <span className="font-inter text-sm">E-Mail Logs</span>
                </motion.button>
                
                <motion.button
                  variants={menuItemVariants}
                  onClick={() => {
                    onTabChange('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 group ${
                    activeTab === 'settings'
                      ? 'bg-gradient-to-r from-accent/20 to-orange-500/20 border border-accent/40 text-accent font-semibold'
                      : isDarkMode
                        ? 'bg-dark-200/20 border border-dark-300/30 hover:border-accent/30 hover:bg-dark-200/30 text-light'
                        : 'bg-white/20 border border-light-300/30 hover:border-accent/30 hover:bg-white/30 text-dark'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === 'settings'
                      ? 'bg-accent/20 text-accent'
                      : isDarkMode
                        ? 'bg-dark-300/50 text-light-300 group-hover:text-accent'
                        : 'bg-light-300/50 text-light-500 group-hover:text-accent'
                  }`}>
                    <GearIcon className="w-4 h-4" />
                  </div>
                  <span className="font-inter text-sm">Einstellungen</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Company Logo Bottom Section */}
          <div className="mt-auto pt-8">
            <a 
              href="https://s2-ai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center justify-center rounded-2xl p-3 shadow-inner gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                isDarkMode ? 'bg-dark-200/80 hover:bg-dark-200' : 'bg-white/80 hover:bg-white'
              }`}
            >
              <img
                src={isDarkMode ? '/New_Small_White-Red.png' : '/New_Small_Black-Red.png'}
                alt="S2 Software Logo"
                className="w-10 h-10 drop-shadow-lg"
                draggable="false"
              />
              <div className="flex flex-col justify-center">
                <span className={`text-xs font-bold font-space tracking-wide mb-0 ${isDarkMode ? 'text-white' : 'text-black'}`}>S2 <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Software</span></span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Service Up</span>
                  <span className={`text-xs ml-2 ${isDarkMode ? 'text-light-400' : 'text-gray-500'}`}>v2.1.0</span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidePanel; 