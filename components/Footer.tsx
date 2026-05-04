import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800/50 border-t border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} WrightAI, LLC. d/b/a PharmKo. All rights reserved.
          </div>
          <nav className="flex gap-6 text-sm">
            <Link to="/about" className="text-gray-400 hover:text-indigo-400 transition-colors">
              About
            </Link>
            <Link to="/privacy" className="text-gray-400 hover:text-indigo-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-indigo-400 transition-colors">
              Terms of Service
            </Link>
          </nav>
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          PharmKo is for informational purposes only and is not a substitute for professional medical advice.
        </div>
      </div>
    </footer>
  );
};
