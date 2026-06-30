import { useState } from 'react';
import { problemsService } from '../services/problemsService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export function useCreateProblem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const createProblem = async (problemData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await problemsService.createProblem(problemData, user);
      toast.success("Community issue reported successfully! Thank you for being a hero.");
      return result;
    } catch (err) {
      console.error("useCreateProblem Error:", err);
      const errMsg = err.message || "Failed to submit report. Please try again.";
      setError(errMsg);
      toast.error(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createProblem, loading, error };
}
