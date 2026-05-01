import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, firestore } from './db';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Access control and per-user configuration via userConfig collection
        try {
          const email = user.email || '';
          const userConfigRef = doc(firestore, 'userConfig', email);
          const userConfigSnap = await getDoc(userConfigRef);
          let allowed = false;
          let adminFlag = false;

          if (!userConfigSnap.exists()) {
            // Bootstrap: if this is the first entry in userConfig, make this user admin
            const cfgCollection = collection(firestore, 'userConfig');
            const existingCfg = await getDocs(cfgCollection);

            if (existingCfg.empty) {
              await setDoc(userConfigRef, {
                email,
                allowed: true,
                isAdmin: true,
                config: {
                  businessType: 'general',
                  features: {
                    dashboard: true,
                    parties: true,
                    items: true,
                    sales: true,
                    purchases: true,
                    expenses: true,
                    opticals: false,
                    payments: true,
                    reports: true,
                    backup: true,
                    settings: true,
                    estimates: false,
                    creditNotes: false,
                    deliveryNotes: false,
                    journal: false
                  },
                  multiBusiness: true,
                  useIndexedDB: true,
                  theme: {
                    primaryColor: '#1976d2',
                    secondaryColor: '#dc004e'
                  }
                }
              });

              allowed = true;
              adminFlag = true;
            } else {
              // Not in allowed list
              allowed = false;
              adminFlag = false;
            }
          } else {
            const data = userConfigSnap.data();
            allowed = data.allowed !== false;
            adminFlag = !!data.isAdmin;
          }

          // Update auth and access state after access check
          setIsAuthenticated(true);
          setCurrentUser(user);
          setIsAuthorized(allowed);
          setIsAdmin(adminFlag);
          setAuthError(
            allowed
              ? ''
              : 'Your email is not authorized to access this application. Please contact the administrator.'
          );

          // Handle user document based on access
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (allowed) {
            // Only create/update user profile document for allowed users
            if (!userDoc.exists()) {
              await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date(),
                lastLogin: new Date()
              });
            } else {
              await setDoc(userDocRef, { lastLogin: new Date() }, { merge: true });
            }
          } else {
            // Delete user document if access is denied
            if (userDoc.exists()) {
              await deleteDoc(userDocRef);
            }
          }
        } catch (err) {
          console.error('Error checking user access:', err);
          setIsAuthorized(false);
          setIsAdmin(false);
          setAuthError('Unable to verify access. Please try again later.');
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsAuthorized(false);
        setIsAdmin(false);
        setAuthError('');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthorized(false);
      setIsAdmin(false);
      setAuthError('');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      loading,
      isAuthorized,
      isAdmin,
      authError,
      loginWithGoogle,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);