import React, { useState, useEffect } from 'react';

interface UserProfile {
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
}

interface ProfileFormProps {
  user: UserProfile;
  sessionToken: string;
  backendUrl: string;
  onProfileUpdate: (user: UserProfile) => void;
  onClose: () => void;
  isNewUser?: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i - 13);

export const ProfileForm: React.FC<ProfileFormProps> = ({
  user,
  sessionToken,
  backendUrl,
  onProfileUpdate,
  onClose,
  isNewUser = false
}) => {
  const [formData, setFormData] = useState({
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    city: user.city || '',
    state: user.state || '',
    zip_code: user.zip_code || '',
    birth_year: user.birth_year?.toString() || '',
    current_medications: user.current_medications || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          ...formData,
          birth_year: formData.birth_year ? parseInt(formData.birth_year) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        onProfileUpdate(data.user);
        if (!isNewUser) {
          setTimeout(onClose, 1500);
        }
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = formData.first_name && formData.last_name && 
                     formData.city && formData.state && 
                     formData.zip_code && formData.birth_year;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-6 border border-gray-700 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isNewUser ? 'Complete Your Profile' : 'Edit Profile'}
            </h2>
            {isNewUser && (
              <p className="text-gray-400 text-sm mt-1">
                Please provide your information to personalize your experience
              </p>
            )}
          </div>
          {!isNewUser && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {user.profile_picture_url && (
          <div className="flex justify-center mb-6">
            <img
              src={user.profile_picture_url}
              alt="Profile"
              className="w-20 h-20 rounded-full border-2 border-indigo-500"
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email <span className="text-gray-500">(read-only)</span>
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State <span className="text-red-400">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select state</option>
                {US_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ZIP Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                required
                pattern="[0-9]{5}(-[0-9]{4})?"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Year of Birth <span className="text-red-400">*</span>
              </label>
              <select
                name="birth_year"
                value={formData.birth_year}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select year</option>
                {BIRTH_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current Medications
            </label>
            <p className="text-xs text-gray-500 mb-2">
              List all medications, vitamins, and supplements you currently take (including over-the-counter medications like Tylenol, Aspirin, etc.)
            </p>
            <textarea
              name="current_medications"
              value={formData.current_medications}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="e.g., Lisinopril 10mg daily, Aspirin 81mg daily, Vitamin D 1000IU daily, Tylenol as needed..."
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            {!isNewUser && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || (isNewUser && !isComplete)}
              className={`px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isNewUser ? 'w-full' : 'ml-auto'}`}
            >
              {isLoading ? 'Saving...' : isNewUser ? 'Complete Profile & Continue' : 'Save Changes'}
            </button>
          </div>

          {isNewUser && !isComplete && (
            <p className="text-center text-sm text-yellow-500">
              Please fill in all required fields (*) to continue
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
