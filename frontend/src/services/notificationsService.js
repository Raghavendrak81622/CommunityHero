import { 
  collection, 
  addDoc, 
  getDocs,
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const notificationsService = {
  // Create a notification with duplicate prevention
  createNotification: async (recipientId, reportId, title, type, message, dedupKey) => {
    try {
      if (!recipientId) return;

      // Deduplication check: check if a notification with the same key already exists
      const q = query(
        collection(db, 'notifications'),
        where('dedupKey', '==', dedupKey)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Notification already exists for this specific update, skip creation
        return;
      }

      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        reportId,
        title,
        message,
        read: false,
        type,
        timestamp: serverTimestamp(),
        dedupKey
      });
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  },

  // Real-time listener for user notifications
  getUserNotifications: (userId, callback) => {
    if (!userId) return () => {};
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, 
      (snapshot) => {
        const notifs = [];
        snapshot.forEach(docSnap => {
          notifs.push({ id: docSnap.id, ...docSnap.data() });
        });
        notifs.sort((a, b) => {
          const dateA = typeof a.timestamp?.toMillis === 'function' ? a.timestamp.toMillis() : 0;
          const dateB = typeof b.timestamp?.toMillis === 'function' ? b.timestamp.toMillis() : 0;
          return dateB - dateA;
        });
        callback(notifs);
      },
      (err) => {
        console.warn("Notifications unavailable:", err.message || err);
        callback([]);
      }
    );
  },

  // Mark a single notification as read
  markAsRead: async (notifId) => {
    try {
      const docRef = doc(db, 'notifications', notifId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  },

  // Mark all notifications in a list as read
  markAllAsRead: async (notificationsList) => {
    try {
      const unreadNotifs = notificationsList.filter(n => !n.read);
      const promises = unreadNotifs.map(n => {
        const docRef = doc(db, 'notifications', n.id);
        return updateDoc(docRef, { read: true });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }
};
