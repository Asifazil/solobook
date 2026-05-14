import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { firestore } from './db';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

const defaultConfig = {
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
    settings: true,
    backupExportFile: true,
    backupRestoreFile: true,
    backupOnline: true,
    backupRestoreOnline: true,
    estimates: false,
    creditNotes: false,
    deliveryNotes: false,
    journal: false,
    barcode: false
  },
  multiBusiness: true,
  useIndexedDB: true,
  theme: {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e'
  },
  customSections: [],
  defaultPaperSize: 'A4',
};

// Deep merge utility
const deepMerge = (target, source) => {
  if (!source) return target;
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
};

export const ConfigProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) {
      setConfig(defaultConfig);
      return undefined;
    }

    setLoading(true);
    const ref = doc(firestore, 'userConfig', currentUser.email);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.data();
        const userCfg = data?.config || {};
        const merged = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), userCfg);
        // deepMerge merges arrays by index — override array fields from source directly
        if (Array.isArray(userCfg.customSections)) merged.customSections = userCfg.customSections;
        setConfig(merged);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading user config:', error);
        setConfig(defaultConfig);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const saveConfig = useCallback(
    async (newConfig) => {
      if (!currentUser?.email) return;
      const ref = doc(firestore, 'userConfig', currentUser.email);
      const cleanConfig = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), newConfig || {});
      await setDoc(
        ref,
        {
          email: currentUser.email,
          config: cleanConfig
        },
        { merge: true }
      );
    },
    [currentUser]
  );

  return (
    <ConfigContext.Provider value={{ config, loading, saveConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);