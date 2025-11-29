import React, { useState } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

type PageType = 'home' | 'privacy';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'privacy' ? (
          <PrivacyPolicy onBack={() => setCurrentPage('home')} />
        ) : isAuthenticated ? (
          <DashboardPage onViewPrivacy={() => setCurrentPage('privacy')} />
        ) : (
          <LandingPage onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
};

export default App;
