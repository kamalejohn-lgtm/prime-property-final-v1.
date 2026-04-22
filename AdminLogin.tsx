import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export const EcomigLogo = () => {
  return (
    <div className="flex items-center gap-2">
      <img 
        src="https://picsum.photos/seed/ecomig/200/200" 
        alt="ECOMIG Logo" 
        className="w-16 h-16 rounded-full border-4 border-green-700 shadow-lg"
        referrerPolicy="no-referrer"
      />
      <div className="text-left">
        <span className="block text-xl font-black text-green-800 leading-none">ECOMIG</span>
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Mission Portal</span>
      </div>
    </div>
  );
};

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { profile, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) navigate("/admin/dashboard");
  }, [profile, navigate]);

  const handleForgotPassword = async () => {
    if (!username) {
      toast.error("Please enter your username first.");
      return;
    }
    try {
      let email = username;
      if (!email.includes("@")) {
        email = `${username.toLowerCase().trim()}@ecomig.org`;
      }
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      console.error("Reset error:", error);
      toast.error("Error sending reset email: " + error.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(username, pass);
      navigate("/admin/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message.includes("Email/Password login is currently disabled")) {
        toast.error(error.message);
      } else if (error.message.includes("Incorrect password for this account")) {
        toast.error(error.message);
      } else if (error.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many failed attempts. Please try again later.");
      } else {
        toast.error("Invalid credentials. If you've forgotten your password, use the 'Forgot Password' link below.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative z-10">
      <div className="bg-white/95 backdrop-blur-md p-10 w-full max-w-md shadow-2xl border-t-8 border-green-800">
        <div className="text-center mb-10">
          <EcomigLogo />
          <h1 className="font-heading text-3xl font-bold uppercase mt-6 text-slate-900">Mission Portal</h1>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <div><label className="form-label">User Name</label><input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required disabled={isLoggingIn} placeholder="Enter your username" /></div>
          <div><label className="form-label">Password</label><input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} required disabled={isLoggingIn} placeholder="Enter your password" /></div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={isLoggingIn}>
            {isLoggingIn ? <Clock className="animate-spin" size={20} /> : null}
            {isLoggingIn ? "Authenticating..." : "Login to Portal"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={handleForgotPassword} className="text-sm text-slate-500 hover:text-green-700 transition-colors">
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
