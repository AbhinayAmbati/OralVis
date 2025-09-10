import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Upload, Settings } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isPatient, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-purple-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={isAdmin() ? '/admin' : '/'} className="flex items-center">
              <div className="text-white text-xl font-bold">
                OralVis Assessment
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isPatient() && (
              <>
                <Link
                  to="/"
                  className="text-white hover:text-purple-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <User className="w-4 h-4 mr-1" />
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className="text-white hover:text-purple-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </Link>
              </>
            )}

            {isAdmin() && (
              <Link
                to="/admin"
                className="text-white hover:text-purple-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <Settings className="w-4 h-4 mr-1" />
                Admin Dashboard
              </Link>
            )}

            <div className="flex items-center text-white text-sm">
              <User className="w-4 h-4 mr-1" />
              <span>{user.name}</span>
              <span className="ml-2 px-2 py-1 bg-purple-700 rounded text-xs">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="text-white hover:text-purple-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
