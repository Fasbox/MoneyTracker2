import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function Protected({ children }) {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
