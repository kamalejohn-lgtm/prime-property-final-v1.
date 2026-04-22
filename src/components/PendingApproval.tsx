import React from "react";
import { LogOut, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { EcomigLogo } from "./AdminLogin";

const PendingApproval = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center relative z-10">
      <div className="bg-white/95 backdrop-blur-md p-10 w-full max-w-md shadow-2xl border-t-8 border-green-800">
        <EcomigLogo />
        <div className="mt-8 mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-green-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Access Pending</h1>
          <p className="text-slate-600 mb-6">
            Your account <strong>{user?.email}</strong> is currently awaiting administrative approval.
          </p>
          <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-500 mb-8 border border-slate-100">
            Please contact the MHQ IT Department or your unit commander to authorize your access to the Mission Portal.
          </div>
          <button 
            onClick={logout}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
