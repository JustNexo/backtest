import React, { useState } from 'react';
import { ChartProvider } from './context/ChartContext';
import { TopBar } from './components/Header/TopBar';
import { LeftToolRail } from './components/Toolbar/LeftToolRail';
import { TradingViewChart } from './components/Chart/TradingViewChart';
import { ReplayToolbar } from './components/Replay/ReplayToolbar';
import { TradingPanel } from './components/Trading/TradingPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { GoToDateModal } from './components/Header/GoToDateModal';

export const AppContent: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#131722] text-[#d1d4dc]">
      {/* Top TradingView Navigation Bar */}
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDateModal={() => setIsDateModalOpen(true)}
      />

      {/* Main Chart Workspace */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left TradingView Tool Rail */}
        <LeftToolRail />

        {/* Central Chart & Replay Toolbar */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <ReplayToolbar />
          <div className="flex-1 relative overflow-hidden">
            <TradingViewChart />
          </div>
        </div>
      </div>

      {/* Bottom Collapsible Strategy Tester & Paper Trading Panel */}
      <TradingPanel />

      {/* Settings & Date Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <GoToDateModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ChartProvider>
      <AppContent />
    </ChartProvider>
  );
}
