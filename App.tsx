import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AuthModal } from './components/AuthModal';
import { ProfileForm } from './components/ProfileForm';
import type { UserProfile, AuthConfig } from './types/auth';

type PageType = 'home' | 'privacy';

const getBackendUrl = () => {
  if (import.meta.env.PROD) {
    return '';
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:8000`;
  }
  
  return 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('pharmko_session_token');
    const storedUser = localStorage.getItem('pharmko_user');
    
    if (storedToken && storedUser) {
      try {
        setSessionToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('pharmko_session_token');
        localStorage.removeItem('pharmko_user');
      }
    }
    
    fetch(`${BACKEND_URL}/api/auth/status`)
      .then(res => res.json())
      .then(data => {
        setAuthConfig({
          enabled: data.auth_enabled,
          google_oauth: data.google_oauth_configured,
          facebook_oauth: data.facebook_oauth_configured,
          database_ready: data.database_ready,
          facebook_app_id: data.facebook_app_id
        });
        
        if (!data.auth_enabled && !storedToken) {
          setIsAuthenticated(true);
        }
      })
      .catch(err => {
        console.error('Failed to fetch auth status:', err);
        setAuthConfig({ enabled: false, google_oauth: false, facebook_oauth: false, database_ready: false });
      })
      .finally(() => setIsLoading(false));
    
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      const isGoogle = window.location.pathname.includes('google');
      const isFacebook = window.location.pathname.includes('facebook');
      
      if (isGoogle) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code, 
              redirect_uri: `${window.location.origin}/auth/google/callback` 
            })
          });
          const data = await response.json();
          if (data.success) {
            handleLoginSuccess(data.user, data.session_token, data.is_new_user);
          } else {
            console.error('Google OAuth error:', data.error);
          }
        } catch (err) {
          console.error('Google OAuth callback error:', err);
        }
      } else if (isFacebook) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/facebook/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code, 
              redirect_uri: `${window.location.origin}/auth/facebook/callback` 
            })
          });
          const data = await response.json();
          if (data.success) {
            handleLoginSuccess(data.user, data.session_token, data.is_new_user);
          } else {
            console.error('Facebook OAuth error:', data.error);
          }
        } catch (err) {
          console.error('Facebook OAuth callback error:', err);
        }
      }
      
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleLoginSuccess = (newUser: UserProfile, token: string, isNew: boolean = false) => {
    setUser(newUser);
    setSessionToken(token);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    
    localStorage.setItem('pharmko_session_token', token);
    localStorage.setItem('pharmko_user', JSON.stringify(newUser));
    
    if (isNew || !newUser.profile_complete) {
      setIsNewUser(isNew);
      setShowProfileForm(true);
    }
  };

  const handleProfileUpdate = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('pharmko_user', JSON.stringify(updatedUser));
    
    if (updatedUser.profile_complete) {
      setShowProfileForm(false);
      setIsNewUser(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    setIsAuthenticated(false);
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('pharmko_session_token');
    localStorage.removeItem('pharmko_user');
  };

  const handleOpenLogin = () => {
    setShowAuthModal(true);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
<<<<<<< HEAD
      <Header 
        isAuthenticated={isAuthenticated} 
        onLogout={handleLogout}
        user={user}
        onEditProfile={() => setShowProfileForm(true)}
      />
=======
      <div className="bg-yellow-500 text-black text-center p-2 font-bold">
        This is the new version!
      </div>
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
>>>>>>> b59e1be9cef879cb564122497a528478ef436ea9
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'privacy' ? (
          <PrivacyPolicy onBack={() => setCurrentPage('home')} />
        ) : isAuthenticated ? (
          <DashboardPage onViewPrivacy={() => setCurrentPage('privacy')} />
        ) : (
          <LandingPage onLogin={handleOpenLogin} />
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        backendUrl={BACKEND_URL}
        facebookAppId={authConfig?.facebook_app_id}
      />

      {showProfileForm && user && sessionToken && (
        <ProfileForm
          user={user}
          sessionToken={sessionToken}
          backendUrl={BACKEND_URL}
          onProfileUpdate={handleProfileUpdate}
          onClose={() => {
            if (!isNewUser) {
              setShowProfileForm(false);
            }
          }}
          isNewUser={isNewUser}
        />
      )}
    </div>
  );
};

export default App;
