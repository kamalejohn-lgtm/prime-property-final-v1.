import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { handleFirestoreError, handleStorageError, OperationType } from "../lib/utils";
import { toast } from "sonner";
import { Save, Upload, Image as ImageIcon, Link as LinkIcon, Type } from "lucide-react";

export interface HomePageSettings {
  hero_logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  staff_poster_url: string;
  featured_link_title: string;
  featured_link_text: string;
  featured_link_url: string;
}

const DEFAULT_SETTINGS: HomePageSettings = {
  hero_logo_url: "https://customer-assets.emergentagent.com/job_secure-comms-36/artifacts/yxcc2zx2_image.png",
  hero_title: "ECOMIG",
  hero_subtitle: "ECOWAS Mission in The Gambia - Securing Peace, Building Trust, Strengthening Democracy",
  staff_poster_url: "https://picsum.photos/seed/ecomig-staff/1200/600",
  featured_link_title: "ECOMIG Web Portal Live",
  featured_link_text: "The official ECOMIG web portal is now live and accessible to the public.",
  featured_link_url: "https://ecomig-portal.onrender.com"
};

export const HomePageManager = () => {
  const [settings, setSettings] = useState<HomePageSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "homepage");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings/homepage");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpload = async (file: File, field: keyof HomePageSettings) => {
    setUploading(field);
    try {
      const storageRef = ref(storage, `homepage/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      const snapshot = await new Promise<any>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
      });
      const url = await getDownloadURL(snapshot.ref);
      setSettings(prev => ({ ...prev, [field]: url }));
      toast.success("Image uploaded successfully!");
    } catch (error) {
      handleStorageError(error, `homepage/${file.name}`);
    } finally {
      setUploading(null);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "homepage"), settings);
      toast.success("Home page settings saved successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "settings/homepage");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading settings...</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section Settings */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <Type className="text-green-400" size={24} />
          <h3 className="font-heading text-xl font-bold uppercase text-white">Hero Section</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Hero Logo</label>
            <div className="flex items-center gap-4">
              <img src={settings.hero_logo_url} alt="Hero Logo Preview" className="h-20 w-auto bg-slate-800 p-2 rounded border border-white/10" />
              <div className="flex-1 space-y-2">
                <input 
                  type="text" 
                  className="form-input bg-slate-900/50 border-white/10 text-white" 
                  value={settings.hero_logo_url} 
                  onChange={e => setSettings({...settings, hero_logo_url: e.target.value})} 
                  placeholder="Logo URL"
                />
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                    <Upload size={14} />
                    {uploading === 'hero_logo_url' ? "Uploading..." : "Upload New Logo"}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={e => e.target.files && handleUpload(e.target.files[0], 'hero_logo_url')} 
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Hero Title</label>
              <input 
                type="text" 
                className="form-input bg-slate-900/50 border-white/10 text-white" 
                value={settings.hero_title} 
                onChange={e => setSettings({...settings, hero_title: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Hero Subtitle</label>
              <textarea 
                className="form-input bg-slate-900/50 border-white/10 text-white h-24" 
                value={settings.hero_subtitle} 
                onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Officers Poster Settings */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="text-green-400" size={24} />
          <h3 className="font-heading text-xl font-bold uppercase text-white">Staff Officers Poster</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Poster Image</label>
            <div className="space-y-4">
              <img src={settings.staff_poster_url} alt="Staff Poster Preview" className="max-w-md w-full h-auto rounded border border-white/10 shadow-lg" />
              <div className="flex-1 space-y-2">
                <input 
                  type="text" 
                  className="form-input bg-slate-900/50 border-white/10 text-white" 
                  value={settings.staff_poster_url} 
                  onChange={e => setSettings({...settings, staff_poster_url: e.target.value})} 
                  placeholder="Poster Image URL"
                />
                <label className="inline-flex cursor-pointer bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase items-center gap-2 transition-colors">
                  <Upload size={14} />
                  {uploading === 'staff_poster_url' ? "Uploading..." : "Upload New Poster"}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={e => e.target.files && handleUpload(e.target.files[0], 'staff_poster_url')} 
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Link Settings */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="text-green-400" size={24} />
          <h3 className="font-heading text-xl font-bold uppercase text-white">Featured Link Section</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Title</label>
            <input 
              type="text" 
              className="form-input bg-slate-900/50 border-white/10 text-white" 
              value={settings.featured_link_title} 
              onChange={e => setSettings({...settings, featured_link_title: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
            <textarea 
              className="form-input bg-slate-900/50 border-white/10 text-white h-20" 
              value={settings.featured_link_text} 
              onChange={e => setSettings({...settings, featured_link_text: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">URL</label>
            <input 
              type="text" 
              className="form-input bg-slate-900/50 border-white/10 text-white" 
              value={settings.featured_link_url} 
              onChange={e => setSettings({...settings, featured_link_url: e.target.value})} 
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-heading font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Save size={20} />}
          Save Home Page Changes
        </button>
      </div>
    </div>
  );
};
