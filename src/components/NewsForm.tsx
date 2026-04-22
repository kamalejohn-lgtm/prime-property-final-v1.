import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { handleFirestoreError, handleStorageError, OperationType, stripHtml } from "../lib/utils";
import { toast } from "sonner";
import { Wand2, Globe } from "lucide-react";
import { importFromUrl } from "../services/gemini";
import { NewsItem } from "../types";
import RichTextEditor from "./RichTextEditor";

interface NewsFormProps {
  onSuccess: () => void;
}

export const NewsForm = ({ onSuccess }: NewsFormProps) => {
  const { profile } = useAuth();
  const [form, setForm] = useState({ 
    title: "", 
    title_fr: "",
    content: "", 
    content_fr: "",
    summary: "", 
    summary_fr: "",
    category: "General", 
    image_url: "" 
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");

  const handleMagicImport = async () => {
    if (!importUrl) {
      toast.error("Please enter a URL to import from.");
      return;
    }
    setAiLoading("import");
    try {
      const data = await importFromUrl(importUrl, "news");
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        summary: data.summary || prev.summary,
        content: data.content || prev.content,
        image_url: data.image_url || prev.image_url
      }));
      toast.success("News content imported successfully!");
    } catch (error: any) {
      console.error("Magic Import Error:", error);
      toast.error("Failed to import content. Please check the URL and try again.");
    } finally {
      setAiLoading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("User profile not loaded. Please try logging out and in again.");
      return;
    }

    // Strip HTML to check for actual content
    const plainContent = stripHtml(form.content).trim();
    if (!plainContent) {
      toast.error("Please enter some content for the news article.");
      return;
    }

    setLoading(true);
    
    const uploadTimeout = setTimeout(() => {
      setLoading(false);
      toast.error("Upload is taking longer than expected. Please check your internet connection or Firebase Storage rules.");
    }, 45000);

    try {
      let finalImageUrl = form.image_url;
      
      if (file) {
        const storageRef = ref(storage, `news/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });

        clearTimeout(uploadTimeout);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      } else {
        clearTimeout(uploadTimeout);
      }

      const newsRef = doc(collection(db, "news"));
      const newsId = newsRef.id;

      const newsData = {
        title: form.title,
        title_fr: form.title_fr,
        content: form.content,
        content_fr: form.content_fr,
        summary: form.summary,
        summary_fr: form.summary_fr,
        category: form.category,
        image_url: finalImageUrl,
        id: newsId,
        author: profile?.full_name || "Admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("Saving news data:", newsData);

      await setDoc(newsRef, newsData);
      toast.success("News article published successfully!");
      onSuccess();
    } catch (error) {
      console.error("News Submission Error:", error);
      if (file) {
        handleStorageError(error, `news/${file.name}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, "news");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
        <div className="flex items-center gap-3 mb-3">
          <Wand2 className="text-purple-700" size={24} />
          <div>
            <h4 className="font-bold text-purple-900 text-sm">Magic Import</h4>
            <p className="text-purple-700 text-xs">Paste a news URL to automatically extract content.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="url" 
            placeholder="https://..." 
            className="form-input text-sm" 
            value={importUrl} 
            onChange={e => setImportUrl(e.target.value)} 
          />
          <button 
            type="button" 
            onClick={handleMagicImport}
            disabled={aiLoading === "import"}
            className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
          >
            {aiLoading === "import" ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Globe size={18} />}
            Import
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="form-label">Title (English)</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><label className="form-label">Title (French)</label><input type="text" className="form-input" value={form.title_fr} onChange={e => setForm({...form, title_fr: e.target.value})} /></div>
        </div>
        
        <div><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>General</option><option>Security</option><option>Politics</option><option>Humanitarian</option></select></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="form-label">Summary (English)</label><textarea className="form-input" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
          <div><label className="form-label">Summary (French)</label><textarea className="form-input" value={form.summary_fr} onChange={e => setForm({...form, summary_fr: e.target.value})} /></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">Content (English)</label>
            <RichTextEditor 
              value={form.content} 
              onChange={(val) => setForm({...form, content: val})} 
              placeholder="Type your news content here in English..."
            />
          </div>
          <div>
            <label className="form-label">Content (French)</label>
            <RichTextEditor 
              value={form.content_fr} 
              onChange={(val) => setForm({...form, content_fr: val})} 
              placeholder="Type your news content here in French..."
            />
          </div>
        </div>

        <div>
          <label className="form-label">Primary Image</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="form-input" />
          <div className="mt-2">
            <span className="text-xs text-slate-400">OR URL:</span>
            <input type="text" className="form-input text-xs py-1" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Uploading..." : "Publish News"}</button>
      </form>
    </div>
  );
};

interface EditNewsFormProps {
  news: NewsItem;
  onSuccess: () => void;
}

export const EditNewsForm = ({ news, onSuccess }: EditNewsFormProps) => {
  const [form, setForm] = useState({ 
    title: news.title, 
    title_fr: news.title_fr || "",
    content: news.content, 
    content_fr: news.content_fr || "",
    summary: news.summary || "", 
    summary_fr: news.summary_fr || "",
    category: news.category 
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strip HTML to check for actual content
    const plainContent = stripHtml(form.content).trim();
    if (!plainContent) {
      toast.error("Please enter some content for the news article.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "news", news.id), {
        ...form,
        updated_at: new Date().toISOString()
      });
      toast.success("News article updated successfully!");
      onSuccess();
    } catch (error) {
      console.error("News Update Error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `news/${news.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="form-label">Title (English)</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
        <div><label className="form-label">Title (French)</label><input type="text" className="form-input" value={form.title_fr} onChange={e => setForm({...form, title_fr: e.target.value})} /></div>
      </div>
      
      <div><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>General</option><option>Security</option><option>Politics</option><option>Humanitarian</option></select></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="form-label">Summary (English)</label><textarea className="form-input" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
        <div><label className="form-label">Summary (French)</label><textarea className="form-input" value={form.summary_fr} onChange={e => setForm({...form, summary_fr: e.target.value})} /></div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="form-label">Content (English)</label>
          <RichTextEditor 
            value={form.content} 
            onChange={(val) => setForm({...form, content: val})} 
          />
        </div>
        <div>
          <label className="form-label">Content (French)</label>
          <RichTextEditor 
            value={form.content_fr} 
            onChange={(val) => setForm({...form, content_fr: val})} 
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};
