// src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import ChatbotVolt from '../ui/ChatbotVolt';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-volt-bg">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header bar */}
        <Topbar />

        {/* Dynamic Route Pages */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Coach Chatbot "Volt" */}
      <ChatbotVolt />
    </div>
  );
}
export { AppLayout };
