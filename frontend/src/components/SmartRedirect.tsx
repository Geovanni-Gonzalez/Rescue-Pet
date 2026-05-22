import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Redirige automáticamente al usuario a la página más relevante
 * según su rol al acceder a la raíz ("/").
 */
export function SmartRedirect() {
  const { role } = useAuth();

  switch (role) {
    case 'ADOPTER':
      return <Navigate to="/catalog" replace />;
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'VETERINARIAN':
      return <Navigate to="/pets" replace />;
    case 'VOLUNTEER':
      return <Navigate to="/pets" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}
