export interface UserProfile {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_year?: number;
  current_medications?: string;
  profile_complete?: boolean;
  profile_picture_url?: string;
  auth_provider?: 'email' | 'google' | 'facebook';
}

export interface AuthConfig {
  enabled: boolean;
  google_oauth: boolean;
  facebook_oauth: boolean;
  database_ready: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  authConfig: AuthConfig | null;
}

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  session_token?: string;
  is_new_user?: boolean;
  error?: string;
}
