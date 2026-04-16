import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("is_logged_in");

    if (!isLoggedIn) {
      // User is not logged in, redirect to login page
      navigate("/login", { replace: true });
      return;
    }

    // User is logged in, allow access
    setIsAuthorized(true);
    setIsLoading(false);
  }, [navigate]);

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
