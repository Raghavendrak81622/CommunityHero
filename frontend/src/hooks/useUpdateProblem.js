import { useState } from 'react';
import { problemsService } from '../services/problemsService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export function useUpdateProblem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const updateProblem = async (id, updateData) => {
    if (!user) {
      toast.error("Please sign in to make updates.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await problemsService.updateProblem(id, updateData, user.uid);
      toast.success("Report updated successfully!");
      return result;
    } catch (err) {
      console.error("useUpdateProblem Error:", err);
      const errMsg = err.message || "Failed to update report.";
      setError(errMsg);
      toast.error(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProblem, loading, error };
}
