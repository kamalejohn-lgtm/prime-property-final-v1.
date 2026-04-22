import React, { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AdminLogin from "./AdminLogin";
import PendingApproval from "./PendingApproval";

const Gatekeeper = ({ children, requireAdmin = false }: { children: ReactNode, requireAdmin?: boolean }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-700 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-bold uppercase tracking-widest">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  if (!profile || profile.role === "pending") {
    return <PendingApproval />;
  }

  if (requireAdmin && profile.role !== "admin" && profile.role !== "editor") {
    return <PendingApproval />;
  }

  return <>{children}</>;
};

export default Gatekeeper;
