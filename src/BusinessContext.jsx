import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const { allBusinessData, loading, updateCurrentBusinessId } = useData();
  const [currentBusinessId, setCurrentBusinessId] = useState(() => {
    return Number(localStorage.getItem('currentBusinessId')) || 1;
  });

  // Extract businesses from object
  const businesses = Object.values(allBusinessData).map(b => ({
    id: b.id,
    name: b.name,
    gstNumber: b.gstNumber,
    address: b.address,
    phone: b.phone,
    email: b.email,
    state: b.state,
    logo: b.logo || '',
    qrCode: b.qrCode || ''
  }));
  
  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0];

  useEffect(() => {
    if (currentBusiness && !loading) {
      setCurrentBusinessId(currentBusiness.id);
      localStorage.setItem('currentBusinessId', currentBusiness.id);
      if (updateCurrentBusinessId) {
        updateCurrentBusinessId(currentBusiness.id);
      }
    }
  }, [currentBusiness?.id, loading, updateCurrentBusinessId]);

  const switchBusiness = (id) => {
    setCurrentBusinessId(id);
    localStorage.setItem('currentBusinessId', id);
    if (updateCurrentBusinessId) {
      updateCurrentBusinessId(id);
    }
  };

  return (
    <BusinessContext.Provider value={{ currentBusiness, businesses, switchBusiness, setCurrentBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);
