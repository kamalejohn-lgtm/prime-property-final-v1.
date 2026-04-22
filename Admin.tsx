import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LogIn, 
  Plus, 
  Trash2, 
  Camera, 
  MapPin, 
  Tag, 
  Settings,
  LayoutDashboard,
  LogOut,
  X,
  CheckCircle2
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { toast } from 'sonner';

const AUTHORIZED_ADMINS = ['kamalejohn@gmail.com'];

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'ads'>('properties');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State Properties
  const [formData, setFormData] = useState({
    title: '',
    type: 'Apartment',
    location: '',
    price: '',
    image: '',
    features: ''
  });

  // Form State Ads
  const [adData, setAdData] = useState({
    title: '',
    description: '',
    image: '',
    link: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u && AUTHORIZED_ADMINS.includes(u.email || '')) {
        fetchProperties();
        fetchAds();
      }
    });
    return () => unsubscribe();
  }, []);

  const [ads, setAds] = useState<any[]>([]);
  const fetchAds = async () => {
    try {
      const q = query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setAds(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setProperties(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (!AUTHORIZED_ADMINS.includes(result.user.email || '')) {
        toast.error("You are not authorized as an administrator.");
        await signOut(auth);
      } else {
        toast.success("Welcome back, Admin!");
      }
    } catch (error) {
      toast.error("Login failed.");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'properties'), {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        createdAt: Timestamp.now(),
        authorId: user?.uid
      });
      toast.success("Property added successfully!");
      setShowAddModal(false);
      setFormData({ title: '', type: 'Apartment', location: '', price: '', image: '', features: '' });
      fetchProperties();
    } catch (error) {
      toast.error("Failed to add property.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteDoc(doc(db, 'properties', id));
      toast.success("Listing deleted.");
      fetchProperties();
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adData.title || !adData.image) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'advertisements'), {
        ...adData,
        createdAt: Timestamp.now(),
        authorId: user?.uid
      });
      toast.success("Advertisement posted!");
      setShowAddModal(false);
      setAdData({ title: '', description: '', image: '', link: '' });
      fetchAds();
    } catch (error) {
      toast.error("Failed to post ad.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("Delete this advertisement?")) return;
    try {
      await deleteDoc(doc(db, 'advertisements', id));
      toast.success("Ad removed.");
      fetchAds();
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !AUTHORIZED_ADMINS.includes(user.email || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111111] border border-white/10 p-12 text-center"
        >
          <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <LayoutDashboard className="text-gold" size={40} />
          </div>
          <h1 className="font-serif text-3xl mb-4 text-white">Admin Access</h1>
          <p className="text-white/50 mb-10 text-sm">
            Please log in with an authorized administrator account to manage property listings and advertisements.
          </p>
          <button 
            onClick={handleLogin}
            className="btn-gold w-full flex items-center justify-center gap-4"
          >
            <LogIn size={20} />
            LOGIN WITH GOOGLE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div>
            <h1 className="font-serif text-5xl text-white mb-2">Dashboard</h1>
            <p className="text-white/40">Welcome back, <span className="text-gold font-bold">{user.displayName}</span></p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex bg-[#111111] p-1 border border-white/5 mr-4">
              <button 
                onClick={() => setActiveTab('properties')}
                className={`px-6 py-2 text-xs font-bold uppercase transition-all ${activeTab === 'properties' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'}`}
              >
                Properties
              </button>
              <button 
                onClick={() => setActiveTab('ads')}
                className={`px-6 py-2 text-xs font-bold uppercase transition-all ${activeTab === 'ads' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'}`}
              >
                Ads
              </button>
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-gold flex items-center gap-2 px-6 py-2"
            >
              <Plus size={18} /> ADD NEW {activeTab === 'properties' ? 'LISTING' : 'AD'}
            </button>
            <button 
              onClick={handleLogout}
              className="w-12 h-12 border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeTab === 'properties' ? (
            properties.length === 0 ? (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 bg-white/2">
                <p className="text-white/20 uppercase tracking-widest text-sm">No live listings found. Start by adding one.</p>
              </div>
            ) : (
              properties.map(prop => (
                <div key={prop.id} className="bg-[#111111] border border-white/10 overflow-hidden relative group">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={prop.image} alt={prop.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-gold text-xs font-bold uppercase mb-2">
                       <CheckCircle2 size={12} /> Live
                    </div>
                    <h3 className="font-serif text-xl text-white mb-2">{prop.title}</h3>
                    <p className="text-white/40 text-sm mb-4"><MapPin size={14} className="inline mr-2" /> {prop.location}</p>
                    <div className="text-gold font-bold mb-6">{prop.price}</div>
                    <button 
                      onClick={() => handleDelete(prop.id)}
                      className="text-red-500 hover:text-red-400 text-xs flex items-center gap-2 uppercase tracking-widest font-bold"
                    >
                      <Trash2 size={14} /> Delete Listing
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            ads.length === 0 ? (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 bg-white/2">
                <p className="text-white/20 uppercase tracking-widest text-sm">No active advertisements. Create your first one.</p>
              </div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="bg-[#111111] border border-white/10 overflow-hidden relative group">
                  <div className="aspect-[21/9] overflow-hidden">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-white mb-2">{ad.title}</h3>
                    <p className="text-white/40 text-sm mb-6 line-clamp-2">{ad.description}</p>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="text-red-500 hover:text-red-400 text-xs flex items-center gap-2 uppercase tracking-widest font-bold"
                    >
                      <Trash2 size={14} /> Remove Ad
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isSubmitting && setShowAddModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl bg-[#111111] border border-white/10 p-10 shadow-2xl"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <h2 className="font-serif text-3xl mb-8">Post New {activeTab === 'properties' ? 'Listing' : 'Advertisement'}</h2>
            
            {activeTab === 'properties' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Property Title</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. 4 Bedroom Luxury Villa" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Type</label>
                    <select 
                      className="input-field appearance-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option>Apartment</option>
                      <option>Maisonette</option>
                      <option>Penthouse</option>
                      <option>Land</option>
                      <option>Commercial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Location</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Lekki Phase 1, Lagos" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Price Statement</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. 250 Million Naira" 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Main Image URL</label>
                  <div className="relative">
                    <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="url" 
                      className="input-field pl-12" 
                      placeholder="https://images.unsplash.com/..." 
                      value={formData.image}
                      onChange={e => setFormData({...formData, image: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold font-bold">Key Features (Comma separated)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="3 Bedrooms, Pool, Gym, Smart Home" 
                    value={formData.features}
                    onChange={e => setFormData({...formData, features: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn-gold w-full mt-4 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? "POSTING..." : "PUBLISH PROPERTY"} <CheckCircle2 size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdSubmit} className="space-y-6">
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Ad Headline</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Special Offer: 10% Off Property Management" 
                    value={adData.title}
                    onChange={e => setAdData({...adData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Description</label>
                  <textarea 
                    className="input-field resize-none" 
                    rows={3}
                    placeholder="Short promotional text..." 
                    value={adData.description}
                    onChange={e => setAdData({...adData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Banner Image URL</label>
                  <input 
                    type="url" 
                    className="input-field" 
                    placeholder="https://images.unsplash.com/..." 
                    value={adData.image}
                    onChange={e => setAdData({...adData, image: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block font-bold">Click-through Link (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="/properties or external link" 
                    value={adData.link}
                    onChange={e => setAdData({...adData, link: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn-gold w-full mt-4 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? "POSTING..." : "PUBLISH ADVERTISEMENT"} <CheckCircle2 size={18} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
