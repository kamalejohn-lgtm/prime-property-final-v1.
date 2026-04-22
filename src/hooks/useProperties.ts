import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  price: string;
  image: string;
  features: string[];
}

export function useProperties(max?: number) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const q = max 
          ? query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(max))
          : query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];
        
        setProperties(data);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [max]);

  return { properties, loading };
}
