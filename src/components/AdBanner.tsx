import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight, X } from 'lucide-react';

export default function AdBanner() {
  const [ads, setAds] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    async function fetchAds() {
      try {
        const q = query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        setAds(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching ads:", error);
      }
    }
    fetchAds();
  }, []);

  if (!ads.length || !isVisible) return null;

  const ad = ads[0];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-6 right-6 z-[60] max-w-4xl mx-auto"
      >
        <div className="bg-navy border border-gold/30 shadow-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-white/20 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="w-full md:w-32 aspect-video md:aspect-square flex-shrink-0 overflow-hidden">
            <img 
              src={ad.image} 
              alt={ad.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex-grow">
            <span className="text-gold text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block">Special Announcement</span>
            <h3 className="text-white font-serif text-xl mb-2">{ad.title}</h3>
            <p className="text-white/50 text-sm line-clamp-2">{ad.description}</p>
          </div>

          <div className="w-full md:w-auto">
            <a 
              href={ad.link || '#'} 
              className="btn-gold py-2 px-6 text-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              LEARN MORE <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
