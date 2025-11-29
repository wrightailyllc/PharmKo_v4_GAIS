"""
Authentication Service for PharmKo
Provides Google OAuth, Facebook OAuth, and email/password authentication
Stores user data in Google Cloud SQL
"""
import os
import json
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import requests

logger = logging.getLogger(__name__)

GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v18.0"

def _hash_password(password: str, salt: str = None) -> Tuple[str, str]:
    """Hash password with salt using SHA-256"""
    if salt is None:
        salt = secrets.token_hex(32)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hashed.hex(), salt

def _verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify password against stored hash"""
    computed_hash, _ = _hash_password(password, salt)
    return computed_hash == stored_hash

def _generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(64)


class AuthService:
    def __init__(self, execute_query_func, execute_write_func, is_sql_configured_func):
        self.execute_query = execute_query_func
        self.execute_write = execute_write_func
        self.is_sql_configured = is_sql_configured_func
        self._auth_enabled = True
        self._sessions = {}
        
    def initialize_tables(self):
        """Create user tables in Cloud SQL if they don't exist"""
        if not self.is_sql_configured():
            logger.warning("Cloud SQL not configured - auth tables not created")
            return False
        
        try:
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                city VARCHAR(100),
                state VARCHAR(50),
                zip_code VARCHAR(20),
                birth_year INTEGER,
                current_medications TEXT,
                password_hash VARCHAR(255),
                password_salt VARCHAR(255),
                auth_provider VARCHAR(50) DEFAULT 'email',
                oauth_id VARCHAR(255),
                profile_picture_url TEXT,
                email_verified BOOLEAN DEFAULT FALSE,
                profile_complete BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
            """
            self.execute_write(create_users_table)
            
            create_sessions_table = """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            self.execute_write(create_sessions_table)
            
            logger.info("Auth tables initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize auth tables: {e}")
            return False
    
    def set_auth_enabled(self, enabled: bool):
        """Enable or disable authentication requirement"""
        self._auth_enabled = enabled
        logger.info(f"Authentication {'enabled' if enabled else 'disabled'}")
    
    def is_auth_enabled(self) -> bool:
        """Check if authentication is enabled"""
        return self._auth_enabled
    
    def register_email(self, email: str, password: str, username: str = None) -> Dict[str, Any]:
        """Register a new user with email/password"""
        if not self.is_sql_configured():
            return {"success": False, "error": "Database not configured"}
        
        try:
            existing = self.execute_query(
                "SELECT id FROM users WHERE email = :email",
                {"email": email}
            )
            if existing:
                return {"success": False, "error": "Email already registered"}
            
            password_hash, password_salt = _hash_password(password)
            
            self.execute_write(
                """INSERT INTO users (email, username, password_hash, password_salt, auth_provider, email_verified)
                   VALUES (:email, :username, :password_hash, :password_salt, 'email', FALSE)""",
                {"email": email, "username": username or email.split('@')[0], "password_hash": password_hash, "password_salt": password_salt}
            )
            
            user = self.execute_query(
                "SELECT id, email, username FROM users WHERE email = :email",
                {"email": email}
            )
            
            if user:
                session_token = self._create_session(user[0]['id'])
                return {
                    "success": True,
                    "user": {
                        "id": user[0]['id'],
                        "email": user[0]['email'],
                        "username": user[0]['username'],
                        "profile_complete": False
                    },
                    "session_token": session_token
                }
            
            return {"success": False, "error": "Failed to create user"}
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return {"success": False, "error": str(e)}
    
    def login_email(self, email: str, password: str) -> Dict[str, Any]:
        """Login with email/password"""
        if not self.is_sql_configured():
            return {"success": False, "error": "Database not configured"}
        
        try:
            user = self.execute_query(
                """SELECT id, email, username, first_name, last_name, password_hash, password_salt, 
                          profile_complete, profile_picture_url
                   FROM users WHERE email = :email AND auth_provider = 'email'""",
                {"email": email}
            )
            
            if not user:
                return {"success": False, "error": "Invalid email or password"}
            
            user = user[0]
            if not _verify_password(password, user['password_hash'], user['password_salt']):
                return {"success": False, "error": "Invalid email or password"}
            
            self.execute_write(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :user_id",
                {"user_id": user['id']}
            )
            
            session_token = self._create_session(user['id'])
            
            return {
                "success": True,
                "user": {
                    "id": user['id'],
                    "email": user['email'],
                    "username": user['username'],
                    "first_name": user['first_name'],
                    "last_name": user['last_name'],
                    "profile_complete": user['profile_complete'],
                    "profile_picture_url": user['profile_picture_url']
                },
                "session_token": session_token
            }
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return {"success": False, "error": str(e)}
    
    def login_google(self, auth_code: str, redirect_uri: str) -> Dict[str, Any]:
        """Login/register with Google OAuth"""
        try:
            google_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
            token_endpoint = google_cfg["token_endpoint"]
            
            client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
            client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
            
            if not client_id or not client_secret:
                return {"success": False, "error": "Google OAuth not configured"}
            
            token_response = requests.post(
                token_endpoint,
                data={
                    "code": auth_code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if token_response.status_code != 200:
                return {"success": False, "error": "Failed to get Google token"}
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            userinfo_endpoint = google_cfg["userinfo_endpoint"]
            userinfo_response = requests.get(
                userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                return {"success": False, "error": "Failed to get Google user info"}
            
            userinfo = userinfo_response.json()
            
            return self._process_oauth_user(
                provider="google",
                oauth_id=userinfo.get("sub"),
                email=userinfo.get("email"),
                first_name=userinfo.get("given_name"),
                last_name=userinfo.get("family_name"),
                profile_picture=userinfo.get("picture"),
                email_verified=userinfo.get("email_verified", False)
            )
        except Exception as e:
            logger.error(f"Google login failed: {e}")
            return {"success": False, "error": str(e)}
    
    def login_facebook(self, access_token: str) -> Dict[str, Any]:
        """Login/register with Facebook OAuth"""
        try:
            response = requests.get(
                f"{FACEBOOK_GRAPH_URL}/me",
                params={
                    "access_token": access_token,
                    "fields": "id,email,first_name,last_name,picture.type(large),location"
                }
            )
            
            if response.status_code != 200:
                return {"success": False, "error": "Failed to get Facebook user info"}
            
            userinfo = response.json()
            
            location = userinfo.get("location", {})
            city = None
            state = None
            if location and "name" in location:
                parts = location["name"].split(", ")
                if len(parts) >= 1:
                    city = parts[0]
                if len(parts) >= 2:
                    state = parts[1]
            
            picture_url = None
            if "picture" in userinfo and "data" in userinfo["picture"]:
                picture_url = userinfo["picture"]["data"].get("url")
            
            return self._process_oauth_user(
                provider="facebook",
                oauth_id=userinfo.get("id"),
                email=userinfo.get("email"),
                first_name=userinfo.get("first_name"),
                last_name=userinfo.get("last_name"),
                profile_picture=picture_url,
                email_verified=True,
                city=city,
                state=state
            )
        except Exception as e:
            logger.error(f"Facebook login failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _process_oauth_user(self, provider: str, oauth_id: str, email: str,
                            first_name: str = None, last_name: str = None,
                            profile_picture: str = None, email_verified: bool = False,
                            city: str = None, state: str = None) -> Dict[str, Any]:
        """Process OAuth login - create or update user"""
        if not self.is_sql_configured():
            return {"success": False, "error": "Database not configured"}
        
        if not email:
            return {"success": False, "error": "Email not provided by OAuth provider"}
        
        try:
            existing = self.execute_query(
                "SELECT * FROM users WHERE email = :email OR (oauth_id = :oauth_id AND auth_provider = :provider)",
                {"email": email, "oauth_id": oauth_id, "provider": provider}
            )
            
            if existing:
                user = existing[0]
                self.execute_write(
                    """UPDATE users SET 
                       first_name = COALESCE(:first_name, first_name),
                       last_name = COALESCE(:last_name, last_name),
                       profile_picture_url = COALESCE(:profile_picture, profile_picture_url),
                       city = COALESCE(:city, city),
                       state = COALESCE(:state, state),
                       email_verified = :email_verified,
                       last_login = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP
                       WHERE id = :user_id""",
                    {"first_name": first_name, "last_name": last_name, "profile_picture": profile_picture, 
                     "city": city, "state": state, "email_verified": email_verified, "user_id": user['id']}
                )
                user_id = user['id']
            else:
                username = f"{first_name or ''}{last_name or ''}".lower() or email.split('@')[0]
                self.execute_write(
                    """INSERT INTO users (email, username, first_name, last_name, auth_provider, 
                                         oauth_id, profile_picture_url, email_verified, city, state, last_login)
                       VALUES (:email, :username, :first_name, :last_name, :provider, :oauth_id, 
                               :profile_picture, :email_verified, :city, :state, CURRENT_TIMESTAMP)""",
                    {"email": email, "username": username, "first_name": first_name, "last_name": last_name, 
                     "provider": provider, "oauth_id": oauth_id, "profile_picture": profile_picture, 
                     "email_verified": email_verified, "city": city, "state": state}
                )
                new_user = self.execute_query(
                    "SELECT id FROM users WHERE email = :email",
                    {"email": email}
                )
                user_id = new_user[0]['id']
            
            updated_user = self.execute_query(
                """SELECT id, email, username, first_name, last_name, city, state, 
                          zip_code, birth_year, current_medications, profile_complete, 
                          profile_picture_url
                   FROM users WHERE id = :user_id""",
                {"user_id": user_id}
            )[0]
            
            session_token = self._create_session(user_id)
            
            return {
                "success": True,
                "user": {
                    "id": updated_user['id'],
                    "email": updated_user['email'],
                    "username": updated_user['username'],
                    "first_name": updated_user['first_name'],
                    "last_name": updated_user['last_name'],
                    "city": updated_user['city'],
                    "state": updated_user['state'],
                    "zip_code": updated_user['zip_code'],
                    "birth_year": updated_user['birth_year'],
                    "current_medications": updated_user['current_medications'],
                    "profile_complete": updated_user['profile_complete'],
                    "profile_picture_url": updated_user['profile_picture_url']
                },
                "session_token": session_token,
                "is_new_user": not existing
            }
        except Exception as e:
            logger.error(f"OAuth user processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    def update_profile(self, user_id: int, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        if not self.is_sql_configured():
            return {"success": False, "error": "Database not configured"}
        
        try:
            allowed_fields = ['username', 'first_name', 'last_name', 'city', 'state', 
                            'zip_code', 'birth_year', 'current_medications']
            
            updates = []
            values = []
            for field in allowed_fields:
                if field in profile_data:
                    updates.append(f"{field} = %s")
                    values.append(profile_data[field])
            
            if not updates:
                return {"success": False, "error": "No valid fields to update"}
            
            required_fields = ['first_name', 'last_name', 'city', 'state', 'zip_code', 'birth_year']
            user = self.execute_query(
                f"SELECT {', '.join(required_fields)} FROM users WHERE id = :user_id",
                {"user_id": user_id}
            )
            
            if user:
                current = user[0]
                merged = {**current, **profile_data}
                profile_complete = all(merged.get(f) for f in required_fields)
                updates.append("profile_complete = %s")
                values.append(profile_complete)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(user_id)
            
            params = {f"val{i}": v for i, v in enumerate(values[:-1])}
            params["user_id"] = values[-1]
            param_placeholders = ', '.join([f"{field} = :val{i}" if '%s' in updates[i] else updates[i] 
                                           for i, field in enumerate(updates)])
            self.execute_write(
                f"UPDATE users SET {', '.join(updates)} WHERE id = :user_id",
                {**params, "user_id": user_id}
            )
            
            updated_user = self.execute_query(
                """SELECT id, email, username, first_name, last_name, city, state, 
                          zip_code, birth_year, current_medications, profile_complete, 
                          profile_picture_url
                   FROM users WHERE id = :user_id""",
                {"user_id": user_id}
            )[0]
            
            return {
                "success": True,
                "user": updated_user
            }
        except Exception as e:
            logger.error(f"Profile update failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_by_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get user by session token"""
        if not self.is_sql_configured():
            return None
        
        try:
            session = self.execute_query(
                """SELECT user_id FROM user_sessions 
                   WHERE session_token = :session_token AND expires_at > CURRENT_TIMESTAMP""",
                {"session_token": session_token}
            )
            
            if not session:
                return None
            
            user = self.execute_query(
                """SELECT id, email, username, first_name, last_name, city, state, 
                          zip_code, birth_year, current_medications, profile_complete, 
                          profile_picture_url, auth_provider
                   FROM users WHERE id = :user_id""",
                {"user_id": session[0]['user_id']}
            )
            
            return user[0] if user else None
        except Exception as e:
            logger.error(f"Session lookup failed: {e}")
            return None
    
    def logout(self, session_token: str) -> bool:
        """Invalidate session token"""
        if not self.is_sql_configured():
            return False
        
        try:
            self.execute_write(
                "DELETE FROM user_sessions WHERE session_token = :session_token",
                {"session_token": session_token}
            )
            return True
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False
    
    def _create_session(self, user_id: int) -> str:
        """Create a new session for user"""
        session_token = _generate_session_token()
        expires_at = datetime.now() + timedelta(days=30)
        
        try:
            self.execute_write(
                """INSERT INTO user_sessions (user_id, session_token, expires_at)
                   VALUES (:user_id, :session_token, :expires_at)""",
                {"user_id": user_id, "session_token": session_token, "expires_at": expires_at}
            )
            return session_token
        except Exception as e:
            logger.error(f"Session creation failed: {e}")
            return None
    
    def get_google_auth_url(self, redirect_uri: str) -> Optional[str]:
        """Generate Google OAuth authorization URL"""
        try:
            client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
            if not client_id:
                return None
            
            google_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
            auth_endpoint = google_cfg["authorization_endpoint"]
            
            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "openid email profile",
                "response_type": "code",
                "access_type": "offline",
                "prompt": "consent"
            }
            
            query_string = "&".join(f"{k}={v}" for k, v in params.items())
            return f"{auth_endpoint}?{query_string}"
        except Exception as e:
            logger.error(f"Failed to generate Google auth URL: {e}")
            return None
    
    def get_all_users(self) -> list:
        """Get all users (admin function)"""
        if not self.is_sql_configured():
            return []
        
        try:
            users = self.execute_query(
                """SELECT id, email, username, first_name, last_name, city, state,
                          auth_provider, created_at, last_login, profile_complete
                   FROM users ORDER BY created_at DESC"""
            )
            return users or []
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            return []


auth_service = None

def get_auth_service():
    """Get or create the auth service singleton"""
    global auth_service
    if auth_service is None:
        try:
            from gcloud_services import execute_query, execute_write, is_sql_configured
            auth_service = AuthService(execute_query, execute_write, is_sql_configured)
        except ImportError:
            logger.warning("Could not import gcloud_services for auth")
            return None
    return auth_service

def initialize_auth():
    """Initialize auth service and tables"""
    service = get_auth_service()
    if service:
        return service.initialize_tables()
    return False
