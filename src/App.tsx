import React, { useState, useEffect, createContext, useContext, ReactNode, Component } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { OperationType, FirestoreErrorInfo } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { Toaster, toast } from "sonner";
import { NewsForm, EditNewsForm } from "./components/NewsForm";
import { ChronicleForm, EditChronicleForm } from "./components/ChronicleForm";
import { LeadershipForm, EditLeadershipForm } from "./components/LeadershipForm";
import { HomePageManager, HomePageSettings } from "./components/HomePageManager";
import FootballTV from "./components/FootballTV";
import RichTextEditor from "./components/RichTextEditor";
import { 
  Menu, X, ChevronRight, Shield, Users, Calendar, FileText, BookOpen,
  MapPin, Phone, Mail, Image as ImageIcon, Newspaper, Clock, LogOut, Plus,
  Edit, Trash2, Eye, Home, Settings, Send, Inbox, Folder, ExternalLink,
  Sparkles, Wand2, Type, MessageCircle, Bot, Download, Globe, Radio, Tv,
  Trophy, Landmark, ArrowLeft, ArrowRight, History, LayoutDashboard, CheckCircle2, XCircle, AlertCircle, Edit2, Search, Filter, ChevronLeft, Database, Cloud, RefreshCw, MoreVertical, Check, Facebook
} from "lucide-react";

import { chatWithGemini } from "./services/gemini";

// Firebase Imports
import { auth, db, storage } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  getDocFromServer,
  limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";

// --- TYPES ---
interface UserProfile {
  id: string;
  username: string;
  role: string;
  unit: string;
  full_name: string;
  created_at: string;
}

interface News {
  id: string;
  title: string;
  title_fr?: string;
  content: string;
  content_fr?: string;
  summary?: string;
  summary_fr?: string;
  image_url?: string;
  category: string;
  author: string;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location?: string;
  event_type: string;
  category?: string;
  image_url?: string;
  created_by: string;
  created_at: string;
}

interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  names?: string;
  image_url: string;
  category: string;
  uploaded_by: string;
  created_at: string;
}

interface Leader {
  id: string;
  name: string;
  title: string;
  position: string;
  unit?: string;
  image_url?: string;
  bio?: string;
  order: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface MissionDocument {
  id: string;
  title: string;
  category: "SOP" | "Manual" | "Directive" | "Report";
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read";
  has_attachments?: boolean;
  attachment_count?: number;
  created_at: string;
}

interface InternalMailAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface InternalMail {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_unit: string;
  receiver_id?: string;
  receiver_unit?: string;
  subject: string;
  body: string;
  is_read: boolean;
  attachments?: InternalMailAttachment[];
  created_at: string;
}

interface ChronicleOfCommand {
  id: string;
  name: string;
  unit: "MHQ" | "FHQ" | "DFC" | "J1/4" | "J2" | "J3/5" | "J6" | "J7/9" | "PM" | "PIO" | "PA DFC" | "CC" | "SENBAT" | "NIGCOY" | "GHANCOY" | "SENFPU" | "SENPC";
  years: string;
  image_url: string;
  created_at: string;
}

interface FootballClub {
  id: string;
  name: string;
  logo_url?: string;
  played: number;
  points: number;
  unit?: string;
}

interface FootballMatch {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  time: string;
  status: "live" | "upcoming" | "finished";
  date: string;
  stadium: string;
  stream_url?: string;
}

// --- ERROR HANDLING ---

function stripHtml(html: string | undefined | null) {
  if (!html) return "";
  try {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  } catch (e) {
    console.error("Error stripping HTML:", e);
    return "";
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || "Not Logged In",
      email: auth.currentUser?.email || "No Email",
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || "",
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || "",
        email: provider.email || "",
        photoUrl: provider.photoURL || ""
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  let userMessage = "Database Error: ";
  if (errInfo.error.includes("permission-denied")) {
    userMessage += "Permission Denied. Please check your Firestore security rules.";
  } else if (errInfo.error.includes("quota-exceeded")) {
    userMessage += "Quota Exceeded.";
  } else {
    userMessage += errInfo.error;
  }
  
  toast.error(userMessage);
  // Do not throw here to prevent crashing the app in useEffects
  // throw new Error(JSON.stringify(errInfo));
}

function handleStorageError(error: any, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    path
  }
  console.error('Storage Error: ', JSON.stringify(errInfo));
  
  if (error.code === 'storage/unauthorized') {
    toast.error("Permission Denied: You do not have permission to upload to this folder. Please check your Firebase Storage rules.");
  } else if (error.code === 'storage/quota-exceeded') {
    toast.error("Quota Exceeded: Your Firebase Storage quota has been reached.");
  } else if (error.code === 'storage/retry-limit-exceeded') {
    toast.error("Upload Timed Out: The upload took too long. Please check your internet connection.");
  } else if (error.code === 'storage/invalid-url') {
    toast.error("Invalid Storage Configuration: The storage bucket URL is incorrect.");
  } else if (error.message?.includes('the client is offline')) {
    toast.error("Network Error: You appear to be offline or the Firebase Storage service is unreachable.");
  } else {
    toast.error(`Upload Failed: ${errInfo.error}. Please ensure Firebase Storage is enabled in your Firebase Console.`);
  }
}

import { useAuth, AuthProvider } from "./contexts/AuthContext";

// --- COMPONENTS ---
const EcomigLogo = () => {
  const [error, setError] = useState(false);
  
  return (
    <div className="flex items-center gap-3">
      <img 
        src="https://customer-assets.emergentagent.com/job_secure-comms-36/artifacts/yxcc2zx2_image.png" 
        alt="ECOMIG Logo" 
        className={`h-12 md:h-16 object-contain ${error ? 'hidden' : 'block'}`}
        referrerPolicy="no-referrer"
        onError={() => {
          console.error("ECOMIG Logo failed to load.");
          setError(true);
        }}
      />
      <div className="flex items-center gap-2 border-l border-white/20 pl-3">
        <img src="https://flagcdn.com/w80/sn.png" alt="Senegal Logo" className="h-6 md:h-8 object-contain shadow-sm rounded-sm" referrerPolicy="no-referrer" />
        <img src="https://flagcdn.com/w80/ng.png" alt="Nigeria Logo" className="h-6 md:h-8 object-contain shadow-sm rounded-sm" referrerPolicy="no-referrer" />
        <img src="https://flagcdn.com/w80/gh.png" alt="Ghana Logo" className="h-6 md:h-8 object-contain shadow-sm rounded-sm" referrerPolicy="no-referrer" />
      </div>
      {error && (
        <div className="bg-green-800 text-white px-3 py-1 rounded font-bold text-sm uppercase tracking-widest border border-white/20">
          ECOMIG
        </div>
      )}
    </div>
  );
};

const PageHeader = ({ title, subtitle, icon, breadcrumb }: { title: string, subtitle?: string, icon?: ReactNode, breadcrumb?: ReactNode }) => (
  <div className="bg-slate-900/90 backdrop-blur-md text-white py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-8">
      {breadcrumb && <div className="mb-6">{breadcrumb}</div>}
      <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 flex items-center gap-6"
        >
          <img 
            src="https://customer-assets.emergentagent.com/job_secure-comms-36/artifacts/yxcc2zx2_image.png" 
            alt="ECOMIG Logo" 
            className="h-24 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center gap-3 border-l border-white/20 pl-6">
            <img src="https://flagcdn.com/w160/sn.png" alt="Senegal Logo" className="h-10 md:h-14 object-contain shadow-lg rounded-sm" referrerPolicy="no-referrer" />
            <img src="https://flagcdn.com/w160/ng.png" alt="Nigeria Logo" className="h-10 md:h-14 object-contain shadow-lg rounded-sm" referrerPolicy="no-referrer" />
            <img src="https://flagcdn.com/w160/gh.png" alt="Ghana Logo" className="h-10 md:h-14 object-contain shadow-lg rounded-sm" referrerPolicy="no-referrer" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
            {icon && <div className="text-green-500">{icon}</div>}
            <h1 className="font-heading text-4xl md:text-6xl font-bold uppercase tracking-tighter">{title}</h1>
          </div>
          {subtitle && <p className="text-slate-400 max-w-2xl text-lg font-light">{subtitle}</p>}
        </motion.div>
      </div>
    </div>
  </div>
);

const MailboxIcon = () => {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;
    
    // Count personal unread
    const q1 = query(collection(db, "internal_mail"), where("receiver_id", "==", user.uid), where("is_read", "==", false));
    const unsub1 = onSnapshot(q1, (snap) => {
      const personalCount = snap.size;
      setUnreadCount(prev => personalCount); // This is a bit simplified, but fine for now
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "internal_mail");
    });

    // Count unit unread (simplified: just personal for now to avoid complex logic)
    return () => unsub1();
  }, [user, profile]);

  return (
    <div className="relative">
      <Inbox size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
          {unreadCount}
        </span>
      )}
    </div>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Leadership", path: "/leadership" },
    { name: "News", path: "/news" },
    { name: "ECOMIG TV", path: "/football-tv", icon: <Tv size={18} className="text-green-500" /> },
    { name: "Manuals", path: "/manuals" },
    { 
      name: "Departments", 
      path: "/departments",
      subLinks: [
        { name: "MHQ", path: "/departments/mhq" },
        { name: "FHQ", path: "/departments/fhq" },
        { name: "DFC", path: "/departments/dfc" },
        { name: "J1/4", path: "/departments/j1_4" },
        { name: "J2", path: "/departments/j2" },
        { name: "J3/5", path: "/departments/j3_5" },
        { name: "J6", path: "/departments/j6" },
        { name: "J7/9", path: "/departments/j7_9" },
        { name: "PM", path: "/departments/pm" },
        { name: "PIO", path: "/departments/pio" },
        { name: "PA DFC", path: "/departments/pa_dfc" },
        { name: "CC", path: "/departments/cc" },
        { name: "SENBAT", path: "/departments/senbat" },
        { name: "NIGCOY", path: "/departments/nigcoy" },
        { name: "GHANCOY", path: "/departments/ghancoy" },
        { name: "SENFPU", path: "/departments/senfpu" },
        { name: "SENPC", path: "/departments/senpc" },
      ]
    },
    { 
      name: "Global News", 
      path: "/news",
      subLinks: [
        { name: "World News", path: "https://news.google.com", external: true },
        { name: "Africa News", path: "https://allafrica.com", external: true },
        { name: "BBC News", path: "https://www.bbc.com/news", external: true },
        { name: "CNN", path: "https://www.cnn.com", external: true },
        { name: "Al Jazeera", path: "https://www.aljazeera.com", external: true },
        { name: "Sports", path: "https://www.bbc.com/sport", external: true },
        { name: "Politics", path: "https://www.reuters.com/politics", external: true },
        { name: "TV Garden", path: "https://tvgarden.com", external: true },
        { name: "Newspaper Reviews", path: "/news#reviews", external: false },
      ]
    },
    { 
      name: "Events", 
      path: "/events",
      subLinks: [
        { name: "ECOWAS Events", path: "/events/ecowas" },
        { name: "MHQ Events", path: "/events/mhq" },
        { name: "FHQ Events", path: "/events/fhq" },
        { name: "DFC Events", path: "/events/dfc" },
        { name: "J1/4 Events", path: "/events/j1_4" },
        { name: "J2 Events", path: "/events/j2" },
        { name: "J3/5 Events", path: "/events/j3_5" },
        { name: "J6 Events", path: "/events/j6" },
        { name: "J7/9 Events", path: "/events/j7_9" },
        { name: "PM Events", path: "/events/pm" },
        { name: "PIO Events", path: "/events/pio" },
        { name: "PA DFC Events", path: "/events/pa_dfc" },
        { name: "CC Events", path: "/events/cc" },
        { name: "SENBAT Events", path: "/events/senbat" },
        { name: "NIGCOY Events", path: "/events/nigcoy" },
        { name: "GHANCOY Events", path: "/events/ghancoy" },
        { name: "SENFPU Events", path: "/events/senfpu" },
        { name: "SENPC Events", path: "/events/senpc" },
        { name: "Training", path: "/events/training" },
      ]
    },
    { name: "Gallery", path: "/gallery" },
    { name: "Mailbox", path: "/mailbox", icon: <MailboxIcon /> },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-6 flex-shrink-0 mr-16">
              <EcomigLogo />
              <span className="text-white font-heading text-xl font-bold uppercase tracking-widest hidden lg:block ml-6">
                ECOMIG
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-4 xl:gap-6 ml-auto">
              {navLinks.map((link, index) => (
                <div key={`${link.name}-${link.path}`} className={`relative group ${index === 0 ? 'ml-16' : ''}`}>
                  <Link 
                    to={link.path} 
                    className="text-white font-medium text-sm uppercase tracking-wider hover:text-green-400 transition-colors flex items-center gap-2 py-4"
                  >
                    {link.icon && link.icon}
                    {link.name}
                    {link.subLinks && <ChevronRight size={14} className="rotate-90" />}
                  </Link>
                  
                  {link.subLinks && (
                    <div className="absolute top-full left-0 w-56 bg-slate-900 border-t-2 border-green-600 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="flex flex-col">
                        {link.subLinks.map(sub => (
                          sub.external ? (
                            <a 
                              key={sub.path} 
                              href={sub.path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-6 py-3 text-xs text-slate-300 hover:text-white hover:bg-slate-800 uppercase font-bold tracking-widest border-b border-slate-800 last:border-0 flex items-center justify-between"
                            >
                              {sub.name}
                              <ExternalLink size={12} className="opacity-50" />
                            </a>
                          ) : (
                            <Link 
                              key={sub.path} 
                              to={sub.path} 
                              className="px-6 py-3 text-xs text-slate-300 hover:text-white hover:bg-slate-800 uppercase font-bold tracking-widest border-b border-slate-800 last:border-0"
                            >
                              {sub.name}
                            </Link>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Link to="/admin" className="bg-green-700 text-white font-bold text-sm px-5 py-2 uppercase tracking-wider hover:bg-green-800 transition-colors flex-shrink-0">
                Admin
              </Link>
            </div>

            <button onClick={() => setIsOpen(true)} className="lg:hidden text-white p-2">
              <Menu size={28} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="mobile-menu"
          >
            <div className="flex justify-between items-center mb-8">
              <EcomigLogo />
              <button onClick={() => setIsOpen(false)} className="text-white p-2">
                <X size={32} />
              </button>
            </div>
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <div key={`${link.name}-${link.path}`}>
                  <Link to={link.path} onClick={() => setIsOpen(false)} className="mobile-nav-link flex items-center gap-3">
                    {link.icon && link.icon}
                    {link.name}
                  </Link>
                  {link.subLinks && (
                    <div className="pl-6 flex flex-col bg-slate-800/50">
                      {link.subLinks.map(sub => (
                        sub.external ? (
                          <a 
                            key={sub.path} 
                            href={sub.path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={() => setIsOpen(false)} 
                            className="py-3 text-slate-400 uppercase text-sm font-bold tracking-widest hover:text-green-400 flex items-center justify-between pr-6"
                          >
                            {sub.name}
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <Link 
                            key={sub.path} 
                            to={sub.path} 
                            onClick={() => setIsOpen(false)} 
                            className="py-3 text-slate-400 uppercase text-sm font-bold tracking-widest hover:text-green-400"
                          >
                            {sub.name}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link to="/admin" onClick={() => setIsOpen(false)} className="mobile-nav-link text-green-400">
                Admin Portal
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Footer = () => (
  <footer className="bg-slate-900/80 backdrop-blur-md text-white py-12 border-t border-slate-800">
    <div className="max-w-7xl mx-auto px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <EcomigLogo />
          <p className="mt-4 text-slate-400 text-sm">
            ECOWAS Mission in The Gambia - Securing Peace, Building Trust
          </p>
        </div>
        <div>
          <h4 className="font-heading text-lg font-bold uppercase text-green-500">Quick Links</h4>
          <div className="flex flex-col gap-2 text-slate-400 text-sm">
            <Link to="/about" className="hover:text-white">About ECOMIG</Link>
            <Link to="/leadership" className="hover:text-white">Leadership</Link>
            <Link to="/manuals" className="hover:text-white">Manuals</Link>
            <Link to="/news" className="hover:text-white">News</Link>
            <Link to="/football-tv" className="hover:text-white text-green-400 font-bold">ECOMIG TV</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading text-lg font-bold uppercase text-green-500">Departments</h4>
          <div className="flex flex-col gap-2 text-slate-400 text-sm">
            <Link to="/departments/mhq" className="hover:text-white">MHQ</Link>
            <Link to="/departments/fhq" className="hover:text-white">FHQ</Link>
            <Link to="/departments/dfc" className="hover:text-white">DFC</Link>
            <Link to="/departments/senbat" className="hover:text-white">SENBAT</Link>
            <Link to="/departments/nigcoy" className="hover:text-white">NIGCOY</Link>
            <Link to="/departments/ghancoy" className="hover:text-white">GHANCOY</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading text-lg font-bold uppercase text-green-500">Contact</h4>
          <div className="flex flex-col gap-3 text-slate-400 text-sm">
            <div className="flex items-center gap-2"><MapPin size={16} /><span>Banjul, The Gambia</span></div>
            <div className="flex items-center gap-2"><Phone size={16} /><span>+220 360 2206</span></div>
            <div className="flex items-center gap-2"><Mail size={16} /><span>info@ecomig.org</span></div>
            <div className="flex items-center gap-4 mt-2">
              <a href="https://wa.me/2203602206" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-green-500 transition-colors" title="WhatsApp">
                <MessageCircle size={20} />
              </a>
              <a href="https://t.me/ecomig_mission" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors" title="Telegram">
                <Send size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-xs">
        <p>&copy; {new Date().getFullYear()} ECOMIG - ECOWAS Mission in The Gambia. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

const ChatBot = ({ news }: { news: News[] }) => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai", text: string, timestamp: string }[]>([
    { role: "ai", text: "Greetings. I am the ECOMIG Mission AI. How can I assist you today?", timestamp: format(new Date(), "HH:mm:ss") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const timestamp = format(new Date(), "HH:mm:ss");
    setMessages(prev => [...prev, { role: "user", text: userMsg, timestamp }]);
    setInput("");
    setLoading(true);

    try {
      const newsContext = news.slice(0, 5).map(n => `Title: ${n.title}\nContent: ${n.summary || n.content}`).join("\n\n");
      const aiResponse = await chatWithGemini(userMsg, newsContext);
      const aiText = aiResponse || "I am unable to process that request at the moment.";
      const aiTimestamp = format(new Date(), "HH:mm:ss");
      
      setMessages(prev => [...prev, { role: "ai", text: aiText, timestamp: aiTimestamp }]);

      if (profile) {
        await addDoc(collection(db, "chat_logs"), {
          user_id: profile.id,
          user_name: profile.full_name,
          user_unit: profile.unit,
          question: userMsg,
          answer: aiText,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "ai", text: "Error: AI service unavailable. Please try again later.", timestamp: format(new Date(), "HH:mm:ss") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[500] font-mono">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[350px] md:w-[400px] h-[600px] bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden mb-4"
          >
            {/* Hardware Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`} />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Mission AI / System Active</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Message Display */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-white">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-widest">{m.role === "user" ? "Personnel" : "AI-Unit"}</span>
                    <span className="text-[11px] text-slate-400">[{m.timestamp}]</span>
                  </div>
                  <div className={`max-w-[85%] p-3 rounded-lg text-base leading-relaxed ${
                    m.role === "user" 
                      ? "bg-slate-100 text-slate-800 border-r-2 border-green-600 shadow-sm" 
                      : "bg-green-50 text-slate-800 border-l-2 border-green-600 shadow-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-xs animate-pulse">ANALYZING MISSION DATA...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-200">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ENTER COMMAND OR QUERY..."
                  className="w-full bg-white border border-slate-200 rounded p-4 text-sm text-slate-900 focus:outline-none focus:border-green-600 placeholder:text-slate-400 uppercase tracking-wider"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-500 transition-colors">
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Secure Channel 04-Alpha</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">ECOMIG-HQ-GAMBIA</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 flex flex-col items-center justify-center bg-slate-900 border-2 border-green-600 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-110 hover:border-green-400 group relative`}
      >
        <div className="absolute inset-0 rounded-full border border-green-400/30 animate-ping" />
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <MessageCircle size={32} className="group-hover:scale-110 transition-transform text-green-500" />
            <span className="text-[11px] font-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-0.5 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,1)] tracking-tighter">JTK</span>
          </>
        )}
      </button>
    </div>
  );
};

// --- PAGES ---
const HomePage = () => {
  const [news, setNews] = useState<News[]>([]);
  const [docs, setDocs] = useState<MissionDocument[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLang, setNewsLang] = useState<'en' | 'fr'>('en');
  const [settings, setSettings] = useState<HomePageSettings | null>(null);

  useEffect(() => {
    const qNews = query(collection(db, "news"), orderBy("created_at", "desc"), limit(3));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "news");
    });

    const qDocs = query(collection(db, "documents"), orderBy("created_at", "desc"), limit(6));
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      setDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionDocument)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "documents");
    });

    const qEvents = query(collection(db, "events"), orderBy("event_date", "desc"), limit(1));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "events");
    });

    const qImages = query(collection(db, "images"), orderBy("created_at", "desc"), limit(4));
    const unsubImages = onSnapshot(qImages, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "images");
    });

    const qLeaders = query(collection(db, "leaders"), orderBy("order", "asc"), limit(3));
    const unsubLeaders = onSnapshot(qLeaders, (snapshot) => {
      setLeaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leader)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "leaders");
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "homepage"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as HomePageSettings);
      }
    });

    return () => { unsubNews(); unsubDocs(); unsubEvents(); unsubImages(); unsubLeaders(); unsubSettings(); };
  }, []);

  return (
    <div className="min-h-screen relative">
      <ChatBot news={news} />
      <section className="hero-section bg-transparent">
        <div className="hero-overlay bg-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 text-center text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <img src={settings?.hero_logo_url || "https://customer-assets.emergentagent.com/job_secure-comms-36/artifacts/yxcc2zx2_image.png"} alt="ECOMIG Logo" className="h-32 md:h-40 mx-auto mb-6" referrerPolicy="no-referrer" />
            <h1 className="font-heading text-5xl md:text-8xl font-bold uppercase tracking-tighter">{settings?.hero_title || "ECOMIG"}</h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto font-light">
              {settings?.hero_subtitle || "ECOWAS Mission in The Gambia - Securing Peace, Building Trust, Strengthening Democracy"}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/about" className="btn-primary">Learn More</Link>
              <Link to="/contact" className="btn-secondary border-white text-white hover:bg-white hover:text-slate-900">Contact Us</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/gallery" className="flex items-center justify-center gap-3 bg-green-900 text-white p-6 hover:bg-green-800 transition-colors">
              <ImageIcon size={24} /><span className="font-heading text-xl font-bold uppercase">Gallery</span>
            </Link>
            <Link to="/news" className="flex items-center justify-center gap-3 bg-slate-800 text-white p-6 hover:bg-slate-700 transition-colors">
              <Newspaper size={24} /><span className="font-heading text-xl font-bold uppercase">News</span>
            </Link>
            <Link to="/events" className="flex items-center justify-center gap-3 bg-red-900 text-white p-6 hover:bg-red-800 transition-colors">
              <Calendar size={24} /><span className="font-heading text-xl font-bold uppercase">Events</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Mission Leadership Section */}
      <section className="py-20 bg-slate-50/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Mission Leadership</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">The dedicated leaders guiding ECOMIG's mission for peace and stability in The Gambia.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
            {leaders.length > 0 ? (
              leaders.map((leader, idx) => (
                <motion.div 
                  key={leader.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 group"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src={leader.image_url || "https://picsum.photos/seed/leader/400/500"} 
                      alt={leader.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-8 text-center">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">{leader.position}</span>
                    <h3 className="font-heading text-2xl font-bold text-slate-900">{leader.title}</h3>
                    <p className="text-slate-500 mt-2 text-sm">{leader.name}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              // Fallback to hardcoded if no leaders in DB yet
              <>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 group"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src="/miatta.jpg" 
                      alt="H.E Miatta Lily French" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-8 text-center">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">Head of Mission</span>
                    <h3 className="font-heading text-2xl font-bold text-slate-900">H.E Miatta Lily French</h3>
                    <p className="text-slate-500 mt-2 text-sm">Head of Mission in The Gambia</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 group"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src="/tine.jpg" 
                      alt="Col A Tine" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-8 text-center">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">Force Commander</span>
                    <h3 className="font-heading text-2xl font-bold text-slate-900">Col A Tine</h3>
                    <p className="text-slate-500 mt-2 text-sm">Force Commander ECOMIG</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 group"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src="/okeniyi.jpg" 
                      alt="Col KH Okeniyi" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-8 text-center">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">Deputy Force Commander</span>
                    <h3 className="font-heading text-2xl font-bold text-slate-900">Col KH Okeniyi</h3>
                    <p className="text-slate-500 mt-2 text-sm">Deputy Force Commander</p>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Staff Officers Poster Section */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="font-heading text-3xl font-bold uppercase text-slate-900">Staff Officers</h3>
              <div className="h-1 w-20 bg-green-700 mx-auto mt-4"></div>
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto bg-white p-4 rounded-2xl shadow-2xl border border-slate-200"
            >
              <img 
                src={settings?.staff_poster_url || "https://picsum.photos/seed/ecomig-staff/1200/600"} 
                alt="ECOMIG Staff Officers" 
                className="w-full h-auto rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="mt-6 text-center p-4">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">ECOMIG Newsletter | 4th Edition</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
            <h2 className="section-title">Latest News</h2>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setNewsLang('en')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${newsLang === 'en' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                English
              </button>
              <button 
                onClick={() => setNewsLang('fr')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${newsLang === 'fr' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Français
              </button>
            </div>
          </div>

          {/* Featured Link */}
          <div className="mb-12 bg-slate-50/80 backdrop-blur-md border-l-8 border-green-800 p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-heading text-2xl font-bold uppercase text-slate-900">{settings?.featured_link_title || "ECOMIG Web Portal Live"}</h3>
              <p className="text-slate-600 mt-2">{settings?.featured_link_text || "The official ECOMIG web portal is now live and accessible to the public."}</p>
            </div>
            <a 
              href={settings?.featured_link_url || "https://ecomig-portal.onrender.com"} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary whitespace-nowrap"
            >
              Visit Official Portal
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {news.map((item) => (
              <div key={item.id} className="news-card">
                <img src={item.image_url || "https://picsum.photos/seed/news/800/400"} alt={newsLang === 'fr' && item.title_fr ? item.title_fr : item.title} referrerPolicy="no-referrer" />
                <div className="p-6">
                  <span className="badge badge-green">{item.category}</span>
                  <h3 className="font-heading text-xl font-bold mt-3 mb-2">
                    {newsLang === 'fr' && item.title_fr ? item.title_fr : item.title}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                    {newsLang === 'fr' && item.summary_fr ? item.summary_fr : (item.summary || item.content)}
                  </p>
                  <Link to={`/news/${item.id}?lang=${newsLang}`} className="text-green-700 font-bold text-sm flex items-center gap-1 hover:text-green-900">
                    {newsLang === 'en' ? 'Read More' : 'Lire la suite'} <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/news" className="btn-primary">
              {newsLang === 'en' ? 'View All News' : 'Voir toutes les actualités'}
            </Link>
          </div>

          <div className="mt-24">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="section-title text-left">Document Library</h2>
                <p className="text-slate-600 max-w-2xl">Access official SOPs, mission manuals, and ECOWAS directives.</p>
              </div>
              <div className="hidden md:flex gap-2">
                {["SOP", "Manual", "Directive", "Report"].map(cat => (
                  <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-200">{cat}</span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {docs.map((doc) => (
                <motion.div 
                  key={doc.id}
                  whileHover={{ y: -5 }}
                  className="bg-white border border-slate-200 p-6 rounded-lg flex items-start gap-4 group cursor-pointer shadow-sm hover:shadow-md transition-all"
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <div className="p-3 bg-slate-100 rounded text-green-700 group-hover:bg-green-700 group-hover:text-white transition-colors">
                    <FileText size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{doc.category}</span>
                    <h3 className="text-slate-900 font-bold mb-2 group-hover:text-green-700 transition-colors">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Download size={12} />
                      <span>Download PDF</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {docs.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  No documents available in the library.
                </div>
              )}
            </div>
          </div>

          <div className="mt-24 text-center">
            <h2 className="section-title">Upcoming Events</h2>
          </div>

          {events.length > 0 ? (
            <div className="mt-12 bg-white/80 backdrop-blur-md border-l-8 border-green-800 p-8 shadow-xl rounded-r-lg flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0 bg-green-900 text-white p-6 text-center w-32 rounded-lg shadow-lg">
                <div className="font-heading text-4xl font-bold">{format(new Date(events[0].event_date), "dd")}</div>
                <div className="text-sm uppercase font-bold">{format(new Date(events[0].event_date), "MMM")}</div>
              </div>
              <div className="flex-1">
                <span className="badge badge-green">{events[0].event_type}</span>
                <h3 className="font-heading text-2xl font-bold mt-3 text-slate-900 uppercase">{events[0].title}</h3>
                <p className="text-slate-600 mt-4 line-clamp-2">
                  {events[0].description}
                </p>
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                  <Link to="/events" className="btn-primary">View All Events</Link>
                  {events[0].location && (
                    <p className="text-slate-500 text-sm flex items-center gap-2 font-medium">
                      <MapPin size={18} className="text-green-700" /> {events[0].location}
                    </p>
                  )}
                </div>
              </div>
              {events[0].image_url && (
                <div className="flex-shrink-0 w-full md:w-48 h-32 rounded-lg overflow-hidden shadow-md">
                  <img src={events[0].image_url} alt={events[0].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-12 bg-white/80 backdrop-blur-md border-l-8 border-red-800 p-8 shadow-xl rounded-r-lg flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0 bg-red-900 text-white p-6 text-center w-32 rounded-lg shadow-lg">
                <div className="font-heading text-4xl font-bold">22</div>
                <div className="text-sm uppercase font-bold">Mar</div>
              </div>
              <div className="flex-1">
                <span className="badge badge-red">Change of Command</span>
                <h3 className="font-heading text-2xl font-bold mt-3 text-slate-900 uppercase">Colonel Aliou Tine Takes over as New Force Commander</h3>
                <p className="text-slate-600 mt-4">
                  Colonel Aliou Tine has officially taken over as the new Force Commander of the ECOWAS Mission in The Gambia (ECOMIG).
                </p>
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                  <Link to="/events" className="btn-primary">View All Events</Link>
                  <a 
                    href="https://africa24tv.com/colonel-aliou-tine-takes-over-as-new-economic-community-of-west-african-states-mission-in-the-gambia-force-commander/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-red-700 font-bold hover:underline flex items-center gap-2 text-sm"
                  >
                    Read Full Story <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-24">
              <div className="text-center mb-12">
                <h2 className="section-title">Mission Gallery</h2>
                <p className="text-slate-600 mt-4">Recent photos from our operations and community engagements.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map(img => (
                  <Link key={img.id} to="/gallery" className="relative group aspect-square overflow-hidden rounded-lg shadow-md">
                    <img src={img.image_url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="text-white" size={32} />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link to="/gallery" className="btn-secondary">View Full Gallery</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const AboutPage = () => (
  <div className="min-h-screen pt-20">
    <PageHeader 
      title="About ECOMIG" 
      subtitle="The ECOWAS Mission in The Gambia - Securing peace, supporting democracy"
      icon={<Shield size={32} />}
    />
    <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
      <div className="max-w-4xl mx-auto px-8">
        <h2 className="section-title">Our History</h2>
        <p className="text-slate-600 leading-relaxed mb-8 text-lg">
          The ECOWAS Mission in The Gambia (ECOMIG) was established in January 2017. The senegalese, Nigerian and Ghanian Contingents were deployed following the political crisis in The Gambia. 
          The mission was deployed to support the peaceful transition of power and ensure the safety of the Gambian people during a critical period in the nation's history.
        </p>
        <p className="text-slate-600 leading-relaxed mb-12 text-lg">
          ECOMIG comprises military contingents from several ECOWAS member states, including Senegal, Nigeria, Ghana, and others. 
          The mission operates under the mandate of the ECOWAS Authority of Heads of State and Government.
        </p>
        <h2 className="section-title">Our Mandate</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "Maintain peace and stability in The Gambia",
            "Support democratic governance and constitutional order",
            "Provide a secure environment for citizens and institutions",
            "Coordinate with Gambian security forces for national security",
            "Support security sector reform initiatives",
            "Provide security for the President and Government institutions"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 bg-slate-50/80 backdrop-blur-sm p-4 border-l-4 border-green-700">
              <Shield className="text-green-700 mt-1 flex-shrink-0" size={20} />
              <span className="text-slate-700 font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </div>
);

const MailboxPage = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<InternalMail[]>([]);
  const [sentMessages, setSentMessages] = useState<InternalMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [selectedMessage, setSelectedMessage] = useState<InternalMail | null>(null);
  
  // Compose state
  const [recipientType, setRecipientType] = useState<"user" | "unit">("unit");
  const [recipientId, setRecipientId] = useState("");
  const [recipientUnit, setRecipientUnit] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const units = [
    "MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", 
    "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"
  ];

  useEffect(() => {
    if (!user || !profile) return;

    // Inbox: Messages sent to me OR to my unit
    const qInbox = query(
      collection(db, "internal_mail"),
      where("receiver_id", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const qUnitInbox = query(
      collection(db, "internal_mail"),
      where("receiver_unit", "==", profile.unit),
      orderBy("created_at", "desc")
    );

    const unsubInbox = onSnapshot(qInbox, (snap) => {
      const personal = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail));
      setMessages(prev => {
        const others = prev.filter(m => m.receiver_unit === profile.unit);
        return [...personal, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "internal_mail");
    });

    const unsubUnitInbox = onSnapshot(qUnitInbox, (snap) => {
      const unitMails = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail));
      setMessages(prev => {
        const others = prev.filter(m => m.receiver_id === user.uid);
        return [...unitMails, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "internal_mail");
    });

    // Sent: Messages sent by me
    const qSent = query(
      collection(db, "internal_mail"),
      where("sender_id", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const unsubSent = onSnapshot(qSent, (snap) => {
      setSentMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "internal_mail");
    });

    return () => { unsubInbox(); unsubUnitInbox(); unsubSent(); };
  }, [user, profile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSending(true);

    try {
      const uploadedAttachments: InternalMailAttachment[] = [];
      
      for (const file of attachments) {
        const storageRef = ref(storage, `mail_attachments/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });
        const url = await getDownloadURL(snapshot.ref);
        uploadedAttachments.push({
          name: file.name,
          url,
          type: file.type,
          size: file.size
        });
      }

      const newMail: Omit<InternalMail, "id"> = {
        sender_id: user.uid,
        sender_name: profile.full_name,
        sender_unit: profile.unit,
        subject,
        body,
        is_read: false,
        attachments: uploadedAttachments,
        created_at: new Date().toISOString()
      };

      if (recipientType === "user") {
        newMail.receiver_id = recipientId;
      } else {
        newMail.receiver_unit = recipientUnit;
      }

      await addDoc(collection(db, "internal_mail"), newMail);
      setSubject("");
      setBody("");
      setRecipientId("");
      setRecipientUnit("");
      setAttachments([]);
      setActiveTab("sent");
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending mail:", error);
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (msg: InternalMail) => {
    if (msg.is_read) return;
    try {
      await updateDoc(doc(db, "internal_mail", msg.id), { is_read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  if (!user) return <div className="pt-32 text-center">Please login to access the mailbox.</div>;

  return (
    <div className="min-h-screen pt-20 bg-slate-50">
      <PageHeader 
        title="Internal Mail" 
        subtitle="Secure communication channel for departments and personnel"
        icon={<Inbox size={32} />}
      />

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-100 border-b border-slate-200">
                <button 
                  onClick={() => { setActiveTab("compose"); setSelectedMessage(null); }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Compose
                </button>
              </div>
              <nav className="flex flex-col">
                <button 
                  onClick={() => { setActiveTab("inbox"); setSelectedMessage(null); }}
                  className={`flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === "inbox" ? "bg-green-50 text-green-700 border-r-4 border-green-600" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Inbox size={18} /> Inbox ({messages.filter(m => !m.is_read).length})
                </button>
                <button 
                  onClick={() => { setActiveTab("sent"); setSelectedMessage(null); }}
                  className={`flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === "sent" ? "bg-green-50 text-green-700 border-r-4 border-green-600" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Send size={18} /> Sent
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "compose" ? (
              <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
                <h2 className="font-heading text-2xl font-bold mb-6 uppercase">New Message</h2>
                <form onSubmit={handleSendMessage} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Recipient Type</label>
                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setRecipientType("unit")}
                          className={`flex-1 py-2 rounded-lg border-2 font-bold text-xs uppercase transition-all ${recipientType === "unit" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-400"}`}
                        >
                          Department/Unit
                        </button>
                        <button 
                          type="button"
                          onClick={() => setRecipientType("user")}
                          className={`flex-1 py-2 rounded-lg border-2 font-bold text-xs uppercase transition-all ${recipientType === "user" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-400"}`}
                        >
                          Individual User
                        </button>
                      </div>
                    </div>
                    <div>
                      {recipientType === "unit" ? (
                        <>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select Department</label>
                          <select 
                            required
                            value={recipientUnit}
                            onChange={(e) => setRecipientUnit(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                          >
                            <option value="">-- Select Unit --</option>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Recipient User ID</label>
                          <input 
                            required
                            type="text"
                            value={recipientId}
                            onChange={(e) => setRecipientId(e.target.value)}
                            placeholder="Enter User UID"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Subject</label>
                    <input 
                      required
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Message Body</label>
                    <textarea 
                      required
                      rows={8}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Attachments</label>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        multiple 
                        onChange={(e) => {
                          if (e.target.files) {
                            setAttachments(Array.from(e.target.files));
                          }
                        }}
                        className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attachments.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                              <FileText size={12} /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2">
                      {sending ? "Sending..." : <><Send size={18} /> Send Message</>}
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedMessage ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedMessage(null)}
                    className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-bold uppercase"
                  >
                    <ChevronRight size={18} className="rotate-180" /> Back to List
                  </button>
                  <div className="text-xs text-slate-400 font-mono">
                    {format(new Date(selectedMessage.created_at), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="font-heading text-3xl font-bold text-slate-900">{selectedMessage.subject}</h2>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xl">
                        {selectedMessage.sender_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{selectedMessage.sender_name}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">
                          From: {selectedMessage.sender_unit} 
                          {selectedMessage.receiver_unit && ` | To: ${selectedMessage.receiver_unit}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="prose max-w-none text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-8 pb-8">
                    {selectedMessage.body}
                  </div>

                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                        <Folder size={14} /> Attachments ({selectedMessage.attachments.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedMessage.attachments.map((att, i) => (
                          <a 
                            key={i} 
                            href={att.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded text-slate-500 group-hover:bg-green-50 group-hover:text-green-600">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{att.name}</div>
                                <div className="text-xs text-slate-400">{(att.size / 1024).toFixed(1)} KB</div>
                              </div>
                            </div>
                            <Download size={18} className="text-slate-400 group-hover:text-green-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-heading text-xl font-bold uppercase text-slate-900">
                    {activeTab === "inbox" ? "Inbox" : "Sent Messages"}
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading messages...</div>
                  ) : (activeTab === "inbox" ? messages : sentMessages).length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No messages found.</div>
                  ) : (activeTab === "inbox" ? messages : sentMessages).map(msg => (
                    <div 
                      key={msg.id} 
                      onClick={() => { setSelectedMessage(msg); markAsRead(msg); }}
                      className={`p-6 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-6 ${activeTab === "inbox" && !msg.is_read ? "bg-green-50/30 border-l-4 border-green-600" : ""}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${activeTab === "inbox" && !msg.is_read ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {msg.sender_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-sm font-bold truncate ${activeTab === "inbox" && !msg.is_read ? "text-slate-900" : "text-slate-600"}`}>
                            {msg.sender_name} <span className="text-xs font-normal text-slate-400 uppercase ml-2">({msg.sender_unit})</span>
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(msg.created_at), "MMM d")}
                          </span>
                        </div>
                        <div className={`text-sm font-bold truncate flex items-center gap-2 ${activeTab === "inbox" && !msg.is_read ? "text-slate-900" : "text-slate-500"}`}>
                          {msg.subject}
                          {msg.attachments && msg.attachments.length > 0 && <Folder size={12} className="text-slate-400" />}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-1">
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadershipPage = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [chronicle, setChronicle] = useState<ChronicleOfCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>("MHQ");

  const units = ["MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"];

  useEffect(() => {
    const qLeaders = query(collection(db, "leaders"), orderBy("order", "asc"));
    const unsubLeaders = onSnapshot(qLeaders, (snapshot) => {
      setLeaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leader)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "leaders");
    });

    const qChronicle = query(collection(db, "chronicle_of_command"), orderBy("years", "desc"));
    const unsubChronicle = onSnapshot(qChronicle, (snapshot) => {
      setChronicle(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChronicleOfCommand)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chronicle_of_command");
      setLoading(false);
    });

    return () => {
      unsubLeaders();
      unsubChronicle();
    };
  }, []);

  const filteredChronicle = chronicle.filter(c => c.unit === selectedUnit);

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title="Leadership" 
        subtitle="The dedicated leaders guiding ECOMIG's mission for peace and stability"
        icon={<Users size={32} />}
      />
      
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg mb-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Mission Leadership</h2>
            <div className="h-1 w-20 bg-green-700 mx-auto mt-4"></div>
          </div>
          
          {loading ? <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-green-700 border-t-transparent mx-auto"></div></div> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {leaders.map(leader => (
                <div key={leader.id} className="card overflow-hidden group">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={leader.image_url || "https://picsum.photos/seed/leader/400/500"} alt={leader.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-8">
                    <span className="badge badge-green">{leader.position}</span>
                    <h3 className="font-heading text-2xl font-bold mt-4 text-slate-900">{leader.title}</h3>
                    <p className="text-green-800 font-bold text-lg">{leader.name}</p>
                    <div className="text-slate-500 text-sm mt-4 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: leader.bio || "" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-slate-900/80 backdrop-blur-md text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold uppercase tracking-widest">Chronicle of Command</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mt-4">A historical record of the distinguished commanders who have led various units within the ECOMIG mission.</p>
            <div className="h-1 w-20 bg-green-500 mx-auto mt-6"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {units.map(unit => (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 border-2 ${
                  selectedUnit === unit 
                    ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/50 scale-105" 
                    : "bg-transparent border-slate-700 text-slate-400 hover:border-green-500 hover:text-green-400"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">Loading Chronicle...</div>
          ) : filteredChronicle.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredChronicle.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 group hover:border-green-500/50 transition-colors"
                >
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img 
                      src={record.image_url || "https://picsum.photos/seed/commander/400/500"} 
                      alt={record.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="inline-block px-2 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-tighter rounded mb-2">
                        {record.years}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="font-heading text-xl font-bold text-white group-hover:text-green-400 transition-colors">{record.name}</h4>
                    <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">{record.unit} Commander</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
              <p className="text-slate-500 italic">No records found for {selectedUnit} yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const DepartmentDetailPage = () => {
  const { code } = useParams<{ code: string }>();
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    // Fetch all departments and find the match in the client to be case-insensitive and handle special characters
    const unsubscribe = onSnapshot(collection(db, "departments"), (snapshot) => {
      const allDepts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
      // Replace dashes back to slashes for comparison if needed, or just compare normalized
      const match = allDepts.find(d => {
        const normalizedCode = d.code.toUpperCase().replace(/\//g, '-');
        return normalizedCode === decodeURIComponent(code).toUpperCase();
      });
      if (match) {
        setDepartment(match);
      } else {
        setDepartment(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "departments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [code]);

  if (loading) return <div className="min-h-screen pt-40 text-center text-white">Loading Department Details...</div>;
  if (!department) return <div className="min-h-screen pt-40 text-center text-white">Department Not Found</div>;

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title={department.code} 
        subtitle={department.name}
        icon={<Landmark size={32} />}
        breadcrumb={
          <Link to="/departments" className="text-green-400 flex items-center gap-2 mb-6 hover:underline font-bold uppercase tracking-widest text-xs">
            <ArrowLeft size={16} /> Back to Departments
          </Link>
        }
      />
      
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
        <div className="max-w-4xl mx-auto px-8">
          <div className="prose prose-lg max-w-none">
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 mb-12">
              <h3 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Mission & Responsibilities</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{department.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-green-800">
                  <Shield size={24} />
                  <h4 className="font-bold uppercase">Operational Mandate</h4>
                </div>
                <p className="text-sm text-slate-600">This unit operates under the direct command of the Force Headquarters, ensuring adherence to ECOWAS protocols and mission-specific directives.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-green-800">
                  <Users size={24} />
                  <h4 className="font-bold uppercase">Personnel & Staffing</h4>
                </div>
                <p className="text-sm text-slate-600">Comprised of specialized officers and personnel from ECOWAS member states, working in a multinational environment to achieve mission objectives.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "departments"), (snapshot) => {
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "departments");
    });
    return () => unsubscribe();
  }, []);

  const seniorityOrder = [
    "MHQ", "FHQ", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"
  ];

  const fhqSubCells = [
    "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC"
  ];

  const getDeptByCode = (code: string) => departments.find(d => d.code.toUpperCase() === code.toUpperCase());

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title="Departments" 
        subtitle="The organizational structure of ECOMIG arranged by seniority"
        icon={<Landmark size={32} />}
      />
      
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
        <div className="max-w-7xl mx-auto px-8 space-y-16">
          {seniorityOrder.map(code => {
            const dept = getDeptByCode(code);
            if (!dept) return null;

            return (
              <Link key={dept.id} to={`/departments/${dept.code.toLowerCase().replace(/\//g, '-')}`} id={code.toLowerCase()} className="block scroll-mt-24 group">
                <div className="flex items-center gap-6 mb-8">
                  <div className="h-px flex-1 bg-slate-200"></div>
                  <h2 className="font-heading text-4xl font-bold uppercase text-slate-900 tracking-tighter group-hover:text-green-700 transition-colors">{dept.code}</h2>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-8 border border-slate-100 shadow-sm group-hover:shadow-md transition-all group-hover:border-green-200">
                  <h3 className="text-2xl font-bold text-green-800 mb-4 flex items-center justify-between">
                    {dept.name}
                    <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                  </h3>
                  <p className="text-slate-600 leading-relaxed max-w-4xl">{dept.description}</p>
                </div>

                {code === "FHQ" && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {fhqSubCells.map(subCode => {
                      const subDept = getDeptByCode(subCode);
                      if (!subDept) return null;
                      return (
                        <Link key={subDept.id} to={`/departments/${subDept.code.toLowerCase().replace(/\//g, '-')}`} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-green-300">
                          <h4 className="font-heading text-xl font-bold text-green-700 uppercase">{subDept.code}</h4>
                          <p className="text-slate-900 font-bold text-sm mt-1">{subDept.name}</p>
                          <p className="text-slate-500 text-xs mt-3 line-clamp-3">{subDept.description}</p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Other departments not in seniority list */}
          {departments.filter(d => !seniorityOrder.includes(d.code.toUpperCase()) && !fhqSubCells.includes(d.code.toUpperCase())).length > 0 && (
            <div>
              <div className="flex items-center gap-6 mb-8">
                <div className="h-px flex-1 bg-slate-200"></div>
                <h2 className="font-heading text-2xl font-bold uppercase text-slate-400 tracking-widest">Other Units</h2>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {departments.filter(d => !seniorityOrder.includes(d.code.toUpperCase()) && !fhqSubCells.includes(d.code.toUpperCase())).map(dept => (
                  <Link key={dept.id} to={`/departments/${dept.code.toLowerCase().replace(/\//g, '-')}`} className="dept-card group">
                    <h3 className="font-heading text-2xl font-bold uppercase text-green-400 group-hover:text-white transition-colors">{dept.code}</h3>
                    <p className="text-white font-bold mt-1 text-xs">{dept.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const NewsPage = () => {
  const { category } = useParams<{ category?: string }>();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLang, setNewsLang] = useState<'en' | 'fr'>('en');

  const newspapers = {
    en: [
      { name: "The Point", url: "https://thepoint.gm", description: "Independent news covering The Gambia and the sub-region." },
      { name: "Foroyaa", url: "https://foroyaa.net", description: "In-depth investigative journalism and socio-political analysis." },
      { name: "The Standard", url: "https://standard.gm", description: "Daily news, sports, and business updates from The Gambia." },
      { name: "Vanguard", url: "https://www.vanguardngr.com", description: "Leading Nigerian newspaper with comprehensive regional coverage." },
      { name: "Sahara Reporters", url: "http://saharareporters.com", description: "Investigative journalism focusing on West African news and politics." },
      { name: "Daily News", url: "https://dailynews.gm", description: "Comprehensive coverage of local and international events." }
    ],
    fr: [
      { name: "Le Soleil", url: "https://lesoleil.sn", description: "Grand quotidien sénégalais d'information générale." },
      { name: "L'Observateur", url: "https://lobservateur.sn", description: "Premier quotidien privé du Sénégal avec des reportages exclusifs." },
      { name: "Jeune Afrique", url: "https://www.jeuneafrique.com", description: "Média de référence pour l'actualité africaine et internationale." },
      { name: "Le Monde Afrique", url: "https://www.lemonde.fr/afrique", description: "Analyses et reportages approfondis sur le continent africain." },
      { name: "RFI Afrique", url: "https://www.rfi.fr/fr/afrique", description: "Actualité africaine en direct et en continu sur Radio France Internationale." },
      { name: "France 24 Afrique", url: "https://www.france24.com/fr/afrique", description: "Chaîne d'information internationale couvrant l'actualité africaine." }
    ]
  };

  const globalNews = {
    en: [
      { name: "World News", url: "https://news.google.com", icon: Globe },
      { name: "Africa News", url: "https://allafrica.com", icon: MapPin },
      { name: "BBC News", url: "https://www.bbc.com/news", icon: Newspaper },
      { name: "CNN", url: "https://www.cnn.com", icon: Radio },
      { name: "Al Jazeera", url: "https://www.aljazeera.com", icon: Tv },
      { name: "TV Garden", url: "https://tvgarden.com", icon: Globe },
      { name: "Sports", url: "https://www.bbc.com/sport", icon: Trophy },
      { name: "Politics", url: "https://www.reuters.com/politics", icon: Landmark }
    ],
    fr: [
      { name: "Le Monde", url: "https://www.lemonde.fr", icon: Globe },
      { name: "France 24", url: "https://www.france24.com/fr", icon: Tv },
      { name: "RFI", url: "https://www.rfi.fr/fr", icon: Radio },
      { name: "Jeune Afrique", url: "https://www.jeuneafrique.com", icon: MapPin },
      { name: "TV5Monde", url: "https://www.tv5monde.com", icon: Tv },
      { name: "Euronews FR", url: "https://fr.euronews.com", icon: Globe },
      { name: "L'Équipe", url: "https://www.lequipe.fr", icon: Trophy },
      { name: "Le Figaro", url: "https://www.lefigaro.fr", icon: Landmark }
    ]
  };

  useEffect(() => {
    const q = query(collection(db, "news"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News));
      
      if (category) {
        const normalizedCategory = category.toUpperCase();
        fetchedNews = fetchedNews.filter(n => 
          n.category?.toUpperCase() === normalizedCategory || 
          n.title.toUpperCase().includes(normalizedCategory) ||
          n.content.toUpperCase().includes(normalizedCategory)
        );
      }
      
      setNews(fetchedNews);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "news");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [category]);

  const pageTitle = category ? `${category.toUpperCase()} NEWS` : "NEWS";

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title={pageTitle} 
        subtitle={category ? `Latest updates and reports on ${category.toUpperCase()}` : "Latest updates and announcements from ECOMIG"}
        icon={<Newspaper size={32} />}
      />
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
        <div className="max-w-7xl mx-auto px-8">
          {/* Language Selection */}
          <div className="flex justify-end mb-8">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setNewsLang('en')}
                className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${newsLang === 'en' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                English
              </button>
              <button 
                onClick={() => setNewsLang('fr')}
                className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${newsLang === 'fr' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Français
              </button>
            </div>
          </div>

          {/* Sub-navigation for categories - External Links */}
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/news" className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${!category ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              ECOMIG News
            </Link>
            {[
              { name: "World", url: "https://news.google.com" },
              { name: "Africa", url: "https://allafrica.com" },
              { name: "BBC", url: "https://www.bbc.com/news" },
              { name: "CNN", url: "https://www.cnn.com" },
              { name: "Al Jazeera", url: "https://www.aljazeera.com" },
              { name: "Sports", url: "https://www.bbc.com/sport" },
              { name: "Politics", url: "https://www.reuters.com/politics" }
            ].map(cat => (
              <a 
                key={cat.name} 
                href={cat.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center gap-2"
              >
                {cat.name}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>

          {/* Global News Network Section */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <Globe className="text-green-700" size={32} />
              <h2 className="font-heading text-3xl font-bold uppercase text-slate-900">
                {newsLang === 'en' ? 'Global News Network' : 'Réseau Mondial d\'Information'}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {globalNews[newsLang].map(site => (
                <a 
                  key={site.name} 
                  href={site.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 hover:bg-green-50 hover:border-green-200 transition-all group text-center"
                >
                  <site.icon className="text-slate-400 group-hover:text-green-700 mb-3 transition-colors" size={24} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 group-hover:text-green-900">{site.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Newspaper Reviews Section */}
          <div id="reviews" className="mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-8">
              <Newspaper className="text-green-700" size={32} />
              <h2 className="font-heading text-3xl font-bold uppercase text-slate-900">
                {newsLang === 'en' ? 'Newspaper Reviews' : 'Revues de Presse'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newspapers[newsLang].map(paper => (
                <a 
                  key={paper.name} 
                  href={paper.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-6 bg-white rounded-xl border border-slate-200 hover:border-green-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-green-800 transition-colors uppercase">{paper.name}</h3>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-green-600" />
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{paper.description}</p>
                  <div className="mt-4 text-xs font-bold text-green-700 uppercase tracking-widest flex items-center gap-2">
                    {newsLang === 'en' ? 'Read Review' : 'Lire la revue'} <ArrowRight size={12} />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Useful Links Section - Only show on main news page */}
          {!category && (
            <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50/80 backdrop-blur-sm border-l-8 border-green-800 p-8 shadow-lg">
                <h2 className="font-heading text-2xl font-bold uppercase text-slate-900">Official Portal</h2>
                <p className="text-slate-600 mb-6 text-sm">The official ECOMIG web portal is now live. Access it directly below:</p>
                <a 
                  href="https://ecomig-portal.onrender.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary inline-block text-sm"
                >
                  Visit Official Portal
                </a>
              </div>
              <div className="bg-slate-50/80 backdrop-blur-sm border-l-8 border-blue-800 p-8 shadow-lg">
                <h2 className="font-heading text-2xl font-bold uppercase text-slate-900">Featured News</h2>
                <p className="text-slate-600 mb-4 text-md font-bold">Nigeria: 80 militants killed, army says</p>
                <p className="text-slate-500 mb-4 text-xs">Source: DW.com</p>
                <a 
                  href="https://www.dw.com/en/nigeria-80-militants-killed-in-nigeria-following-army-operation/a-71738734" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-700 font-bold hover:underline flex items-center gap-2 text-sm"
                >
                  Read on DW.com <ExternalLink size={16} />
                </a>
              </div>
              <div className="bg-slate-50/80 backdrop-blur-sm border-l-8 border-red-800 p-8 shadow-lg">
                <h2 className="font-heading text-2xl font-bold uppercase text-slate-900">Force Commander</h2>
                <p className="text-slate-600 mb-4 text-md font-bold">Colonel Aliou Tine Takes over as New Force Commander</p>
                <p className="text-slate-500 mb-4 text-xs">Source: Africa24 TV</p>
                <a 
                  href="https://africa24tv.com/colonel-aliou-tine-takes-over-as-new-economic-community-of-west-african-states-mission-in-the-gambia-force-commander/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-red-700 font-bold hover:underline flex items-center gap-2 text-sm"
                >
                  Read on Africa24 TV <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
              <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest">Loading News...</p>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Newspaper size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest">No {category ? category.toUpperCase() : ""} news found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map(item => (
                <div key={item.id} className="news-card">
                  <img src={item.image_url || "https://picsum.photos/seed/news/800/400"} alt={newsLang === 'fr' && item.title_fr ? item.title_fr : item.title} referrerPolicy="no-referrer" />
                  <div className="p-6">
                    <span className="badge badge-green">{item.category}</span>
                    <h3 className="font-heading text-xl font-bold mt-3 mb-2">
                      {newsLang === 'fr' && item.title_fr ? item.title_fr : item.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                      {newsLang === 'fr' && item.summary_fr ? item.summary_fr : (item.summary || stripHtml(item.content))}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={14} />{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                      <Link to={`/news/${item.id}?lang=${newsLang}`} className="text-green-700 font-bold text-sm hover:text-green-900">
                        {newsLang === 'en' ? 'Read More' : 'Lire la suite'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const NewsDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const lang = queryParams.get('lang') || 'en';
  const [news, setNews] = useState<News | null>(null);
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, "news", id), (snapshot) => {
      if (snapshot.exists()) {
        setNews({ id: snapshot.id, ...snapshot.data() } as News);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `news/${id}`);
    });
    return () => unsubscribe();
  }, [id]);

  if (!news) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const displayTitle = lang === 'fr' && news.title_fr ? news.title_fr : news.title;
  const displayContent = lang === 'fr' && news.content_fr ? news.content_fr : news.content;

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title={displayTitle} 
        subtitle={`By ${news.author} • ${format(new Date(news.created_at), "MMMM d, yyyy")}`}
        icon={<Newspaper size={32} />}
      />
      <article className="max-w-4xl mx-auto px-8 py-20 bg-white/90 backdrop-blur-sm shadow-xl mt-[-40px] relative z-10 rounded-lg mb-20">
        <img src={news.image_url || "https://picsum.photos/seed/news/1200/600"} alt={displayTitle} className="w-full h-auto rounded-lg shadow-xl mb-12" referrerPolicy="no-referrer" />
        <div className="prose prose-xl max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: displayContent || "" }} />
        <Link to="/news" className="btn-secondary mt-12 inline-block">
          {lang === 'en' ? 'Back to News' : 'Retour aux actualités'}
        </Link>
      </article>
    </div>
  );
};

const EventsPage = () => {
  const { category } = useParams<{ category?: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "events"), orderBy("event_date", "desc"));
    
    // If category is provided, we filter by it. 
    // We'll assume event_type or a new category field matches the URL param.
    // For now, let's filter client-side or update the query if we want to be more efficient.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      
      if (category) {
        const normalizedCategory = category.toUpperCase();
        fetchedEvents = fetchedEvents.filter(e => 
          e.event_type.toUpperCase().includes(normalizedCategory) || 
          (e as any).category?.toUpperCase() === normalizedCategory
        );
      }
      
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "events");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [category]);

  const pageTitle = category ? `${category.toUpperCase()} EVENTS` : "EVENTS";

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title={pageTitle} 
        subtitle={category ? `Specific events and activities for ${category.toUpperCase()}` : "Upcoming mission-wide events and activities"}
        icon={<Calendar size={32} />}
      />
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
        <div className="max-w-7xl mx-auto px-8">
          {/* Sub-navigation for categories */}
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/events" className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${!category ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              All Events
            </Link>
            {["ECOWAS", "MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC", "TRAINING"].map(cat => (
              <Link 
                key={cat} 
                to={`/events/${cat.toLowerCase()}`} 
                className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${category?.toLowerCase() === cat.toLowerCase() ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Featured Event Section */}
          {events.length > 0 ? (
            <div className="mb-16 bg-white/80 backdrop-blur-md border-l-8 border-green-800 p-8 shadow-xl rounded-r-lg">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0 bg-green-900 text-white p-6 text-center w-32 rounded-lg shadow-lg">
                  <div className="font-heading text-4xl font-bold">{format(new Date(events[0].event_date), "dd")}</div>
                  <div className="text-sm uppercase font-bold">{format(new Date(events[0].event_date), "MMM")}</div>
                </div>
                <div className="flex-1">
                  <span className="badge badge-green">{events[0].event_type}</span>
                  <h2 className="font-heading text-3xl font-bold mt-3 text-slate-900">{events[0].title}</h2>
                  <div className="text-slate-600 mt-4 text-lg prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: events[0].description || "" }} />
                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    {events[0].location && (
                      <p className="text-slate-500 text-sm flex items-center gap-2 font-medium">
                        <MapPin size={18} className="text-green-700" /> {events[0].location}
                      </p>
                    )}
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">
                      Posted by {events[0].created_by}
                    </p>
                  </div>
                </div>
                {events[0].image_url && (
                  <div className="flex-shrink-0 w-full md:w-64 h-48 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                    <img src={events[0].image_url} alt={events[0].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>
          ) : (!category || category.toLowerCase() === 'ecowas') ? (
            <div className="mb-16 bg-white/80 backdrop-blur-md border-l-8 border-red-800 p-8 shadow-xl rounded-r-lg">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0 bg-red-900 text-white p-6 text-center w-32 rounded-lg shadow-lg">
                  <div className="font-heading text-4xl font-bold">22</div>
                  <div className="text-sm uppercase font-bold">Mar</div>
                </div>
                <div className="flex-1">
                  <span className="badge badge-red">Change of Command</span>
                  <h2 className="font-heading text-3xl font-bold mt-3 text-slate-900">Colonel Aliou Tine Takes over as New Force Commander</h2>
                  <p className="text-slate-600 mt-4 text-lg">
                    Colonel Aliou Tine has officially taken over as the new Force Commander of the ECOWAS Mission in The Gambia (ECOMIG).
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <a 
                      href="https://africa24tv.com/colonel-aliou-tine-takes-over-as-new-economic-community-of-west-african-states-mission-in-the-gambia-force-commander/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-primary flex items-center gap-2"
                    >
                      Read on Africa24 TV <ExternalLink size={18} />
                    </a>
                    <p className="text-slate-500 text-sm flex items-center gap-2 font-medium">
                      <MapPin size={18} className="text-red-700" /> Banjul, The Gambia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
              <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest">Loading Events...</p>
            </div>
          ) : events.length <= 1 ? (
            <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest">
                {events.length === 1 ? "No more events scheduled" : `No ${category ? category.toUpperCase() : ""} events scheduled`}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {events.slice(1).map(event => (
                <div key={event.id} className="card p-8 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-shrink-0 bg-green-900 text-white p-6 text-center w-32 rounded-lg">
                    <div className="font-heading text-4xl font-bold">{format(new Date(event.event_date), "dd")}</div>
                    <div className="text-sm uppercase font-bold">{format(new Date(event.event_date), "MMM")}</div>
                  </div>
                  <div className="flex-1">
                    <span className="badge badge-blue">{event.event_type}</span>
                    <h3 className="font-heading text-3xl font-bold mt-3 text-slate-900">{event.title}</h3>
                    {event.image_url && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 shadow-md">
                        <img 
                          src={event.image_url} 
                          alt={event.title} 
                          className="w-full h-64 object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                    <div className="text-slate-600 mt-4 text-lg prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: event.description || "" }} />
                    {event.location && <p className="text-slate-500 text-sm mt-4 flex items-center gap-2 font-medium"><MapPin size={18} className="text-green-700" /> {event.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const GalleryPage = () => {
  const { profile } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "images"), (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "images");
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Image",
      message: "Are you sure you want to delete this image from the gallery?",
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteDoc(doc(db, "images", id));
          setSelected(null);
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `images/${id}`);
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  return (
    <div className="min-h-screen pt-20">
      <PageHeader 
        title="Gallery" 
        subtitle="Photos from ECOMIG operations and events"
        icon={<ImageIcon size={32} />}
      />
      <section className="py-20 bg-white/80 backdrop-blur-md shadow-xl mt-[-40px] relative z-10 max-w-7xl mx-auto rounded-lg">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="relative group cursor-pointer aspect-square overflow-hidden" onClick={() => setSelected(img)}>
                <img src={img.image_url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={40} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8" onClick={() => setSelected(null)}>
            <button className="absolute top-8 right-8 text-white"><X size={40} /></button>
            <div className="max-w-5xl w-full" onClick={e => e.stopPropagation()}>
              <img src={selected.image_url} alt={selected.title} className="max-w-full max-h-[80vh] mx-auto shadow-2xl" referrerPolicy="no-referrer" />
              <div className="text-white text-center mt-8">
                <h3 className="font-heading text-3xl font-bold uppercase">{selected.title}</h3>
                {selected.names && <p className="text-green-400 font-bold mt-2 uppercase tracking-widest text-sm">{selected.names}</p>}
                <p className="text-slate-400 mt-2 text-lg">{selected.description}</p>
                
                {profile?.role === "admin" && (
                  <button 
                    onClick={(e) => handleDelete(e, selected.id)}
                    disabled={deleting}
                    className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete Image"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MANUALS PAGE ---
const ManualsPage = () => {
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <BookOpen size={48} className="mx-auto text-green-700 mb-4" />
          <h1 className="font-heading text-4xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Portal Manuals</h1>
          <p className="text-slate-600">Comprehensive guides for users and administrators of the ECOMIG Portal.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm mb-8">
          <button 
            onClick={() => setActiveTab("user")}
            className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-all ${activeTab === "user" ? "bg-green-700 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            User Manual
          </button>
          <button 
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-all ${activeTab === "admin" ? "bg-green-700 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Admin Manual
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          {activeTab === "user" ? (
            <div className="prose prose-slate max-w-none">
              <h2 className="text-2xl font-bold text-green-800 border-b pb-2 mb-6">User Manual</h2>
              
              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h3>
                <p className="text-slate-600 leading-relaxed">
                  The ECOMIG Portal is a unified platform designed to enhance mission communication, information sharing, and administrative efficiency. It provides real-time access to news, mission documents, and secure internal messaging.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">2. Accessing the Portal</h3>
                <ul className="list-disc pl-5 text-slate-600 space-y-2">
                  <li><strong>Login:</strong> Use your authorized Google account to sign in.</li>
                  <li><strong>Pending Approval:</strong> New registrations require J6 Cell approval. If you see "Access Pending," contact your Unit Commander.</li>
                  <li><strong>Logout:</strong> Always log out when using shared mission terminals.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">3. Core Features</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="font-bold text-green-700 mb-2">Internal Mailbox</h4>
                    <p className="text-sm text-slate-600">Send secure messages and attachments to specific units or all mission personnel.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="font-bold text-green-700 mb-2">Mission Documents</h4>
                    <p className="text-sm text-slate-600">Access SOPs, Directives, and Manuals specific to your department or unit.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="font-bold text-green-700 mb-2">Leadership & History</h4>
                    <p className="text-sm text-slate-600">View the current Chain of Command and the historical Chronicle of Command.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="font-bold text-green-700 mb-2">Mission AI</h4>
                    <p className="text-sm text-slate-600">Ask the mission chatbot for information regarding mission history, SOPs, or general guidance.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">4. Multilingual Support</h3>
                <p className="text-slate-600 leading-relaxed">
                  News and events can be viewed in multiple languages (English, French, Portuguese) to accommodate the diverse personnel within the mission. Use the language selector on news articles.
                </p>
              </section>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <h2 className="text-2xl font-bold text-yellow-800 border-b pb-2 mb-6">Administrator Manual</h2>
              
              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">1. Admin Dashboard</h3>
                <p className="text-slate-600 leading-relaxed">
                  The Admin Dashboard is the central hub for mission oversight. Access it via the "Admin" link in the footer or by navigating to <code className="bg-slate-100 px-1 rounded">/admin</code>.
                </p>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">2. Content Management</h3>
                <ul className="list-disc pl-5 text-slate-600 space-y-3">
                  <li><strong>News & Events:</strong> Use the "Magic Import" feature to quickly generate articles from raw text or images. Ensure all mission-critical events are categorized correctly.</li>
                  <li><strong>Gallery:</strong> Organize photos into folders (e.g., "Medal Parade 2024"). Use the bulk upload feature for efficiency.</li>
                  <li><strong>Documents:</strong> Upload SOPs and Directives to the appropriate Department/Cell. Ensure file names are descriptive.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">3. User & Security Management</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-sm text-yellow-800 font-bold uppercase mb-1">Critical Security Note</p>
                  <p className="text-sm text-yellow-700">Only authorize users with valid mission email addresses or verified personnel IDs.</p>
                </div>
                <ul className="list-disc pl-5 text-slate-600 space-y-2">
                  <li><strong>Authorization:</strong> Review "Pending" users daily. Approve or reject based on mission rotation.</li>
                  <li><strong>Roles:</strong> Assign "Editor" role to Cell PIOs and "Admin" role only to J6/MHQ core staff.</li>
                  <li><strong>Cleanup:</strong> Delete user accounts for personnel who have completed their rotation and left the mission area.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3">4. Monitoring & Oversight</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Administrators can monitor system usage to ensure mission security:
                </p>
                <ul className="list-disc pl-5 text-slate-600 space-y-2">
                  <li><strong>Chat Logs:</strong> Review AI interactions to identify common information gaps among personnel.</li>
                  <li><strong>Mail Logs:</strong> Monitor internal mail volume and recipient patterns (subject lines only for privacy).</li>
                </ul>
              </section>
            </div>
          )}
        </motion.div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-full font-bold text-sm">
            <Shield size={16} />
            FOR OFFICIAL USE ONLY (FOUO)
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [files, setFiles] = useState<{ image: File | null, folder: FileList | null }>({ image: null, folder: null });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const attachments: { name: string, url: string, type: string }[] = [];
      
      // Upload single image if exists
      if (files.image) {
        const storageRef = ref(storage, `contacts/${Date.now()}_${files.image.name}`);
        const uploadTask = uploadBytesResumable(storageRef, files.image);
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });
        const url = await getDownloadURL(snapshot.ref);
        attachments.push({ name: files.image.name, url, type: files.image.type });
      }
      
      // Upload folder files if exist
      if (files.folder) {
        for (let i = 0; i < files.folder.length; i++) {
          const file = files.folder[i];
          const storageRef = ref(storage, `contacts/${Date.now()}_folder_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);
          const snapshot = await new Promise<any>((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
          });
          const url = await getDownloadURL(snapshot.ref);
          attachments.push({ name: file.name, url, type: file.type });
        }
      }

      await addDoc(collection(db, "messages"), {
        ...form,
        attachments,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length,
        status: "unread",
        created_at: new Date().toISOString()
      });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setFiles({ image: null, folder: null });
    } catch (error: any) {
      if (error.code?.startsWith('storage/')) {
        handleStorageError(error, "contacts");
      } else {
        handleFirestoreError(error, OperationType.CREATE, "messages");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#f0f2f5] relative overflow-hidden">
      {/* Camouflage-style background elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-900 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-800 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <section className="relative z-10 max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: SEND A MESSAGE */}
          <div className="lg:col-span-7 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden border-t-[8px] border-[#1a5d3b]">
            <div className="p-10 md:p-14">
              <h2 className="text-4xl font-bold uppercase mb-12 text-[#0f172a] tracking-tight">SEND A MESSAGE</h2>
              {sent ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 text-green-800 p-10 font-bold text-center rounded border border-green-200"
                >
                  MESSAGE SENT SUCCESSFULLY!
                </motion.div>
              ) : (
                <form onSubmit={submit} className="space-y-8">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0f172a]">NAME</label>
                      <input type="text" className="w-full border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-[#1a5d3b] transition-colors text-base" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0f172a]">EMAIL</label>
                      <input type="email" className="w-full border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-[#1a5d3b] transition-colors text-base" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0f172a]">SUBJECT</label>
                      <input type="text" className="w-full border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-[#1a5d3b] transition-colors text-base" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0f172a]">MESSAGE</label>
                      <textarea className="w-full border border-slate-200 bg-white p-4 min-h-[200px] resize-none focus:outline-none focus:border-[#1a5d3b] transition-colors text-base" value={form.message} onChange={e => setForm({...form, message: e.target.value})} required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-dashed border-slate-200 p-4 rounded-md hover:border-[#1a5d3b] transition-all bg-white group cursor-pointer">
                      <label className="flex items-center justify-center gap-3 cursor-pointer mb-0">
                        <ImageIcon size={20} className="text-[#1a5d3b]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">UPLOAD IMAGE</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => setFiles({...files, image: e.target.files ? e.target.files[0] : null})} />
                      </label>
                    </div>
                    <div className="border border-dashed border-slate-200 p-4 rounded-md hover:border-[#1a5d3b] transition-all bg-white group cursor-pointer">
                      <label className="flex items-center justify-center gap-3 cursor-pointer mb-0">
                        <Folder size={20} className="text-[#1a5d3b]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">UPLOAD FOLDER</span>
                        <input type="file" webkitdirectory="" directory="" className="hidden" onChange={e => setFiles({...files, folder: e.target.files})} />
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#1a5d3b] hover:bg-[#144a2f] text-white py-4 rounded-sm font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all shadow-lg active:transform active:scale-[0.98] disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        SENDING...
                      </span>
                    ) : (
                      <>
                        <span className="text-base">SEND MESSAGE</span>
                        <Send size={20} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CONTACT INFO & OFFICE HOURS */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* CONTACT INFO CARD */}
            <div className="bg-[#2d6a4f] text-white p-10 rounded-lg shadow-xl">
              <h2 className="text-3xl font-bold uppercase mb-10 tracking-tight">CONTACT INFO</h2>
              <div className="space-y-8">
                <div className="flex items-start gap-5">
                  <div className="bg-[#1b4332] p-3 rounded-lg">
                    <MapPin size={24} className="text-[#40916c]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Headquarters</h4>
                    <p className="text-slate-200 text-sm leading-relaxed">ECOMIG Headquarters, Bakau, The Gambia</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-5">
                  <div className="bg-[#1b4332] p-3 rounded-lg">
                    <Phone size={24} className="text-[#40916c]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Phone</h4>
                    <div className="space-y-1 text-slate-200 text-sm">
                      <p>+220 360 2206</p>
                      <p>+220 340 1305</p>
                      <p>+220 518 5706</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-5">
                  <div className="bg-[#1b4332] p-3 rounded-lg">
                    <Mail size={24} className="text-[#40916c]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Email</h4>
                    <p className="text-slate-200 text-sm">info@ecomig.org</p>
                  </div>
                </div>

                <div className="pt-8 flex flex-wrap gap-4">
                  <a href="https://wa.me/2203602206" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#25d366] hover:bg-[#128c7e] text-white px-6 py-3 rounded-md transition-all font-bold text-sm shadow-md">
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                  <a href="https://t.me/ecomig_mission" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-6 py-3 rounded-md transition-all font-bold text-sm shadow-md">
                    <Send size={18} /> Telegram
                  </a>
                  <a href="https://facebook.com/ecomig.mission" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#1877f2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-md transition-all font-bold text-sm shadow-md">
                    <Facebook size={18} /> Facebook
                  </a>
                </div>
              </div>
            </div>

            {/* OFFICE HOURS CARD */}
            <div className="bg-[#0f172a] text-white p-10 rounded-lg shadow-xl">
              <h3 className="text-2xl font-bold uppercase mb-6 tracking-tight">OFFICE HOURS</h3>
              <div className="space-y-3 text-slate-300 text-base">
                <p className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span className="font-bold text-white">8:00 AM - 5:00 PM</span>
                </p>
                <p className="flex justify-between">
                  <span>Saturday - Sunday:</span>
                  <span className="font-bold text-white">Closed</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [defaultPass, setDefaultPass] = useState("ecomig2026");
  const [resetSent, setResetSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { profile, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) navigate("/admin/dashboard");
  }, [profile, navigate]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "auth"), (snap) => {
      if (snap.exists()) {
        setDefaultPass(snap.data().default_password || "ecomig2026");
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      navigate("/admin/dashboard");
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error("Error logging in with Google: " + error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickBootstrap = async () => {
    setIsLoggingIn(true);
    const defaultEmail = "admin@ecomig.org";
    setEmail(defaultEmail);
    setPass(defaultPass);
    
    // Small delay to ensure state updates
    setTimeout(async () => {
      try {
        await login(defaultEmail, defaultPass);
        navigate("/admin/dashboard");
      } catch (error: any) {
        console.error("Quick login error:", error);
        toast.error("Quick login failed: " + error.message);
      } finally {
        setIsLoggingIn(false);
      }
    }, 100);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
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
      await login(email, pass);
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
          <div><label className="form-label">Email</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoggingIn} /></div>
          <div><label className="form-label">Password</label><input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} required disabled={isLoggingIn} /></div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={isLoggingIn}>
            {isLoggingIn ? <Clock className="animate-spin" size={20} /> : null}
            {isLoggingIn ? "Processing..." : "Login with Email"}
          </button>
          <button 
            type="button" 
            onClick={handleQuickBootstrap} 
            disabled={isLoggingIn}
            className="w-full text-xs text-green-700 font-bold hover:underline mt-2 disabled:opacity-50"
          >
            Quick Login as admin@ecomig.org
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-4 text-slate-400 text-sm absolute">OR</span>
          </div>
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 py-3 rounded-md font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isLoggingIn ? <Clock className="animate-spin" size={20} /> : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isLoggingIn ? "Authenticating..." : "Sign in with Google"}
          </button>
        </div>
        
        <div className="mt-6 text-center space-y-4">
          <button 
            onClick={handleForgotPassword}
            className="text-sm text-slate-500 hover:text-green-700 transition-colors underline"
          >
            Forgot Password?
          </button>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Official Mission Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
              {["mhq@ecomig.org", "fhq@ecomig.org", "dfc@ecomig.org", "jman@ecomig.org", "jint@ecomig.org", "jops@ecomig.org"].map(m => (
                <button 
                  key={m} 
                  type="button"
                  onClick={() => { setEmail(m); setPass(defaultPass); }}
                  className="text-left hover:text-green-700 hover:underline transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-green-700 text-[10px] font-bold mt-2">Default Password: {defaultPass}</p>
          </div>
          
          <Link to="/" className="block text-green-800 font-bold hover:underline">
            Back to Website
          </Link>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isDestructive = true 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  confirmText?: string,
  cancelText?: string,
  isDestructive?: boolean
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-slate-600">{message}</p>
        </div>
        <div className="bg-slate-50 p-4 flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary px-6 py-2">{cancelText}</button>
          <button 
            onClick={onConfirm} 
            className={`px-6 py-2 rounded-lg font-bold uppercase text-xs text-white transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const { profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("news");
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [docs, setDocs] = useState<MissionDocument[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [chronicle, setChronicle] = useState<ChronicleOfCommand[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [internalMails, setInternalMails] = useState<InternalMail[]>([]);
  const [clubs, setClubs] = useState<FootballClub[]>([]);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [showModal, setShowModal] = useState<"news" | "edit_news" | "event" | "edit_event" | "user" | "edit_user" | "doc" | "edit_doc" | "image" | "edit_image" | "chronicle" | "edit_chronicle" | "leadership" | "edit_leadership" | "football_club" | "edit_football_club" | "football_match" | "edit_football_match" | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedChronicle, setSelectedChronicle] = useState<ChronicleOfCommand | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<MissionDocument | null>(null);
  const [selectedClub, setSelectedClub] = useState<FootballClub | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("ecomig2026");
  const [newDoc, setNewDoc] = useState({ title: "", category: "SOP", file_url: "" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{firestore: string, storage: string} | null>(null);

  useEffect(() => {
    const checkConnections = async () => {
      const status = { firestore: "Checking...", storage: "Checking..." };
      setConnectionStatus(status);
      
      try {
        await getDocs(query(collection(db, "users"), limit(1)));
        status.firestore = "Connected";
      } catch (e: any) {
        status.firestore = `Error: ${e.message}`;
      }
      
      try {
        const testRef = ref(storage, 'test_connection.txt');
        const blob = new Blob(["test"], { type: 'text/plain' });
        const uploadTask = uploadBytesResumable(testRef, blob);
        await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });
        status.storage = "Connected";
      } catch (e: any) {
        status.storage = e.code === 'storage/retry-limit-exceeded' 
          ? "Error: Storage Connection Timeout (Check Firebase Plan/Quota)" 
          : `Error: ${e.message}`;
      }
      
      setConnectionStatus({...status});
    };
    
    if (profile?.role === 'admin') {
      checkConnections();
    }
  }, [profile]);

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await addDoc(collection(db, "documents"), {
      ...newDoc,
      uploaded_by: profile.full_name,
      created_at: new Date().toISOString()
    });
    setNewDoc({ title: "", category: "SOP", file_url: "" });
    setShowModal(null);
  };

  const handleDeleteDoc = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Document",
      message: "Are you sure you want to delete this mission document?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "documents", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
        }
      }
    });
  };

  useEffect(() => {
    if (!loading && !profile) {
      navigate("/admin");
      return;
    }
    if (!profile) return;
    
    const unsubs: (() => void)[] = [];

    // Public/Authenticated listeners
    const qNews = query(collection(db, "news"), orderBy("created_at", "desc"));
    unsubs.push(onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "news");
    }));

    const qEvents = query(collection(db, "events"), orderBy("event_date", "desc"));
    unsubs.push(onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "events");
    }));

    const qUsers = query(collection(db, "users"), orderBy("created_at", "desc"));
    unsubs.push(onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    }));

    const qDocs = query(collection(db, "documents"), orderBy("created_at", "desc"));
    unsubs.push(onSnapshot(qDocs, (snapshot) => {
      setDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionDocument)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "documents");
    }));

    const qImages = query(collection(db, "images"), orderBy("created_at", "desc"));
    unsubs.push(onSnapshot(qImages, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "images");
    }));

    const qChronicle = query(collection(db, "chronicle_of_command"), orderBy("years", "desc"));
    unsubs.push(onSnapshot(qChronicle, (snapshot) => {
      setChronicle(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChronicleOfCommand)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chronicle_of_command");
    }));

    const qLeaders = query(collection(db, "leaders"), orderBy("order", "asc"));
    unsubs.push(onSnapshot(qLeaders, (snapshot) => {
      setLeaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leader)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "leaders");
    }));

    const qClubs = query(collection(db, "football_clubs"), orderBy("points", "desc"));
    unsubs.push(onSnapshot(qClubs, (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FootballClub)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "football_clubs");
    }));

    const qMatches = query(collection(db, "football_matches"), orderBy("date", "desc"));
    unsubs.push(onSnapshot(qMatches, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FootballMatch)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "football_matches");
    }));

    // Fetch System Settings
    const qSettings = doc(db, "settings", "auth");
    unsubs.push(onSnapshot(qSettings, (snapshot) => {
      if (snapshot.exists()) {
        setDefaultPassword(snapshot.data().default_password || "ecomig2026");
      }
    }));

    // Editor/Admin listeners
    if (profile.role === 'admin' || profile.role === 'editor') {
      const qMsgs = query(collection(db, "messages"), orderBy("created_at", "desc"));
      unsubs.push(onSnapshot(qMsgs, (snapshot) => {
        setMsgs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "messages");
      }));
    }

    // Admin-only listeners
    if (profile.role === 'admin') {
      const qLogs = query(collection(db, "chat_logs"), orderBy("created_at", "desc"), limit(50));
      unsubs.push(onSnapshot(qLogs, (snapshot) => {
        setChatLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "chat_logs");
      }));

      const qInternalMail = query(collection(db, "internal_mail"), orderBy("created_at", "desc"), limit(50));
      unsubs.push(onSnapshot(qInternalMail, (snapshot) => {
        setInternalMails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "internal_mail");
      }));
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [profile, loading, navigate]);

  const updateDefaultPassword = async (newPass: string) => {
    try {
      await setDoc(doc(db, "settings", "auth"), { default_password: newPass }, { merge: true });
      toast.success("Default mission password updated successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/auth");
    }
  };

  const deleteLeader = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Leader",
      message: "Are you sure you want to remove this leader from the mission leadership?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "leaders", id));
          setConfirmModal(null);
          toast.success("Leader removed successfully");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `leaders/${id}`);
        }
      }
    });
  };

  const deleteUser = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
        }
      }
    });
  };

  const activateUser = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Activate User",
      message: "Are you sure you want to activate this user account?",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "users", id), { role: "user" });
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
        }
      }
    });
  };

  const deleteNews = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete News",
      message: "Are you sure you want to delete this news article?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "news", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `news/${id}`);
        }
      }
    });
  };

  const deleteEvent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Event",
      message: "Are you sure you want to delete this event?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "events", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
        }
      }
    });
  };

  const deleteImage = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Image",
      message: "Are you sure you want to delete this image from the gallery?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "images", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `images/${id}`);
        }
      }
    });
  };

  const deleteChronicle = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Chronicle Record",
      message: "Are you sure you want to delete this chronicle record?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "chronicle_of_command", id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `chronicle_of_command/${id}`);
        }
      }
    });
  };

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "messages", id), { status: "read" });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${id}`);
    }
  };

  const seedPersonnel = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Seed Mission Personnel",
      message: "This will pre-authorize all official mission accounts (MHQ, FHQ, DFC, J-Cells, etc.). Continue?",
      onConfirm: async () => {
        try {
          const personnel = [
            { username: "mhq@ecomig.org", full_name: "Head of Mission", unit: "MHQ", role: "admin" },
            { username: "fhq@ecomig.org", full_name: "Force Commander", unit: "FHQ", role: "admin" },
            { username: "dfc@ecomig.org", full_name: "Deputy Force Commander", unit: "DFC", role: "admin" },
            { username: "jman@ecomig.org", full_name: "J1 Cell (Personnel)", unit: "J1/4", role: "admin" },
            { username: "jint@ecomig.org", full_name: "J2 Cell (Intelligence)", unit: "J2", role: "admin" },
            { username: "jops@ecomig.org", full_name: "J3 Cell (Operations)", unit: "J3/5", role: "admin" },
            { username: "j6@ecomig.org", full_name: "J6 Cell (Comms)", unit: "J6", role: "admin" },
            { username: "j79@ecomig.org", full_name: "J7/9 Cell (Training/CIMIC)", unit: "J7/9", role: "admin" },
            { username: "pm@ecomig.org", full_name: "Provost Marshal", unit: "PM", role: "user" },
            { username: "pio@ecomig.org", full_name: "Public Information Officer", unit: "PIO", role: "editor" },
            { username: "padfc@ecomig.org", full_name: "PA to DFC", unit: "PA DFC", role: "user" },
            { username: "cc@ecomig.org", full_name: "Contingent Commander", unit: "CC", role: "user" },
            { username: "senbat@ecomig.org", full_name: "SENBAT Commander", unit: "SENBAT", role: "user" },
            { username: "nigcoy@ecomig.org", full_name: "NIGCOY Commander", unit: "NIGCOY", role: "user" },
            { username: "ghancoy@ecomig.org", full_name: "GHANCOY Commander", unit: "GHANCOY", role: "user" },
            { username: "senfpu@ecomig.org", full_name: "SENFPU Commander", unit: "SENFPU", role: "user" },
            { username: "senpc@ecomig.org", full_name: "SENPC Commander", unit: "SENPC", role: "user" }
          ];

          for (const p of personnel) {
            const q = query(collection(db, "users"), where("username", "==", p.username));
            const snap = await getDocs(q);
            if (snap.empty) {
              await addDoc(collection(db, "users"), {
                ...p,
                created_at: new Date().toISOString()
              });
            }
          }
          toast.success("Mission personnel seeded successfully.");
          setConfirmModal(null);
        } catch (error) {
          console.error("Error seeding personnel:", error);
          toast.error("Error seeding mission personnel.");
        }
      }
    });
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-transparent">
      <header className="bg-slate-900/95 backdrop-blur-md text-white p-6 flex items-center justify-between shadow-xl border-b border-white/10 relative z-20">
        <div className="flex items-center gap-6">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <EcomigLogo />
          </div>
          <span className="font-heading text-2xl font-bold uppercase tracking-widest hidden md:inline text-white drop-shadow-sm">Dashboard</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-400 font-medium">{profile.full_name} ({profile.role})</span>
          <button onClick={() => { logout(); navigate("/admin"); }} className="flex items-center gap-2 text-red-400 font-bold hover:text-red-300"><LogOut size={20} /> Logout</button>
        </div>
      </header>

      {/* Connection Status Indicator */}
      {profile?.role === 'admin' && connectionStatus && (
        <div className="bg-slate-900 border-b border-white/10 px-8 py-2 flex items-center gap-6 text-[10px] font-mono uppercase tracking-wider text-white/60">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.firestore === "Connected" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="opacity-70">Firestore:</span>
            <span className={connectionStatus.firestore === "Connected" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
              {connectionStatus.firestore}
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-6">
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.storage === "Connected" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="opacity-70">Storage:</span>
            <span className={connectionStatus.storage === "Connected" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
              {connectionStatus.storage}
            </span>
            {connectionStatus.storage.includes("Timeout") && (
              <span className="ml-2 text-[9px] normal-case italic text-white/40">
                (Tip: Use external URLs if uploads fail)
              </span>
            )}
          </div>
          <div className="ml-auto text-white/30 italic text-[9px]">
            * Connection health check performed on dashboard load
          </div>
        </div>
      )}
      <div className="flex flex-1">
        <aside className="w-72 bg-slate-800/90 backdrop-blur-md p-8 space-y-4">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 font-bold"><Home size={20} /> View Site</Link>
          {[
            { id: "news", label: "News", icon: Newspaper },
            { id: "events", label: "Events", icon: Calendar },
            { id: "docs", label: "Documents", icon: FileText },
            { id: "gallery", label: "Gallery", icon: ImageIcon },
            { id: "chronicle", label: "Chronicle", icon: History },
            { id: "leadership", label: "Leadership", icon: Shield },
            { id: "homepage", label: "Home Page", icon: Home },
            { id: "inbox", label: "Inbox", icon: Inbox },
            { id: "chat", label: "Chat Logs", icon: MessageCircle },
            { id: "mail", label: "Internal Mail", icon: Mail },
            { id: "football", label: "ECOMIG TV", icon: Tv },
            { id: "users", label: "Users", icon: Users }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-4 p-4 font-bold uppercase tracking-wider transition-colors ${tab === t.id ? "bg-green-800 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
              <t.icon size={20} /> {t.label}
              {t.id === "inbox" && msgs.filter(m => m.status === "unread").length > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{msgs.filter(m => m.status === "unread").length}</span>}
            </button>
          ))}
          {profile.role === 'admin' && (
            <button onClick={() => setTab("settings")} className={`w-full flex items-center gap-4 p-4 font-bold uppercase tracking-wider transition-colors ${tab === "settings" ? "bg-green-800 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
              <Shield size={20} /> Settings
            </button>
          )}
        </aside>
        <main className="flex-1 p-12">
          <div className="flex items-center justify-between mb-12">
            <h1 className="font-heading text-4xl font-bold uppercase text-white drop-shadow-lg">
              {tab === "news" ? "Manage News" : tab === "events" ? "Manage Events" : tab === "users" ? "User Management" : tab === "gallery" ? "Manage Gallery" : tab === "chronicle" ? "Manage Chronicle" : tab === "leadership" ? "Manage Leadership" : tab === "homepage" ? "Manage Home Page" : tab === "settings" ? "System Settings" : tab === "football" ? "Manage ECOMIG TV" : "Messages"}
            </h1>
            {tab === "news" && <button onClick={() => setShowModal("news")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add News</button>}
            {tab === "events" && <button onClick={() => setShowModal("event")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Event</button>}
            {tab === "docs" && <button onClick={() => setShowModal("doc")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Document</button>}
            {tab === "gallery" && <button onClick={() => setShowModal("image")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Image</button>}
            {tab === "chronicle" && <button onClick={() => setShowModal("chronicle")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Record</button>}
            {tab === "leadership" && <button onClick={() => setShowModal("leadership")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Leader</button>}
            {tab === "football" && (
              <div className="flex gap-4">
                <button onClick={() => setShowModal("football_club")} className="btn-secondary border-green-700 text-green-700 flex items-center gap-2"><Plus size={20} /> Add Club</button>
                <button onClick={() => setShowModal("football_match")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add Match</button>
              </div>
            )}
            {tab === "users" && profile.role === "admin" && (
              <div className="flex items-center gap-4">
                <button onClick={seedPersonnel} className="btn-secondary flex items-center gap-2 border-green-700 text-green-700 hover:bg-green-50"><Database size={20} /> Seed Personnel</button>
                <button onClick={() => setShowModal("user")} className="btn-primary flex items-center gap-2"><Plus size={20} /> Add User</button>
              </div>
            )}
          </div>
          <div className={`shadow-2xl rounded-lg overflow-hidden border border-white/20 ${tab === 'chat' || tab === 'homepage' ? 'bg-white' : 'bg-white/90 backdrop-blur-md'}`}>
            {tab === "homepage" && <HomePageManager />}
            {tab === "football" && (
              <div className="p-8 space-y-12">
                <section>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Trophy className="text-yellow-500" /> Football Clubs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {clubs.map(c => (
                      <div key={c.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-black uppercase tracking-tight text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{c.unit} • {c.points} PTS</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedClub(c); setShowModal("edit_football_club"); }} className="p-2 text-blue-600 hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                          <button onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Delete Club",
                              message: `Are you sure you want to delete ${c.name}?`,
                              onConfirm: async () => {
                                try {
                                  await deleteDoc(doc(db, "football_clubs", c.id));
                                  setConfirmModal(null);
                                } catch (error) {
                                  toast.error("Error deleting club");
                                }
                              }
                            });
                          }} className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Tv className="text-green-600" /> Matches / Fixtures
                  </h3>
                  <div className="space-y-4">
                    {matches.map(m => (
                      <div key={m.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-3 min-w-[200px] justify-end">
                            <span className="font-bold text-sm uppercase">{m.teamA}</span>
                          </div>
                          <div className={`px-4 py-2 rounded-lg font-black text-lg font-mono ${m.status === 'live' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-900'}`}>
                            {m.scoreA} - {m.scoreB}
                          </div>
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <span className="font-bold text-sm uppercase">{m.teamB}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${m.status === 'live' ? 'text-red-500' : 'text-slate-400'}`}>{m.status}</p>
                            <p className="text-xs font-mono">{m.time}</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => { setSelectedMatch(m); setShowModal("edit_football_match"); }} className="p-2 text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"><Edit size={18} /></button>
                             <button onClick={() => {
                               setConfirmModal({
                                 isOpen: true,
                                 title: "Delete Match",
                                 message: `Are you sure you want to delete this match record?`,
                                 onConfirm: async () => {
                                   try {
                                     await deleteDoc(doc(db, "football_matches", m.id));
                                     setConfirmModal(null);
                                   } catch (error) {
                                     toast.error("Error deleting match");
                                   }
                                 }
                               });
                             }} className="p-2 text-red-600 hover:bg-slate-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {tab === "news" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr><th className="text-left p-6 font-heading uppercase text-slate-500">Title</th><th className="text-left p-6 font-heading uppercase text-slate-500">Created</th><th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th></tr>
                </thead>
                <tbody>
                  {news.map(n => (
                    <tr key={n.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{n.title}</td>
                      <td className="p-6 text-slate-500">{format(new Date(n.created_at), "MMM d, yyyy")}</td>
                      <td className="p-6 flex gap-4">
                        <button onClick={() => navigate(`/news/${n.id}`)} className="text-green-600 hover:text-green-800">
                          <Eye size={20} />
                        </button>
                        <button onClick={() => { setSelectedNews(n); setShowModal("edit_news"); }} className="text-blue-600 hover:text-blue-800">
                          <Edit size={20} />
                        </button>
                        <button onClick={() => deleteNews(n.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "news" && news.length === 0 && (
              <div className="p-20 text-center">
                <Newspaper size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No news articles found.</p>
                <button onClick={() => setShowModal("news")} className="mt-4 text-green-700 font-bold hover:underline">Add your first news article</button>
              </div>
            )}
            {tab === "events" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr><th className="text-left p-6 font-heading uppercase text-slate-500">Title</th><th className="text-left p-6 font-heading uppercase text-slate-500">Date</th><th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th></tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{e.title}</td>
                      <td className="p-6 text-slate-500">{format(new Date(e.event_date), "MMM d, yyyy")}</td>
                      <td className="p-6 flex gap-4">
                        <button onClick={() => navigate(`/events`)} className="text-green-600 hover:text-green-800">
                          <Eye size={20} />
                        </button>
                        <button onClick={() => { setSelectedEvent(e); setShowModal("edit_event"); }} className="text-blue-600 hover:text-blue-800">
                          <Edit size={20} />
                        </button>
                        <button onClick={() => deleteEvent(e.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "events" && events.length === 0 && (
              <div className="p-20 text-center">
                <Calendar size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No events scheduled.</p>
                <button onClick={() => setShowModal("event")} className="mt-4 text-green-700 font-bold hover:underline">Schedule your first event</button>
              </div>
            )}
            {tab === "docs" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr><th className="text-left p-6 font-heading uppercase text-slate-500">Title</th><th className="text-left p-6 font-heading uppercase text-slate-500">Category</th><th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th></tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{d.title}</td>
                      <td className="p-6 text-slate-500"><span className="px-2 py-1 bg-slate-100/50 rounded text-xs font-bold">{d.category}</span></td>
                      <td className="p-6 flex gap-4">
                        <button onClick={() => window.open(d.file_url, "_blank")} className="text-blue-600 hover:text-blue-800">
                          <Download size={20} />
                        </button>
                        <button onClick={() => { setSelectedDoc(d); setShowModal("edit_doc"); }} className="text-amber-600 hover:text-amber-800">
                          <Edit size={20} />
                        </button>
                        <button onClick={() => handleDeleteDoc(d.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "docs" && docs.length === 0 && (
              <div className="p-20 text-center">
                <FileText size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No mission documents uploaded.</p>
                <button onClick={() => setShowModal("doc")} className="mt-4 text-green-700 font-bold hover:underline">Upload your first document</button>
              </div>
            )}
            {tab === "gallery" && (
              <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                    <img src={img.image_url} alt={img.title} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-white text-xs font-bold mb-2 truncate w-full">{img.title}</p>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(img.image_url, "_blank")} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => { setSelectedImage(img); setShowModal("edit_image"); }} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteImage(img.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {images.length === 0 && <div className="col-span-full p-12 text-center text-slate-400">No images in gallery yet.</div>}
              </div>
            )}
            {tab === "chat" && (
              <div className="divide-y">
                {chatLogs.map(log => (
                  <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-slate-900">{log.user_name}</span>
                        <span className="text-slate-400 text-xs ml-2">({log.user_unit})</span>
                      </div>
                      <span className="text-slate-400 text-xs">{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-green-700 uppercase min-w-[60px]">User:</span>
                        <p className="text-sm text-slate-700">{log.question}</p>
                      </div>
                      <div className="flex gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-blue-700 uppercase min-w-[60px]">AI:</span>
                        <p className="text-sm text-slate-900 italic leading-relaxed">{log.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {chatLogs.length === 0 && <div className="p-12 text-center text-slate-400">No chat logs available yet.</div>}
              </div>
            )}
            {tab === "mail" && (
              <div className="divide-y">
                {internalMails.map(mail => (
                  <div key={mail.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-slate-900">{mail.sender_name}</span>
                        <span className="text-slate-400 text-xs ml-2 uppercase">({mail.sender_unit})</span>
                        <span className="mx-2 text-slate-300">→</span>
                        <span className="font-bold text-green-700">
                          {mail.receiver_unit ? `Unit: ${mail.receiver_unit}` : `User ID: ${mail.receiver_id}`}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs font-mono">{format(new Date(mail.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm font-bold text-slate-600 uppercase">Subject: {mail.subject}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-slate-700 whitespace-pre-wrap text-sm">{mail.body}</p>
                      {mail.attachments && mail.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                          {mail.attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-green-500 transition-colors">
                              <FileText size={12} /> {att.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {internalMails.length === 0 && <div className="p-12 text-center text-slate-400">No internal mail logs available yet.</div>}
              </div>
            )}
            {tab === "chronicle" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Name</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Unit</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Years</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chronicle.map(c => (
                    <tr key={c.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{c.name}</td>
                      <td className="p-6 text-slate-500"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">{c.unit}</span></td>
                      <td className="p-6 text-slate-500 font-mono">{c.years}</td>
                      <td className="p-6 flex gap-4">
                        <button onClick={() => { setSelectedChronicle(c); setShowModal("edit_chronicle"); }} className="text-blue-600 hover:text-blue-800">
                          <Edit size={20} />
                        </button>
                        <button onClick={() => deleteChronicle(c.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "chronicle" && chronicle.length === 0 && (
              <div className="p-20 text-center">
                <History size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No chronicle records found.</p>
                <button onClick={() => setShowModal("chronicle")} className="mt-4 text-green-700 font-bold hover:underline">Add your first record</button>
              </div>
            )}
            {tab === "leadership" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Order</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Name</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Position</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Unit</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map(l => (
                    <tr key={l.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-mono text-slate-500">{l.order}</td>
                      <td className="p-6 font-bold text-slate-900">{l.name}</td>
                      <td className="p-6 text-slate-500">{l.position}</td>
                      <td className="p-6 text-slate-500">{l.unit}</td>
                      <td className="p-6 flex gap-4">
                        <button onClick={() => { setSelectedLeader(l); setShowModal("edit_leadership"); }} className="text-blue-600 hover:text-blue-800">
                          <Edit size={20} />
                        </button>
                        <button onClick={() => deleteLeader(l.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "leadership" && leaders.length === 0 && (
              <div className="p-20 text-center">
                <Shield size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No leadership entries found.</p>
                <button onClick={() => setShowModal("leadership")} className="mt-4 text-green-700 font-bold hover:underline">Add your first leader</button>
              </div>
            )}
            {tab === "inbox" && (
              <div className="divide-y">
                {msgs.map(m => (
                  <div key={m.id} className={`p-8 ${m.status === "unread" ? "bg-green-50/50 border-l-8 border-green-600" : ""}`}>
                    <div className="flex justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900">{m.subject}</h3>
                      <span className="text-slate-400 text-sm">{format(new Date(m.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <p className="text-slate-500 mb-4 font-medium">From: {m.name} ({m.email})</p>
                    <p className="text-slate-700 leading-relaxed">{m.message}</p>
                    {m.has_attachments && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                          <Folder size={18} className="text-green-700" />
                          <span>{m.attachment_count} Attachment(s)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.attachments?.map((att: any, i: number) => (
                            <a 
                              key={i} 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 text-xs font-bold text-slate-600 hover:border-green-500 hover:bg-white transition-all"
                            >
                              <FileText size={14} /> {att.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.status === "unread" && <button onClick={() => markRead(m.id)} className="mt-6 text-green-700 font-bold flex items-center gap-2 hover:text-green-900"><Eye size={18} /> Mark as Read</button>}
                  </div>
                ))}
                {msgs.length === 0 && (
                  <div className="p-20 text-center">
                    <Inbox size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">Your inbox is empty.</p>
                  </div>
                )}
              </div>
            )}
            {tab === "users" && (
              <table className="w-full">
                <thead className="bg-slate-50/50 backdrop-blur-sm border-b">
                  <tr>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Name</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Role</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Unit</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Joined</th>
                    <th className="text-left p-6 font-heading uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="font-bold text-slate-900">{u.full_name}</div>
                        <div className="text-xs text-slate-400">{u.username.includes('@ecomig.org') ? u.username.split('@')[0] : u.username}</div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          u.role === "admin" ? "bg-red-100 text-red-700" : 
                          u.role === "pending" ? "bg-yellow-100 text-yellow-700" : 
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 text-slate-500 font-medium">{u.unit}</td>
                      <td className="p-6 text-slate-500">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                      <td className="p-6 flex gap-4">
                        {u.role === "pending" && (
                          <button onClick={() => activateUser(u.id)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase">Activate</button>
                        )}
                        <button onClick={() => { setSelectedUser(u); setShowModal("edit_user"); }} className="text-blue-600 hover:text-blue-800">
                          <Edit size={20} />
                        </button>
                        {u.id !== profile.id && (
                          <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-800"><Trash2 size={20} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "users" && users.length === 0 && (
              <div className="p-20 text-center">
                <Users size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No users registered.</p>
              </div>
            )}
            {tab === "settings" && (
              <div className="p-12 space-y-12">
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield size={24} className="text-green-700" />
                    Authentication Settings
                  </h3>
                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Default Mission Password</label>
                      <p className="text-xs text-slate-500 mb-4 italic">
                        This password is used for newly seeded accounts and first-time logins of official mission personnel.
                        Changing this will NOT affect users who have already logged in and set their own password.
                      </p>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          className="flex-1 bg-white border border-slate-300 p-3 rounded-lg font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
                          value={defaultPassword} 
                          onChange={(e) => setDefaultPassword(e.target.value)}
                        />
                        <button 
                          onClick={() => updateDefaultPassword(defaultPassword)}
                          className="bg-green-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-800 transition-all shadow-lg active:scale-95"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database size={24} className="text-green-700" />
                    System Maintenance
                  </h3>
                  <div className="max-w-md space-y-6">
                    <p className="text-sm text-slate-600">
                      Perform administrative maintenance tasks for the Mission Portal. Use the button below to pre-authorize the full list of official mission accounts.
                    </p>
                    <button 
                      onClick={seedPersonnel}
                      className="w-full flex items-center justify-center gap-3 bg-white border-2 border-green-700 text-green-700 p-4 rounded-xl font-bold hover:bg-green-50 transition-all shadow-md active:scale-95"
                    >
                      <Database size={20} />
                      Re-Seed Personnel Database
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white/95 backdrop-blur-md w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden my-auto">
              <div className="bg-slate-900/90 backdrop-blur-md p-6 text-white flex justify-between items-center">
                <h2 className="font-heading text-2xl font-bold uppercase">
                  {showModal === "news" ? "Add News Article" : 
                   showModal === "edit_news" ? "Edit News Article" :
                   showModal === "event" ? "Add Event" : 
                   showModal === "edit_event" ? "Edit Event" :
                   showModal === "doc" ? "Upload Mission Document" :
                   showModal === "image" ? "Add Gallery Image" :
                   showModal === "edit_image" ? "Edit Image Details" :
                   showModal === "edit_doc" ? "Edit Document Details" :
                   showModal === "edit_user" ? "Edit User Profile" :
                   showModal === "chronicle" ? "Add Chronicle Record" :
                   showModal === "edit_chronicle" ? "Edit Chronicle Record" :
                   showModal === "leadership" ? "Add Mission Leader" :
                   showModal === "edit_leadership" ? "Edit Leader Details" :
                    showModal === "football_club" ? "Add Football Club" :
                    showModal === "edit_football_club" ? "Edit Club Details" :
                    showModal === "football_match" ? "Add Match Fixture" :
                    showModal === "edit_football_match" ? "Edit Match Record" :
                    "Add Authorized User"}
                </h2>
                <button onClick={() => setShowModal(null)}><X size={24} /></button>
              </div>
              <div className="p-8">
                {showModal === "news" ? <NewsForm onSuccess={() => setShowModal(null)} /> : 
                 showModal === "edit_news" ? <EditNewsForm news={selectedNews!} onSuccess={() => { setShowModal(null); setSelectedNews(null); }} /> :
                 showModal === "event" ? <EventForm onSuccess={() => setShowModal(null)} /> :
                 showModal === "edit_event" ? <EditEventForm event={selectedEvent!} onSuccess={() => { setShowModal(null); setSelectedEvent(null); }} /> :
                 showModal === "doc" ? (
                   <form onSubmit={addDocument} className="space-y-4">
                     <div>
                       <label className="form-label">Document Title</label>
                       <input type="text" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} className="form-input" required />
                     </div>
                     <div>
                       <label className="form-label">Category</label>
                       <select value={newDoc.category} onChange={e => setNewDoc({...newDoc, category: e.target.value as any})} className="form-input">
                         <option value="SOP">SOP (Standard Operating Procedure)</option>
                         <option value="Manual">Mission Manual</option>
                         <option value="Directive">ECOWAS Directive</option>
                         <option value="Report">Monthly Report</option>
                       </select>
                     </div>
                     <div>
                       <label className="form-label">File URL (PDF)</label>
                       <input type="url" value={newDoc.file_url} onChange={e => setNewDoc({...newDoc, file_url: e.target.value})} className="form-input" placeholder="https://..." required />
                     </div>
                     <div className="flex gap-4 pt-4">
                       <button type="submit" className="btn-primary flex-1">Upload</button>
                       <button type="button" onClick={() => setShowModal(null)} className="btn-secondary flex-1">Cancel</button>
                     </div>
                   </form>
                 ) : showModal === "image" ? (
                   <ImageForm onSuccess={() => setShowModal(null)} />
                 ) : showModal === "edit_image" ? (
                   <EditImageForm image={selectedImage!} onSuccess={() => { setShowModal(null); setSelectedImage(null); }} />
                 ) : showModal === "edit_doc" ? (
                    <EditDocumentForm docItem={selectedDoc!} onSuccess={() => { setShowModal(null); setSelectedDoc(null); }} />
                  ) : showModal === "edit_user" ? (
                    <EditUserForm userProfile={selectedUser!} onSuccess={() => { setShowModal(null); setSelectedUser(null); }} />
                  ) : showModal === "chronicle" ? (
                   <ChronicleForm onSuccess={() => setShowModal(null)} />
                 ) : showModal === "edit_chronicle" ? (
                   <EditChronicleForm record={selectedChronicle!} onSuccess={() => { setShowModal(null); setSelectedChronicle(null); }} />
                 ) : showModal === "leadership" ? (
                   <LeadershipForm onSuccess={() => setShowModal(null)} />
                 ) : showModal === "edit_leadership" ? (
                   <EditLeadershipForm leader={selectedLeader!} onSuccess={() => { setShowModal(null); setSelectedLeader(null); }} />
                 ) : showModal === "football_club" ? (
                   <ClubForm onSuccess={() => setShowModal(null)} />
                 ) : showModal === "edit_football_club" ? (
                   <EditClubForm club={selectedClub!} onSuccess={() => { setShowModal(null); setSelectedClub(null); }} />
                 ) : showModal === "football_match" ? (
                   <MatchForm clubs={clubs} onSuccess={() => setShowModal(null)} />
                 ) : showModal === "edit_football_match" ? (
                   <EditMatchForm match={selectedMatch!} clubs={clubs} onSuccess={() => { setShowModal(null); setSelectedMatch(null); }} />
                 ) :
                 <UserForm onSuccess={() => setShowModal(null)} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditDocumentForm = ({ docItem, onSuccess }: { docItem: MissionDocument, onSuccess: () => void }) => {
  const [form, setForm] = useState({ title: docItem.title, category: docItem.category, file_url: docItem.file_url });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "documents", docItem.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${docItem.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Document Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
      <div>
        <label className="form-label">Category</label>
        <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
          <option value="SOP">SOP (Standard Operating Procedure)</option>
          <option value="Manual">Mission Manual</option>
          <option value="Directive">ECOWAS Directive</option>
          <option value="Report">Monthly Report</option>
        </select>
      </div>
      <div><label className="form-label">File URL</label><input type="url" className="form-input" value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})} required /></div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};

const EditUserForm = ({ userProfile, onSuccess }: { userProfile: UserProfile, onSuccess: () => void }) => {
  const [form, setForm] = useState({ full_name: userProfile.full_name, role: userProfile.role, unit: userProfile.unit });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", userProfile.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Full Name</label><input type="text" className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
      <div>
        <label className="form-label">Unit</label>
        <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
          {["MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"].map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Role</label>
        <select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
          <option value="pending">Pending</option>
          <option value="user">User</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};

const ImageForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { profile } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", names: "", category: "General", image_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState<FileList | null>(null);
  const [uploadType, setUploadType] = useState<"single" | "folder">("single");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("User profile not loaded. Please try logging out and in again.");
      return;
    }

    setLoading(true);
    
    try {
      if (uploadType === "single") {
        let finalImageUrl = form.image_url;

        if (file) {
          console.log("Starting single gallery upload for:", file.name);
          const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);
          const snapshot = await new Promise<any>((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
          });
          finalImageUrl = await getDownloadURL(snapshot.ref);
        } else if (!finalImageUrl) {
          toast.error("Please select a file or enter an image URL.");
          setLoading(false);
          return;
        }
        
        await addDoc(collection(db, "images"), {
          ...form,
          image_url: finalImageUrl,
          uploaded_by: profile.full_name,
          created_at: new Date().toISOString()
        });
      } else {
        if (!folder || folder.length === 0) {
          toast.error("Please select a folder first.");
          setLoading(false);
          return;
        }
        
        setProgress({ current: 0, total: folder.length });
        console.log(`Starting folder upload for ${folder.length} files`);
        
        for (let i = 0; i < folder.length; i++) {
          const f = folder[i];
          if (!f.type.startsWith("image/")) continue;
          
          setProgress({ current: i + 1, total: folder.length });
          const storageRef = ref(storage, `gallery/${Date.now()}_${f.name}`);
          const uploadTask = uploadBytesResumable(storageRef, f);
          const snapshot = await new Promise<any>((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
          });
          const url = await getDownloadURL(snapshot.ref);
          
          await addDoc(collection(db, "images"), {
            title: f.name.split('.')[0], // Use filename as title
            description: form.description || `Uploaded from folder: ${f.name}`,
            names: form.names,
            category: form.category,
            image_url: url,
            uploaded_by: profile.full_name,
            created_at: new Date().toISOString()
          });
        }
      }
      
      console.log("Gallery upload(s) completed successfully.");
      onSuccess();
    } catch (error: any) {
      console.error("Gallery Upload Error:", error);
      handleStorageError(error, "gallery");
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-4 mb-4">
        <button 
          type="button" 
          onClick={() => setUploadType("single")}
          className={`flex-1 py-2 rounded-lg border-2 font-bold text-xs uppercase transition-all ${uploadType === "single" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-400"}`}
        >
          Single Image
        </button>
        <button 
          type="button" 
          onClick={() => setUploadType("folder")}
          className={`flex-1 py-2 rounded-lg border-2 font-bold text-xs uppercase transition-all ${uploadType === "folder" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-400"}`}
        >
          Upload Folder
        </button>
      </div>

      {uploadType === "single" && (
        <div><label className="form-label">Image Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required={uploadType === "single"} /></div>
      )}
      
      <div><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>General</option><option>Operations</option><option>Training</option><option>Ceremony</option></select></div>
      <div><label className="form-label">Names / Labels (Optional)</label><input type="text" className="form-input" value={form.names} onChange={e => setForm({...form, names: e.target.value})} placeholder="e.g. Lt Col John Doe, Maj Jane Smith" /></div>
      <div><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
      
      <div>
        <label className="form-label">{uploadType === "single" ? "Select Image File" : "Select Folder"}</label>
        {uploadType === "single" ? (
          <div className="flex flex-col gap-2">
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
              className="form-input"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">OR URL:</span>
              <input type="text" className="form-input text-xs py-1" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <p className="text-[10px] text-amber-600 italic">
              * If your Firebase Storage requires an upgrade, please use the "OR URL" box above to link an image from the web.
            </p>
          </div>
        ) : (
          <input 
            type="file" 
            // @ts-ignore
            webkitdirectory="" 
            directory="" 
            onChange={e => setFolder(e.target.files)} 
            className="form-input"
            required={uploadType === "folder"}
          />
        )}
      </div>

      {loading && progress.total > 0 && (
        <div className="bg-slate-100 h-2 w-full rounded-full overflow-hidden mt-4">
          <div 
            className="bg-green-600 h-full transition-all duration-300" 
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}
      {loading && progress.total > 0 && (
        <p className="text-[10px] text-slate-500 font-mono text-center mt-1 uppercase">
          Uploading: {progress.current} of {progress.total} files
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (uploadType === "folder" ? "Uploading Folder..." : "Uploading...") : (uploadType === "folder" ? "Upload Folder to Gallery" : "Upload to Gallery")}
      </button>
    </form>
  );
};

const EditImageForm = ({ image, onSuccess }: { image: GalleryImage, onSuccess: () => void }) => {
  const [form, setForm] = useState({ title: image.title, description: image.description || "", names: image.names || "", category: image.category });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "images", image.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `images/${image.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Image Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
      <div><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>General</option><option>Operations</option><option>Training</option><option>Ceremony</option></select></div>
      <div><label className="form-label">Names / Labels (Optional)</label><input type="text" className="form-input" value={form.names} onChange={e => setForm({...form, names: e.target.value})} placeholder="e.g. Lt Col John Doe, Maj Jane Smith" /></div>
      <div><label className="form-label">Description</label><textarea className="form-input min-h-[100px]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};




const EditEventForm = ({ event, onSuccess }: { event: Event, onSuccess: () => void }) => {
  const [form, setForm] = useState({ title: event.title, description: event.description, event_date: event.event_date, location: event.location, event_type: event.event_type });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "events", event.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${event.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
      <div><label className="form-label">Type</label><select className="form-input" value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})}><option>Official</option><option>Training</option><option>Community</option><option>Ceremony</option></select></div>
      <div><label className="form-label">Date</label><input type="date" className="form-input" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} required /></div>
      <div><label className="form-label">Location</label><input type="text" className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required /></div>
      <div>
        <label className="form-label">Description</label>
        <RichTextEditor 
          value={form.description} 
          onChange={(val) => setForm({...form, description: val})} 
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );

};

const EventForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { profile } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", event_date: "", location: "", event_type: "Official", category: "ECOWAS", image_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Event form submitted. File:", file?.name, "Profile:", profile?.full_name);
    if (!profile) {
      toast.error("User profile not loaded. Please try logging out and in again.");
      return;
    }
    setLoading(true);
    console.log("Starting event upload for:", file?.name || "No file");
    
    if (file && !file.type.startsWith('image/')) {
      toast.error("Please select a valid image file (JPG, PNG, etc.). You selected a " + file.name.split('.').pop()?.toUpperCase() + " file.");
      setLoading(false);
      return;
    }

    const uploadTimeout = setTimeout(() => {
      setLoading(false);
      toast.error("Upload is taking longer than expected. Please check your internet connection or Firebase Storage rules.");
    }, 45000);

    try {
      let finalImageUrl = form.image_url;
      
      if (file) {
        const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
        console.log("Storage ref created:", storageRef.fullPath);
        
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            }, 
            (error) => {
              console.error("Upload Task Error:", error);
              reject(error);
            }, 
            () => {
              resolve(uploadTask.snapshot);
            }
          );
        });

        console.log("Upload successful, getting URL...");
        finalImageUrl = await getDownloadURL(snapshot.ref);
        console.log("Download URL obtained:", finalImageUrl);
      }
      
      clearTimeout(uploadTimeout);
      console.log("Adding event document to Firestore...");
      await addDoc(collection(db, "events"), {
        ...form,
        image_url: finalImageUrl,
        created_by: profile?.full_name || "Admin",
        created_at: new Date().toISOString()
      });
      console.log("Event document created successfully.");
      onSuccess();
    } catch (error: any) {
      clearTimeout(uploadTimeout);
      console.error("Event Upload Error:", error);
      if (error.code?.startsWith('storage/')) {
        handleStorageError(error, `events/${file?.name || 'unknown'}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, "events");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Event Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
      <div><label className="form-label">Event Type</label><select className="form-input" value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})}><option>Official</option><option>Training</option><option>Community</option><option>Ceremony</option></select></div>
      <div>
        <label className="form-label">Unit Category</label>
        <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
          {["ECOWAS", "MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC", "TRAINING"].map(cat => (
            <option key={cat} value={cat.toLowerCase()}>{cat}</option>
          ))}
        </select>
      </div>
      <div><label className="form-label">Date</label><input type="date" className="form-input" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} required /></div>
      <div><label className="form-label">Location</label><input type="text" className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
      <div>
        <label className="form-label">Event Image</label>
        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            accept="image/*" 
            onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
            className="form-input"
          />
          <p className="text-xs text-amber-600 font-bold">
            Please select an image file (JPG, PNG). Documents like .docx or .pdf are not supported as event images.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">OR URL:</span>
            <input type="text" className="form-input text-xs py-1" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>
      </div>
      <div>
        <label className="form-label">Description</label>
        <RichTextEditor 
          value={form.description} 
          onChange={(val) => setForm({...form, description: val})} 
          placeholder="Type event description here..."
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Save Event"}</button>
    </form>
  );
};

const ClubForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [form, setForm] = useState({ name: "", logo_url: "", played: 0, points: 0, unit: "SENBAT" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "football_clubs"), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "football_clubs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Club Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
      <div><label className="form-label">Logo URL</label><input type="url" className="form-input" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Played</label><input type="number" className="form-input" value={form.played} onChange={e => setForm({...form, played: parseInt(e.target.value)})} required /></div>
        <div><label className="form-label">Points</label><input type="number" className="form-input" value={form.points} onChange={e => setForm({...form, points: parseInt(e.target.value)})} required /></div>
      </div>
      <div>
        <label className="form-label">Representing Unit</label>
        <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
          {["MHQ", "FHQ", "DFC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Add Club"}</button>
    </form>
  );
};

const MatchForm = ({ clubs, onSuccess }: { clubs: FootballClub[], onSuccess: () => void }) => {
  const [form, setForm] = useState({ teamA: "", teamB: "", scoreA: 0, scoreB: 0, time: "Upcoming", status: "upcoming" as const, date: "", stadium: "Banjul Stadium", stream_url: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "football_matches"), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "football_matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Team A</label>
          <select className="form-input" value={form.teamA} onChange={e => setForm({...form, teamA: e.target.value})} required>
            <option value="">Select Team</option>
            {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Team B</label>
          <select className="form-input" value={form.teamB} onChange={e => setForm({...form, teamB: e.target.value})} required>
            <option value="">Select Team</option>
            {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Score A</label><input type="number" className="form-input" value={form.scoreA} onChange={e => setForm({...form, scoreA: parseInt(e.target.value)})} /></div>
        <div><label className="form-label">Score B</label><input type="number" className="form-input" value={form.scoreB} onChange={e => setForm({...form, scoreB: parseInt(e.target.value)})} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="finished">Finished</option></select></div>
        <div><label className="form-label">Match Time</label><input type="text" className="form-input" value={form.time} onChange={e => setForm({...form, time: e.target.value})} placeholder="e.g. 16:00 or 74'" /></div>
      </div>
      <div><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
      <div><label className="form-label">Stadium</label><input type="text" className="form-input" value={form.stadium} onChange={e => setForm({...form, stadium: e.target.value})} /></div>
      <div>
        <label className="form-label">Live Stream URL (Direct, YouTube, or Twitch)</label>
        <input type="url" className="form-input" value={form.stream_url} onChange={e => setForm({...form, stream_url: e.target.value})} placeholder="e.g. https://www.youtube.com/embed/live_id" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Create Match"}</button>
    </form>
  );
};

const EditClubForm = ({ club, onSuccess }: { club: FootballClub, onSuccess: () => void }) => {
  const [form, setForm] = useState({ name: club.name, logo_url: club.logo_url || "", played: club.played, points: club.points, unit: club.unit || "SENBAT" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "football_clubs", club.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `football_clubs/${club.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Club Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
      <div><label className="form-label">Logo URL</label><input type="url" className="form-input" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Played</label><input type="number" className="form-input" value={form.played} onChange={e => setForm({...form, played: parseInt(e.target.value)})} required /></div>
        <div><label className="form-label">Points</label><input type="number" className="form-input" value={form.points} onChange={e => setForm({...form, points: parseInt(e.target.value)})} required /></div>
      </div>
      <div>
        <label className="form-label">Representing Unit</label>
        <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
          {["MHQ", "FHQ", "DFC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Update Club"}</button>
    </form>
  );
};

const EditMatchForm = ({ match, clubs, onSuccess }: { match: FootballMatch, clubs: FootballClub[], onSuccess: () => void }) => {
  const [form, setForm] = useState({ teamA: match.teamA, teamB: match.teamB, scoreA: match.scoreA, scoreB: match.scoreB, time: match.time, status: match.status, date: match.date, stadium: match.stadium, stream_url: match.stream_url || "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "football_matches", match.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `football_matches/${match.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Team A</label>
          <select className="form-input" value={form.teamA} onChange={e => setForm({...form, teamA: e.target.value})} required>
            {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Team B</label>
          <select className="form-input" value={form.teamB} onChange={e => setForm({...form, teamB: e.target.value})} required>
            {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Score A</label><input type="number" className="form-input" value={form.scoreA} onChange={e => setForm({...form, scoreA: parseInt(e.target.value)})} /></div>
        <div><label className="form-label">Score B</label><input type="number" className="form-input" value={form.scoreB} onChange={e => setForm({...form, scoreB: parseInt(e.target.value)})} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="finished">Finished</option></select></div>
        <div><label className="form-label">Match Time</label><input type="text" className="form-input" value={form.time} onChange={e => setForm({...form, time: e.target.value})} placeholder="e.g. 16:00 or 74'" /></div>
      </div>
      <div><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
      <div><label className="form-label">Stadium</label><input type="text" className="form-input" value={form.stadium} onChange={e => setForm({...form, stadium: e.target.value})} /></div>
      <div>
        <label className="form-label">Live Stream URL (Direct, YouTube, or Twitch)</label>
        <input type="url" className="form-input" value={form.stream_url} onChange={e => setForm({...form, stream_url: e.target.value})} placeholder="e.g. https://www.youtube.com/embed/live_id" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Update Match"}</button>
    </form>
  );
};

const UserForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [form, setForm] = useState({ username: "", full_name: "", unit: "FHQ", role: "user" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let email = form.username;
      if (!email.includes("@")) {
        email = `${form.username.toLowerCase().trim()}@ecomig.org`;
      }

      // Find if user already exists by email (username)
      const q = query(collection(db, "users"), where("username", "==", email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        toast.error("A profile with this username already exists.");
        setLoading(false);
        return;
      }

      // Create a pre-approved profile. 
      // When the user logs in with this email, the AuthProvider will find it.
      await addDoc(collection(db, "users"), {
        full_name: form.full_name,
        username: email,
        role: form.role,
        unit: form.unit,
        created_at: new Date().toISOString()
      });
      
      toast.success(`User ${form.full_name} has been authorized as ${form.role}. They can now log in using the username: ${form.username}`);
      onSuccess();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Error creating user profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">User Name</label><input type="text" className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="e.g. j.doe" /></div>
      <div><label className="form-label">Full Name</label><input type="text" className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
      <div>
        <label className="form-label">Unit / Contingent</label>
        <select 
          className="form-input" 
          value={form.unit} 
          onChange={e => setForm({...form, unit: e.target.value})} 
          required
        >
          {["MHQ", "FHQ", "DFC", "J1/4", "J2", "J3/5", "J6", "J7/9", "PM", "PIO", "PA DFC", "CC", "SENBAT", "NIGCOY", "GHANCOY", "SENFPU", "SENPC"].map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Role</label>
        <select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
          <option value="user">Standard User</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <p className="text-xs text-slate-500 italic">Note: This user will be automatically granted access when they first log in with this email.</p>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Authorizing..." : "Authorize User"}</button>
    </form>
  );
};

const PendingApproval = () => {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center relative z-10">
      <div className="bg-white/95 backdrop-blur-md p-10 w-full max-w-md shadow-2xl border-t-8 border-yellow-600 relative z-20">
        <div className="mb-6">
          <img 
            src="https://customer-assets.emergentagent.com/job_secure-comms-36/artifacts/yxcc2zx2_image.png" 
            alt="ECOMIG Logo" 
            className="h-24 mx-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <Shield size={64} className="mx-auto text-yellow-600 mb-6" />
        <h1 className="font-heading text-3xl font-bold uppercase text-slate-900 mb-4">Access Pending</h1>
        <p className="text-slate-600 mb-8">
          Your account (<strong>{user?.email?.split('@')[0]}</strong>) has been registered, but it is currently pending approval by the System Administrator.
        </p>
        <div className="bg-slate-50 p-6 rounded-lg mb-8 text-sm text-slate-500 italic">
          Please contact your Unit Commander or the J6 Cell to activate your portal access.
        </div>
        <button onClick={logout} className="btn-secondary w-full">Logout & Return</button>
      </div>
    </div>
  );
};

const Gatekeeper = ({ children, requireAdmin = false }: { children: ReactNode, requireAdmin?: boolean }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
        <div className="bg-white p-10 max-w-md w-full text-center rounded-xl shadow-2xl">
          <Shield size={64} className="mx-auto text-red-600 mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Admin Access Required</h1>
          <p className="text-slate-600 mb-8">
            You are logged in as <strong>{profile.username}</strong>, but this area is restricted to Mission Administrators and Editors.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary w-full">Return to Home</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// --- APP ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<><Navbar /><HomePage /><Footer /></>} />
          <Route path="/about" element={<><Navbar /><AboutPage /><Footer /></>} />
          <Route path="/leadership" element={<><Navbar /><LeadershipPage /><Footer /></>} />
          <Route path="/departments" element={<><Navbar /><DepartmentsPage /><Footer /></>} />
          <Route path="/departments/:code" element={<><Navbar /><DepartmentDetailPage /><Footer /></>} />
          <Route path="/news" element={<><Navbar /><NewsPage /><Footer /></>} />
          <Route path="/news/category/:category" element={<><Navbar /><NewsPage /><Footer /></>} />
          <Route path="/news/:id" element={<><Navbar /><NewsDetailPage /><Footer /></>} />
          <Route path="/events" element={<><Navbar /><EventsPage /><Footer /></>} />
          <Route path="/events/:category" element={<><Navbar /><EventsPage /><Footer /></>} />
          <Route path="/gallery" element={<><Navbar /><GalleryPage /><Footer /></>} />
          <Route path="/football-tv" element={<><Navbar /><FootballTV /><Footer /></>} />
          <Route path="/manuals" element={<><Navbar /><ManualsPage /><Footer /></>} />
          <Route path="/contact" element={<><Navbar /><ContactPage /><Footer /></>} />
          <Route path="/mailbox" element={<Gatekeeper><Navbar /><MailboxPage /><Footer /></Gatekeeper>} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Gatekeeper requireAdmin><AdminDashboard /></Gatekeeper>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
