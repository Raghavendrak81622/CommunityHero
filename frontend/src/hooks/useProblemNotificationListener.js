import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { notificationsService } from '../services/notificationsService';

export function useProblemNotificationListener() {
  const { user } = useAuth();
  const prevProblemsRef = useRef({});

  useEffect(() => {
    if (!user) {
      prevProblemsRef.current = {};
      return;
    }

    // Query user's reports to detect transitions
    const q = query(
      collection(db, 'problems'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const reportId = change.doc.id;
          const newData = change.doc.data();
          const title = newData.title || 'Untitled Report';
          
          if (change.type === 'modified') {
            const oldData = prevProblemsRef.current[reportId];
            if (oldData) {
              // 1. Status Changed transition
              if (newData.status !== oldData.status) {
                notificationsService.createNotification(
                  user.uid,
                  reportId,
                  title,
                  'Status Changed',
                  `The status of your report "${title}" was updated to: ${newData.status}.`,
                  `${reportId}_status_${newData.status}`
                );
              }

              // 2. Report Resolved transition
              if (newData.status === 'Resolved' && oldData.status !== 'Resolved') {
                notificationsService.createNotification(
                  user.uid,
                  reportId,
                  title,
                  'Report Resolved',
                  `Congratulations! Your report "${title}" has been marked as resolved.`,
                  `${reportId}_resolved`
                );
              }

              // 3. Admin Note Added transition
              if (newData.adminNotes !== oldData.adminNotes && newData.adminNotes) {
                const notePrefix = String(newData.adminNotes).substring(0, 15);
                notificationsService.createNotification(
                  user.uid,
                  reportId,
                  title,
                  'Admin Note Added',
                  `An administrator added updates to your report: "${title}".`,
                  `${reportId}_admin_note_${notePrefix}`
                );
              }
            }
          }
        });

        // Update local memory cache with the current snapshot documents
        const nextCache = {};
        snapshot.forEach((doc) => {
          nextCache[doc.id] = doc.data();
        });
        prevProblemsRef.current = nextCache;
      },
      (err) => {
        console.error("useProblemNotificationListener error:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);
}
