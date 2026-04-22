import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { handleFirestoreError, handleStorageError, OperationType } from "../lib/utils";
import { toast } from "sonner";
import { Wand2, Globe } from "lucide-react";
import { importFromUrl } from "../services/gemini";
import { ChronicleRecord } from "../types";

interface ChronicleFormProps {
  onSuccess: () => void;
}

export const ChronicleForm = ({ onSuccess }: ChronicleFormProps) => {
  const [form, setForm] = useState({ name: "", unit: "MHQ" as const, years: "", image_url: "" });
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
      const data = await importFromUrl(importUrl, "chronicle");
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        unit: (data.unit as any) || prev.unit,
        years: data.years || prev.years,
        image_url: data.image_url || prev.image_url
      }));
      toast.success("Commander details imported successfully!");
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
        const storageRef = ref(storage, `chronicle/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        const snapshot = await new Promise<any>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot));
        });
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "chronicle_of_command"), {
        ...form,
        image_url: finalImageUrl,
        created_at: new Date().toISOString()
      });
      onSuccess();
    } catch (error) {
      if (file) {
        handleStorageError(error, `chronicle/${file.name}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, "chronicle_of_command");
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
            <p className="text-purple-700 text-xs">Paste a URL to automatically extract commander details.</p>
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
        <div><label className="form-label">Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div>
          <label className="form-label">Unit</label>
          <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value as any})}>
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
        <div><label className="form-label">Years of Command</label><input type="text" className="form-input" value={form.years} onChange={e => setForm({...form, years: e.target.value})} placeholder="e.g. 2020 - 2022" required /></div>
        <div>
          <label className="form-label">Commander Image</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="form-input" />
          <div className="mt-2">
            <span className="text-xs text-slate-400">OR URL:</span>
            <input type="text" className="form-input text-xs py-1" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Uploading..." : "Add to Chronicle"}</button>
      </form>
    </div>
  );
};

interface EditChronicleFormProps {
  record: ChronicleRecord;
  onSuccess: () => void;
}

export const EditChronicleForm = ({ record, onSuccess }: EditChronicleFormProps) => {
  const [form, setForm] = useState({ name: record.name, unit: record.unit, years: record.years, image_url: record.image_url });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "chronicle_of_command", record.id), form);
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chronicle_of_command/${record.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="form-label">Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
      <div>
        <label className="form-label">Unit</label>
        <select className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value as any})}>
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
      <div><label className="form-label">Years of Command</label><input type="text" className="form-input" value={form.years} onChange={e => setForm({...form, years: e.target.value})} placeholder="e.g. 2020 - 2022" required /></div>
      <div><label className="form-label">Image URL</label><input type="text" className="form-input" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." /></div>
      <div className="flex gap-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
        <button type="button" onClick={onSuccess} className="btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
};
