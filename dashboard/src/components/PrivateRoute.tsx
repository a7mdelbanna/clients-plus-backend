import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedLoader from './AnimatedLoader';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <AnimatedLoader text="جاري التحقق من الصلاحيات..." />;
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute;