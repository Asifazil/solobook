import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { firestore } from './db';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getLocalData, setLocalData } from './indexedDB';

const DataContext = createContext();

const emptyData = () => ({
  parties: [],
  items: [],
  sales: [],
  purchases: [],
  expenses: [],
  opticals: [],
  opticalOrders: [],
  opticalSettings: [],
  customSectionRecords: [],
  payments: [],
  settings: [],
  estimates: [],
  creditNotes: [],
  debitNotes: [],
  deliveryNotes: [],
  journalEntries: []
});

export const DataProvider = ({ children }) => {
  const { currentUser, isAuthorized, staffSession, loading: authLoading } = useAuth();
  const [data, setData] = useState(emptyData());
  const [allBusinessData, setAllBusinessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState(null);
  const [saving, setSaving] = useState(false);
  const isUpdatingDataRef = useRef(false);
  // Keep a ref so saveCurrentBusinessData always reads the latest staffSession
  const staffSessionRef = useRef(staffSession);
  useEffect(() => { staffSessionRef.current = staffSession; }, [staffSession]);

  useEffect(() => {
    // Wait for Firebase auth to finish resolving before touching data
    if (authLoading) return;

    if (staffSession) {
      loadStaffData(staffSession);
      return;
    }
    if (!currentUser || !isAuthorized) {
      setData(emptyData());
      setAllBusinessData({});
      setLoading(false);
      return;
    }
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUser?.uid, isAuthorized, staffSession?.id]);

  // Listen for business changes from localStorage
  useEffect(() => {
    const storedBusinessId = Number(localStorage.getItem('currentBusinessId')) || 1;
    setCurrentBusinessId(storedBusinessId);
  }, []);

  // Reload data when business changes (but not during active data updates)
  useEffect(() => {
    if (currentBusinessId && Object.keys(allBusinessData).length > 0 && !isUpdatingDataRef.current) {
      loadBusinessData(currentBusinessId);
    }
  }, [currentBusinessId, allBusinessData]);

  const createDefaultBusinessData = () => ({
    '1': {
      id: 1,
      name: 'My Business',
      gstNumber: '',
      address: '',
      phone: '',
      email: '',
      state: '',
      logo: '',
      qrCode: '',
      needsSetup: true,
      data: emptyData()
    }
  });

  const loadAllData = async () => {
    if (!currentUser || !isAuthorized) return;
    try {
      setLoading(true);

      // Firestore is the source of truth — both owner and staff write here,
      // so loading from Firestore first ensures both always see the same data.
      let finalData = null;

      try {
        const snap = await getDoc(doc(firestore, 'users', currentUser.uid));
        if (snap.exists()) {
          const remote = snap.data().businesses;
          if (remote && typeof remote === 'object' && Object.keys(remote).length > 0) {
            finalData = remote;
            // Keep IndexedDB in sync as a local offline cache.
            saveToIndexedDB(remote).catch(() => {});
          }
        }
      } catch (_) {
        // Firestore unreachable — fall through to IndexedDB.
      }

      // Offline fallback: use IndexedDB cache.
      if (!finalData) {
        const local = await getLocalData(currentUser.uid);
        if (local && typeof local === 'object' && Object.keys(local).length > 0) {
          finalData = local;
          // Push the cached data to Firestore so staff can see it once we're back online.
          setDoc(doc(firestore, 'users', currentUser.uid), { businesses: local }, { merge: true }).catch(() => {});
        }
      }

      if (finalData) {
        setAllBusinessData(finalData);
        const storedId = Number(localStorage.getItem('currentBusinessId'));
        const ids = Object.values(finalData).map(b => b.id);
        const validId = ids.includes(storedId) ? storedId : ids[0];
        if (validId) {
          setCurrentBusinessId(validId);
          localStorage.setItem('currentBusinessId', validId.toString());
        }
      } else {
        const defaultData = createDefaultBusinessData();
        setAllBusinessData(defaultData);
        setCurrentBusinessId(1);
        localStorage.setItem('currentBusinessId', '1');
        await saveToIndexedDB(defaultData);
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      const defaultData = createDefaultBusinessData();
      setAllBusinessData(defaultData);
      setCurrentBusinessId(1);
      localStorage.setItem('currentBusinessId', '1');
      await saveToIndexedDB(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const saveToIndexedDB = async (businessData) => {
    if (!currentUser?.uid) return true;
    try {
      await setLocalData(currentUser.uid, businessData);
      return true;
    } catch (e) {
      console.error('IndexedDB save failed:', e);
      return false;
    }
  };

  /** Load business data from the owner's Firestore backup for staff sessions. */
  const loadStaffData = async (session) => {
    setLoading(true);
    try {
      const ownerDocRef = doc(firestore, 'users', session.ownerUid);
      const ownerDoc = await getDoc(ownerDocRef);
      const businesses = ownerDoc.exists() ? ownerDoc.data().businesses : null;

      if (businesses && typeof businesses === 'object' && Object.keys(businesses).length > 0) {
        setAllBusinessData(businesses);
        const firstBiz = Object.values(businesses)[0];
        setCurrentBusinessId(firstBiz.id);
        setData(firstBiz.data || emptyData());
      } else {
        // Owner hasn't backed up to Firestore yet — show empty state without setup prompt
        const fallback = { ...createDefaultBusinessData()['1'], needsSetup: false, name: session.businessName || 'Business' };
        setAllBusinessData({ '1': fallback });
        setCurrentBusinessId(1);
        setData(emptyData());
        console.warn('No Firestore backup found for this business. Ask the owner to do an online backup.');
      }
    } catch (err) {
      console.error('Failed to load staff data from Firestore:', err);
      const fallback = { ...createDefaultBusinessData()['1'], needsSetup: false, name: session.businessName || 'Business' };
      setAllBusinessData({ '1': fallback });
      setCurrentBusinessId(1);
      setData(emptyData());
    } finally {
      setLoading(false);
    }
  };

  /** Called only when user clicks "Backup to Online" on Backup page. No automatic Firestore writes. */
  const backupToFirestore = async (businessData) => {
    if (!currentUser || !isAuthorized) return { success: false, error: 'Not authenticated' };
    try {
      const payload = businessData ?? allBusinessData;
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(userDocRef, { businesses: payload }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Firestore backup failed:', error);
      return { success: false, error: error.message };
    }
  };

  /** Restore from Firestore into IndexedDB (used when user chooses "Restore from Online"). */
  const restoreFromFirestore = async () => {
    if (!currentUser || !isAuthorized) return { success: false, error: 'Not authenticated' };
    try {
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const firestoreData = userDoc.exists() ? userDoc.data().businesses : null;
      if (!firestoreData || typeof firestoreData !== 'object') {
        return { success: false, error: 'No backup found online' };
      }
      setAllBusinessData(firestoreData);
      await setLocalData(currentUser.uid, firestoreData);
      const businessIds = Object.values(firestoreData).map(b => b.id);
      const validId = businessIds[0];
      if (validId) {
        setCurrentBusinessId(validId);
        localStorage.setItem('currentBusinessId', validId.toString());
      }
      return { success: true };
    } catch (error) {
      console.error('Restore from Firestore failed:', error);
      return { success: false, error: error.message };
    }
  };

  /** Restore from a file payload (businesses object) into IndexedDB. Used by Backup page file restore. */
  const restoreFromFile = async (businessData) => {
    if (!currentUser?.uid) return { success: false, error: 'Not authenticated' };
    if (!businessData || typeof businessData !== 'object' || Object.keys(businessData).length === 0) {
      return { success: false, error: 'Invalid backup data' };
    }
    try {
      setAllBusinessData(businessData);
      await setLocalData(currentUser.uid, businessData);
      const businessIds = Object.values(businessData).map(b => b.id);
      const validId = businessIds[0];
      if (validId) {
        setCurrentBusinessId(validId);
        localStorage.setItem('currentBusinessId', validId.toString());
        const biz = businessData[String(validId)];
        if (biz?.data) setData(biz.data);
      }
      return { success: true };
    } catch (error) {
      console.error('Restore from file failed:', error);
      return { success: false, error: error.message };
    }
  };

  const loadBusinessData = (businessId) => {
    const businessKey = String(businessId);
    const business = allBusinessData[businessKey];
    if (business && business.data) {
      setData(business.data);
    } else {
      setData(emptyData());
    }
  };

  const saveAllData = async (businessData) => {
    // Staff saves are handled separately in saveCurrentBusinessData via Firestore.
    if (staffSessionRef.current) return true;
    if (!currentUser || !isAuthorized) return false;
    try {
      setSaving(true);
      // Write to Firestore (shared source of truth) and IndexedDB (offline cache) in parallel.
      // Both owner and staff read from Firestore, so this keeps them in sync automatically.
      await Promise.allSettled([
        saveToIndexedDB(businessData),
        setDoc(doc(firestore, 'users', currentUser.uid), { businesses: businessData }, { merge: true }),
      ]);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentBusinessData = async (newData) => {
    const businessId = currentBusinessId || Number(localStorage.getItem('currentBusinessId')) || 1;
    const businessKey = String(businessId);

    // Set flag to prevent useEffect from overwriting our update
    isUpdatingDataRef.current = true;

    // ✅ Use functional updater for allBusinessData to avoid stale closure
    // when multiple saves happen in rapid succession (e.g. Product First loop).
    const updatedBusinessData = await new Promise((resolve) => {
      setAllBusinessData(prevAll => {
        if (!prevAll[businessKey]) {
          console.error('⚠️ Business not found:', businessKey);
          setTimeout(() => resolve(null), 0);
          return prevAll;
        }
        const updated = {
          ...prevAll,
          [businessKey]: {
            ...prevAll[businessKey],
            data: newData
          }
        };
        setTimeout(() => resolve(updated), 0);
        return updated;
      });
    });

    if (!updatedBusinessData) return false;

    setData(newData);

    // Staff: write directly to the owner's Firestore data path
    const activeStaffSession = staffSessionRef.current;
    if (activeStaffSession) {
      try {
        setSaving(true);
        const ownerDocRef = doc(firestore, 'users', activeStaffSession.ownerUid);
        await setDoc(ownerDocRef, { businesses: updatedBusinessData }, { merge: true });
        return true;
      } catch (e) {
        console.error('Staff Firestore save failed:', e);
        return false;
      } finally {
        setSaving(false);
        setTimeout(() => { isUpdatingDataRef.current = false; }, 100);
      }
    }

    const saved = await saveAllData(updatedBusinessData);

    // Reset flag after a short delay to allow state to settle
    setTimeout(() => {
      isUpdatingDataRef.current = false;
    }, 100);

    return saved;
  };

  const updateCurrentBusinessId = (businessId) => {
    setCurrentBusinessId(businessId);
    localStorage.setItem('currentBusinessId', businessId.toString());
  };

  // ✅ FIXED: Optimized CRUD operations with better logging and validation
  const updateData = async (table, items) => {
    // Validate that items is an array
    if (!Array.isArray(items)) {
      console.error(`❌ Invalid items array for ${table}:`, items);
      return false;
    }

    console.log(`📝 Updating ${table}:`, { itemCount: items.length });
    
    // Use functional update to ensure we get the latest state
    // and wrap in a Promise to ensure state is set before saving
    const newData = await new Promise((resolve) => {
      setData(prevData => {
        const updated = { ...prevData, [table]: items };
        // Resolve with the new data after state update is scheduled
        setTimeout(() => resolve(updated), 0);
        return updated;
      });
    });
    
    // Save the updated data to backend
    const saved = await saveCurrentBusinessData(newData);
    
    if (saved) {
      console.log(`✅ ${table} updated (${items.length} items)`);
    } else {
      console.error(`❌ Failed to save ${table} to backend`);
    }
    
    return saved;
  };

  const addItem = async (table, item) => {
    // Validate item before adding
    if (!item || typeof item !== 'object') {
      console.error(`❌ Invalid item for ${table}:`, item);
      return false;
    }

    // Validate businessId for all tables that require it
    const tablesRequiringBusinessId = ['parties', 'items', 'sales', 'purchases', 'expenses', 'payments', 'opticals', 'estimates', 'creditNotes', 'debitNotes', 'deliveryNotes', 'journalEntries'];
    if (tablesRequiringBusinessId.includes(table) && !item.businessId) {
      console.error(`❌ Invalid ${table} entry - missing businessId:`, item);
      return false;
    }

    // For sales/purchases, validate required fields
    if (table === 'sales' || table === 'purchases') {
      if (!item.items || !Array.isArray(item.items) || item.items.length === 0) {
        console.error(`❌ Invalid ${table} entry - missing items:`, {
          hasItems: !!item.items,
          itemsLength: item.items?.length || 0
        });
        return false;
      }

      // Validate items array — allow name-only items (no itemId) for ad-hoc entries
      const validItems = item.items.filter(i => (i.itemId || i.name?.trim()) && Number(i.qty) > 0);
      if (validItems.length === 0) {
        console.error(`❌ Invalid ${table} entry - no valid items:`, item);
        return false;
      }

      // Validate total amount
      if (!item.totalAmount || item.totalAmount <= 0) {
        console.error(`❌ Invalid ${table} entry - invalid total amount:`, item.totalAmount);
        return false;
      }
    }

    // For parties, validate required fields
    if (table === 'parties') {
      if (!item.name || item.name.trim() === '') {
        console.error(`❌ Invalid ${table} entry - missing name:`, item);
        return false;
      }
      if (!item.type || (item.type !== 'Customer' && item.type !== 'Vendor')) {
        console.error(`❌ Invalid ${table} entry - invalid type:`, item.type);
        return false;
      }
    }

    // For items, validate required fields
    if (table === 'items') {
      if (!item.name || item.name.trim() === '') {
        console.error(`❌ Invalid ${table} entry - missing name:`, item);
        return false;
      }
    }

    // For payments, validate required fields
    if (table === 'payments') {
      if (!item.partyId || !item.totalAmount || item.totalAmount <= 0) {
        console.error(`❌ Invalid ${table} entry - missing required fields:`, {
          hasPartyId: !!item.partyId,
          totalAmount: item.totalAmount
        });
        return false;
      }
    }

    // For expenses, validate required fields
    if (table === 'expenses') {
      if (!item.amount || item.amount <= 0 || !item.date || !item.category) {
        console.error(`❌ Invalid ${table} entry - missing required fields:`, {
          amount: item.amount,
          date: item.date,
          category: item.category
        });
        return false;
      }
    }

    const newItem = { ...item, id: item.id || Date.now() };

    // ✅ FIXED: Read currentItems inside the functional updater so sequential
    // calls in a loop always see the latest state (not a stale closure).
    const newData = await new Promise((resolve) => {
      setData(prevData => {
        const currentItems = prevData[table] || [];
        const updated = { ...prevData, [table]: [...currentItems, newItem] };
        setTimeout(() => resolve(updated), 0);
        return updated;
      });
    });

    const saved = await saveCurrentBusinessData(newData);
    if (saved) console.log(`✅ Added to ${table}, new count:`, newData[table]?.length);
    return saved;
  };

  const updateItem = async (table, id, updates) => {
    console.log(`✏️ Updating ${table} item:`, { id, ...updates });

    // ✅ FIXED: Read items inside the functional updater so sequential
    // calls in a loop always see the latest state (not a stale closure).
    const newData = await new Promise((resolve) => {
      setData(prevData => {
        const items = (prevData[table] || []).map(item =>
          item.id === id ? { ...item, ...updates } : item
        );
        const updated = { ...prevData, [table]: items };
        setTimeout(() => resolve(updated), 0);
        return updated;
      });
    });

    const saved = await saveCurrentBusinessData(newData);

    if (saved) {
      console.log(`✅ Updated ${table} item ${id}`);
    }

    return saved;
  };

  const deleteItem = async (table, id) => {
    console.log(`🗑️ Deleting from ${table}:`, { id });

    const newData = await new Promise((resolve) => {
      setData(prevData => {
        const items = (prevData[table] || []).filter(item => item.id !== id);
        const updated = { ...prevData, [table]: items };
        setTimeout(() => resolve(updated), 0);
        return updated;
      });
    });

    const saved = await saveCurrentBusinessData(newData);

    if (saved) {
      console.log(`✅ Deleted from ${table}`);
    }

    return saved;
  };

  const getItems = useCallback((table) => data[table] || [], [data]);
  const getItem = useCallback((table, id) => (data[table] || []).find(item => item.id === id), [data]);

  // Business management methods
  const addBusiness = async (businessData) => {
    if (!currentUser || !isAuthorized) {
      console.error('❌ Cannot add business: No user logged in or not authorized');
      return false;
    }

    // Validate required fields
    if (!businessData.name || businessData.name.trim() === '') {
      console.error('❌ Invalid business - missing name');
      return false;
    }

    // Generate new business ID
    const existingIds = Object.values(allBusinessData).map(b => b.id);
    const newId = Math.max(...existingIds, 0) + 1;
    const businessKey = String(newId);

    const newBusiness = {
      id: newId,
      name: businessData.name.trim(),
      gstNumber: businessData.gstNumber || '',
      address: businessData.address || '',
      phone: businessData.phone || '',
      email: businessData.email || '',
      state: businessData.state || 'Unknown',
      logo: businessData.logo || '',
      qrCode: businessData.qrCode || '',
      data: {
        parties: [],
        items: [],
        sales: [],
        purchases: [],
        expenses: [],
        opticals: [],
        payments: [],
        settings: [],
        estimates: [],
        creditNotes: [],
        debitNotes: [],
        deliveryNotes: [],
        journalEntries: []
      }
    };

    const updatedBusinessData = {
      ...allBusinessData,
      [businessKey]: newBusiness
    };

    setAllBusinessData(updatedBusinessData);
    const saved = await saveAllData(updatedBusinessData);

    if (saved) {
      console.log(`✅ Business added: ${newBusiness.name} (ID: ${newId})`);
      return newId;
    }

    return false;
  };

  const updateBusiness = async (businessId, updates) => {
    if (!currentUser || !isAuthorized) {
      console.error('❌ Cannot update business: No user logged in or not authorized');
      return false;
    }

    const businessKey = String(businessId);
    if (!allBusinessData[businessKey]) {
      console.error(`❌ Business not found: ${businessId}`);
      return false;
    }

    const updatedBusiness = {
      ...allBusinessData[businessKey],
      ...updates,
      name: updates.name?.trim() || allBusinessData[businessKey].name
    };

    const updatedBusinessData = {
      ...allBusinessData,
      [businessKey]: updatedBusiness
    };

    setAllBusinessData(updatedBusinessData);
    const saved = await saveAllData(updatedBusinessData);

    if (saved) {
      console.log(`✅ Business updated: ${updatedBusiness.name} (ID: ${businessId})`);
      return updatedBusinessData;
    }

    return false;
  };

  const deleteBusiness = async (businessId) => {
    if (!currentUser || !isAuthorized) {
      console.error('❌ Cannot delete business: No user logged in or not authorized');
      return false;
    }

    const businessKey = String(businessId);
    if (!allBusinessData[businessKey]) {
      console.error(`❌ Business not found: ${businessId}`);
      return false;
    }

    const updatedBusinessData = { ...allBusinessData };
    delete updatedBusinessData[businessKey];

    setAllBusinessData(updatedBusinessData);
    const saved = await saveAllData(updatedBusinessData);

    if (saved) {
      console.log(`✅ Business deleted: ID ${businessId}`);
    }

    return saved;
  };

  return (
    <DataContext.Provider value={{
      data,
      loading,
      saving,
      addItem,
      updateItem,
      deleteItem,
      getItems,
      getItem,
      reloadData: loadAllData,
      allBusinessData,
      updateCurrentBusinessId,
      currentBusinessId,
      addBusiness,
      updateBusiness,
      deleteBusiness,
      backupToFirestore,
      restoreFromFirestore,
      restoreFromFile
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
