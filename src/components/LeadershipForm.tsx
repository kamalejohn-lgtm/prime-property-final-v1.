import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { handleFirestoreError, handleStorageError, OperationType } from "../lib/utils";
import { toast } from "sonner";
import { Wand2, Globe } from "lucide-react";
import { importFromUrl } from "../services/gemini";
import { Leader } from "../types";
import RichTextEditor from "./RichTextEditor";

interface LeadershipFormProps {
  onSuccess: () => void;
}

export const LeadershipForm = ({ onSuccess }: LeadershipFormProps) => {
  const [form, setForm] = useState({ 
    name: "", 
    title: "", 
    position: "", 
    bio: "", 
    image_url: "", 
    order: 0,
    unit: "MHQ"
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const handleMagicImport = async () => {
    if (!importUrl) {
      toast.error("Please enter a URL to import from.");
      return;
    }
    setImporting(true);
    try {
      const data = await importFromUrl(importUrl, "leadership");
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        title: data.title || prev.title,
        position: data.position || prev.position,
        bio: data.bio || prev.bio,
        image_url: data.image_url || prev.image_url,
        unit: data.unit || prev.unit
      }));
      toast.success("Leader details imported successfully!");
    } catch (error: any) {
      console.error("Magic Import Error:", error);
      toast.error("Failed to import content. Please check the URL and try again.");
    } finally {
      setImporting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = form.image_url;
      if (file) {
        const storageRef = ref(storage, `leadership/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "leaders"), {
        ...form,
        image_url: finalImageUrl,
        created_at: new Date().toISOString()
      });
      onSuccess();
    } catch (error) {
      if (file) {
        handleStorageError(error, `leadership/${file.name}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, "leaders");
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
            <p className="text-purple-700 text-xs">Paste a URL to automatically extract leader details.</p>
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
            disabled={importing}
            className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
          >
            {importing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Globe size={18} />}
            Import
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="form-label">Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div><label className="form-label">Title/Rank</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Brigadier General" required /></div>
        </div>
        <div><label className="form-label">Position</label><input type="text" className="form-input" value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="e.g. Force Commander" required /></div>
        <div>
          <label className="form-label">Unit</label>
          <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
            <option value="MHQ">MHQ</option>
            <option value="FHQ">FHQ</option>
            <option value="DFC">DFC</option>
            <option value="J1/4">J1/4</option>
            <option value="J2">J2</option>
            <option value="J3/5">J3/5</option>
            <option value="J6">J6</option>
            <option value="J7/9">J7/9</option>
            <option value="PM">PM</option>
            <option value="PIO">PIO</option>
            <option value="PA DFC">PA DFC</option>
            <option value="CC">CC</option>
            <option value="SENBAT">SENBAT</option>
            <option value="NIGCOY">NIGCOY</option>
            <option value="GHANCOY">GHANCOY</option>
            <option value="SENFPU">SENFPU</option>
            <option value="SENPC">SENPC</option>
          </select>
        </div>
        <div>
          <label className="form-label">Bio</label>
          <RichTextEditor 
            value={form.bio} 
            onChange={(val) => setForm({...form, bio: val})} 
            placeholder="Type leader's bio here..."
          />
        </div>
        <div><label className="form-label">Display Order</label><input type="number" className="form-input" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)})} required /></div>
        <div>
          <label className="form-label">Leader Image</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="form-input" />
          <div className="mt-2">
            <span className="text-xs text-slate-400">OR URL:</span>
            <input type="text" className="form-input text-xs py-1" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Uploading..." : "Add Leader"}</button>
      </form>
    </div>
  );
};

interface EditLeadershipFormProps {
  leader: Leader;
  onSuccess: () => void;
}

export const EditLeadershipForm = ({ leader, onSuccess }: EditLeadershipFormProps) => {
  const [form, setForm] = useState({ 
    name: leader.name, 
    title: leader.title, 
    position: leader.position, 
    bio: leader.bio || "", 
    image_url: leader.image_url || "", 
    order: leader.order,
    unit: leader.unit || "MHQ"
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "leaders", leader.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leaders/${leader.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div><label className="form-label">Title/Rank</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
      </div>
      <div><label className="form-label">Position</label><input type="text" className="form-input" value={form.position} onChange={e => setForm({...form, position: e.target.value})} required /></div>
      <div>
        <label className="form-label">Unit</label>
        <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
          <option value="MHQ">MHQ</option>
          <option value="FHQ">FHQ</option>
          <option value="DFC">DFC</option>
          <option value="J1/4">J1/4</option>
          <option value="J2">J2</option>
          <option value="J3/5">J3/5</option>
          <option value="J6">J6</option>
          <option value="J7/9">J7/9</option>
          <option value="PM">PM</option>
          <option value="PIO">PIO</option>
          <option value="PA DFC">PA DFC</option>
          <option value="CC">CC</option>
          <option value="SENBAT">SENBAT</option>
          <option value="NIGCOY">NIGCOY</option>
          <option value="GHANCOY">GHANCOY</option>
          <option value="SENFPU">SENFPU</option>
          <option value="SENPC">SENPC</option>
        </select>
      </div>
      <div>
        <label className="form-label">Bio</label>
        <RichTextEditor 
          value={form.bio} 
          onChange={(val) => setForm({...form, bio: val})} 
        />
      </div>
      <div><label className="form-label">Display Order</label><input type="number" className="form-input" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)})} required /></div>
      <div><label className="form-label">Image URL</label><input type="text" className="form-input" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." /></div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};
