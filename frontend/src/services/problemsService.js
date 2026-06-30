import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion,
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatDate } from '../utils/formatters';

const COLLECTION_NAME = 'problems';

export const problemsService = {
  // 1. Create Problem
  createProblem: async (problemData, user) => {
    if (!user) throw new Error("Authentication required to report an issue.");

    const docData = {
      title: problemData.title,
      description: problemData.description,
      category: problemData.category,
      priority: problemData.severity || problemData.priority || 'Medium',
      status: 'Reported',
      locality: problemData.location || problemData.locality || '',
      pincode: problemData.pincode || '',
      latitude: problemData.latitude || null,
      longitude: problemData.longitude || null,
      imageUrl: problemData.imageUrl || '',
      createdAt: serverTimestamp(),
      userId: user.uid,
      userName: user.displayName || 'Anonymous Hero',
      userPhoto: user.photoURL || '',
      upvotes: 0 // Initialize upvotes count
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return { id: docRef.id, ...docData };
  },

  // 2. Read all Problems
  getAllProblems: async () => {
    const problemsQuery = query(
      collection(db, COLLECTION_NAME), 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(problemsQuery);
    
    const problems = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Format timestamps to ISO strings or dates for the UI
      const dateString = formatDate(data.createdAt);
      
      problems.push({
        id: doc.id,
        ...data,
        severity: data.priority, // Map priority to severity for UI compatibility
        date: dateString, // Map createdAt to date string for UI
        reporter: data.userName, // Map userName to reporter for UI
        comments: Array.isArray(data.comments) ? data.comments : [] // Provide default empty comments
      });
    });
    
    return problems;
  },

  // 3. Read single Problem
  getProblemById: async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    const dateString = formatDate(data.createdAt);

    return {
      id: docSnap.id,
      ...data,
      severity: data.priority, // Map priority to severity for UI compatibility
      date: dateString, // Map createdAt to date string for UI
      reporter: data.userName, // Map userName to reporter for UI
      comments: Array.isArray(data.comments) ? data.comments : [] // Provide default empty comments
    };
  },

  // 4. Update Problem (owner validation)
  updateProblem: async (id, updateData, currentUserId) => {
    if (!currentUserId) throw new Error("Authentication required.");

    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Document does not exist.");
    }

    const docData = docSnap.data();
    if (docData.userId !== currentUserId) {
      throw new Error("Unauthorized. Only the owner can update this issue.");
    }

    // Prepare update payload (mapping severity to priority if supplied)
    const payload = { ...updateData };
    if (updateData.severity) {
      payload.priority = updateData.severity;
      delete payload.severity;
    }
    if (updateData.location) {
      payload.locality = updateData.location;
      delete payload.location;
    }

    await updateDoc(docRef, payload);
    return { id, ...docData, ...updateData };
  },

  // Add a public comment to a problem without requiring report ownership
  addComment: async (id, comment, currentUserId) => {
    if (!currentUserId) throw new Error("Please sign in to post a comment.");

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      comments: arrayUnion(comment)
    });

    return comment;
  },

  // Update the entire comments array of a problem (for replies, upvotes, etc.)
  updateComments: async (id, comments) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { comments });
    return comments;
  },

  // Upvote or retract upvote for a problem
  upvoteProblem: async (id, change) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Document does not exist.");
    }
    const currentUpvotes = docSnap.data().upvotes || 0;
    const newUpvotes = Math.max(0, currentUpvotes + change);
    await updateDoc(docRef, { upvotes: newUpvotes });
    return newUpvotes;
  },

  // 5. Delete Problem (owner validation)
  deleteProblem: async (id, currentUserId) => {
    if (!currentUserId) throw new Error("Authentication required.");

    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Document does not exist.");
    }

    const docData = docSnap.data();
    if (docData.userId !== currentUserId) {
      throw new Error("Unauthorized. Only the owner can delete this issue.");
    }

    await deleteDoc(docRef);
    return id;
  }
};
