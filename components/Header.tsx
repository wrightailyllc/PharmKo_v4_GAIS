import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PharmKoLogoIcon } from './icons/PharmKoLogoIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface UserProfile {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
}

interface HeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  user?: UserProfile | null;
  onEditProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLogout, user, onEditProfile }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.first_name || user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
          <PharmKoLogoIcon className="h-9 w-auto" />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            PharmKo
          </h1>
        </Link>
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              {user?.profile_picture_url ? (
                <img 
                  src={user.profile_picture_url} 
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-gray-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-gray-200 font-medium hidden sm:block">{displayName}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  )}
                  <div className="py-1">
                    {onEditProfile && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onEditProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Edit Profile
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
