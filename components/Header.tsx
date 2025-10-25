import React from 'react';
import { PharmKoLogoIcon } from './icons/PharmKoLogoIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLogout }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <PharmKoLogoIcon className="h-9 w-auto" />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            PharmKo
          </h1>
        </div>
        {isAuthenticated && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            <LogoutIcon className="h-5 w-5" />
            Logout
          </button>
        )}
      </div>
    </header>
  );
};
