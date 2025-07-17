import React from "react";
import { SessionStatus } from "@/app/types";
import { updateEmployeeStatus } from "@/app/lib/firebase";

interface BottomToolbarProps {
  sessionStatus: string;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (active: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (expanded: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
  isDarkMode?: boolean;
}

export default function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  codec,
  onCodecChange,
  isDarkMode = false
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleCodecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCodec = e.target.value;
    onCodecChange(newCodec);
  };

  const handleUpdateEmployeeStatus = async () => {
    setIsUpdating(true);
    try {
      const success = await updateEmployeeStatus("default_employee", { isKrank: true });
      if (success) {
        alert('Employee status updated successfully!');
      } else {
        alert('Failed to update employee status. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating employee status. Please check the console for details.');
    }
    setIsUpdating(false);
  };

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-md h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      // Connected -> label "Disconnect" -> red
      return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    }
    // Disconnected or connecting -> label is either "Connect" or "Connecting" -> black
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className={`flex items-center gap-4 p-4 border-t transition-colors duration-300 ${
      isDarkMode ? 'border-[#333333] bg-[#1a1a1a]' : 'border-gray-200 bg-white'
    }`}>
      <button
        onClick={onToggleConnection}
        className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
          isConnected
            ? isDarkMode
              ? 'bg-green-900/20 text-green-400'
              : 'bg-green-100 text-green-700'
            : isDarkMode
              ? 'bg-[#333333] text-orange-400 hover:bg-[#404040]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isConnected ? 'Connected' : 'Connect'}
      </button>

      <label className={`flex items-center gap-2 transition-colors duration-300 ${
        isDarkMode ? 'text-orange-300' : 'text-gray-700'
      }`}>
        <input
          type="checkbox"
          checked={isPTTActive}
          onChange={(e) => setIsPTTActive(e.target.checked)}
          className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-0 transition-colors duration-300"
        />
        Push to talk
      </label>

      <button
        onMouseDown={handleTalkButtonDown}
        onMouseUp={handleTalkButtonUp}
        onTouchStart={handleTalkButtonDown}
        onTouchEnd={handleTalkButtonUp}
        disabled={!isPTTActive}
        className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
          !isPTTActive
            ? isDarkMode
              ? 'bg-[#333333]/50 text-orange-400/50 cursor-not-allowed'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isDarkMode
              ? 'bg-[#333333] text-orange-400 hover:bg-[#404040]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Talk
      </button>

      <label className={`flex items-center gap-2 transition-colors duration-300 ${
        isDarkMode ? 'text-orange-300' : 'text-gray-700'
      }`}>
        <input
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
          className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-0 transition-colors duration-300"
        />
        Audio playback
      </label>

      <label className={`flex items-center gap-2 transition-colors duration-300 ${
        isDarkMode ? 'text-orange-300' : 'text-gray-700'
      }`}>
        <input
          type="checkbox"
          checked={isEventsPaneExpanded}
          onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
          className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-0 transition-colors duration-300"
        />
        Logs
      </label>

      <div className="flex items-center gap-2">
        <span className={`transition-colors duration-300 ${
          isDarkMode ? 'text-orange-300' : 'text-gray-700'
        }`}>
          Codec:
        </span>
        <select
          value={codec}
          onChange={(e) => onCodecChange(e.target.value)}
          className={`px-3 py-2 rounded-lg border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1a1a1a] border-[#333333] text-orange-300' 
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <option value="opus">Opus (48 kHz)</option>
          <option value="pcm">PCM (16 kHz)</option>
        </select>
      </div>
    </div>
  );
}
