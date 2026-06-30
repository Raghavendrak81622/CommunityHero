import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatDate } from '../utils/formatters';

export function useProblem(id) {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'problems', id);

    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setProblem(null);
          setLoading(false);
          return;
        }

        const docData = docSnap.data();
        const dateString = formatDate(docData.createdAt);

        setProblem({
          id: docSnap.id,
          ...docData,
          severity: docData.priority,
          date: dateString,
          reporter: docData.userName,
          comments: Array.isArray(docData.comments) ? docData.comments : []
        });
        setLoading(false);
      },
      (err) => {
        console.error(`useProblem(${id}) Snapshot Error:`, err);
        setError(err.message || "Failed to load report details.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  return { problem, setProblem, loading, error };
}
