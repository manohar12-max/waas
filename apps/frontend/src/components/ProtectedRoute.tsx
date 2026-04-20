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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(userStr);

  // God Mode: SuperAdmin inherently has access to everything
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Gate: If college subscription is expired, block access
  const collegeStatus = localStorage.getItem('college_status');
  if (collegeStatus === 'EXPIRED') {
    return <Navigate to="/expired" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
