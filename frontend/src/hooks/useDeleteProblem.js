import { useState } from 'react';
import { problemsService } from '../services/problemsService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export function useDeleteProblem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const deleteProblem = async (id) => {
    if (!user) {
      toast.error("Please sign in to remove reports.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await problemsService.deleteProblem(id, user.uid);
      toast.success("Report deleted successfully.");
    } catch (err) {
      console.error("useDeleteProblem Error:", err);
      const errMsg = err.message || "Failed to delete report.";
      setError(errMsg);
      toast.error(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteProblem, loading, error };
}
