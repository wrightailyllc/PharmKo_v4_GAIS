import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { AboutPage } from './pages/AboutPage';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ProfileForm } from './components/ProfileForm';
import type { UserProfile, AuthConfig } from './types/auth';
import { BACKEND_BASE_URL } from './config';

const BACKEND_URL = BACKEND_BASE_URL;

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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
  }, []);

  // Handle OAuth callbacks based on route
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;

    const isGoogle = location.pathname.includes('google');
    const isFacebook = location.pathname.includes('facebook');

    if (isGoogle) {
      handleOAuthCallback('google', code);
    } else if (isFacebook) {
      handleOAuthCallback('facebook', code);
    }
  }, [location.pathname, searchParams]);

  const handleOAuthCallback = useCallback(async (provider: 'google' | 'facebook', code: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/${provider}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}/auth/${provider}/callback`
        })
      });
      const data = await response.json();
      if (data.success) {
        handleLoginSuccess(data.user, data.session_token, data.is_new_user);
      } else {
        console.error(`${provider} OAuth error:`, data.error);
      }
    } catch (err) {
      console.error(`${provider} OAuth callback error:`, err);
    }
    navigate('/', { replace: true });
  }, [navigate]);

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
    navigate('/');
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
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex flex-col">
      <Header
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        user={user}
        onEditProfile={() => setShowProfileForm(true)}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/drug/:drugSlug" element={<DashboardPage />} />
          <Route path="/auth/google/callback" element={<div />} />
          <Route path="/auth/facebook/callback" element={<div />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <DashboardPage />
              ) : (
                <LandingPage onLogin={handleOpenLogin} />
              )
            }
          />
        </Routes>
      </main>
      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        backendUrl={BACKEND_URL}
        facebookOAuthConfigured={authConfig?.facebook_oauth ?? false}
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
