import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { isLoggedInSession, isRestrictedSession } from "../lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isLoggedIn = isLoggedInSession();
    const isRestricted = isRestrictedSession();

    if (!isLoggedIn) {
      // User is not logged in, redirect to login page
      navigate("/login", { replace: true });
      return;
    }

    if (isRestricted && location.pathname !== "/") {
      navigate("/", { replace: true });
      return;
    }

    // User is logged in, allow access
    setIsAuthorized(true);
    setIsLoading(false);
  }, [location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
