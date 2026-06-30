import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatDate } from '../utils/formatters';

export function useProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const problemsQuery = query(
      collection(db, 'problems'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(problemsQuery, 
      (snapshot) => {
        const data = [];
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const dateString = formatDate(docData.createdAt);
          
          data.push({
            id: docSnap.id,
            ...docData,
            severity: docData.priority,
            date: dateString,
            reporter: docData.userName,
            comments: Array.isArray(docData.comments) ? docData.comments : []
          });
        });
        setProblems(data);
        setLoading(false);
      },
      (err) => {
        console.error("useProblems Snapshot Error:", err);
        setError(err.message || "Failed to load reports.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { problems, loading, error };
}
