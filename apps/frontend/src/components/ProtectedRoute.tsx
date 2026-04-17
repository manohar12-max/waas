import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  if (!token || !userStr) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(userStr);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, send to base dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
