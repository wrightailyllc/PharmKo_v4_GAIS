import React, { useState } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleLogin = () => {
    // In a real app, this would involve a call to an authentication service
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <div className="bg-yellow-500 text-black text-center p-2 font-bold">
        This is the new version!
      </div>
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        {isAuthenticated ? (
          <DashboardPage />
        ) : (
          <LandingPage onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
};

export default App;
