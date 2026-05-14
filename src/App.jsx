import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, Paper, Typography, Button } from '@mui/material';
import { ThemeProviderWrapper } from './ThemeContext';
import { ConfigProvider, useConfig } from './ConfigContext';
import { DataProvider } from './DataContext';
import Layout from './Layout';
import { BusinessProvider, useBusiness } from './BusinessContext';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Admin from './Admin';

import Dashboard from './Dashboard';
import Parties from './Parties';
import Items from './Items';
import Sales from './Sales';
import Reports from './Reports';
import Backup from './Backup';
import Settings from './Settings';
import PaymentEntry from './PaymentEntry';
import Expenses from './Expenses';
import Opticals from './Opticals';
import Estimates from './Estimates';
import CreditNotes from './CreditNotes';
import DebitNotes from './DebitNotes';
import DeliveryNotes from './DeliveryNotes';
import Journal from './Journal';
import CustomSection from './CustomSection';
import { FinancialYearProvider } from './FinancialYearContext';
import { DialogProvider } from './DialogContext';
const AppContent = () => {
  const { isAuthenticated, loading, isAuthorized, authError, isAdmin, logout } = useAuth();
  const { currentBusiness } = useBusiness();
  const { config } = useConfig();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!isAuthorized) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Box
              sx={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 2,
              }}
            >
              <Paper
                elevation={6}
                sx={{
                  maxWidth: 420,
                  width: '100%',
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 3,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Access Denied
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {authError || 'Your email is not authorized to access this application. Please contact the administrator.'}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={logout}
                >
                  Logout
                </Button>
              </Paper>
            </Box>
          }
        />
      </Routes>
    );
  }

  return (
    <Routes>
      {config.features?.dashboard && <Route path="/" element={<Layout><Dashboard /></Layout>} />}
      {config.features?.parties && <Route path="/parties" element={<Layout><Parties /></Layout>} />}
      {config.features?.items && <Route path="/items" element={<Layout><Items /></Layout>} />}
      {config.features?.sales && <Route path="/sales" element={<Layout><Sales /></Layout>} />}
      {config.features?.purchases && <Route path="/purchases" element={<Layout><Sales mode="purchase" /></Layout>} />}
      {config.features?.expenses && <Route path="/expenses" element={<Layout><Expenses /></Layout>} />}
      {config.features?.opticals && config.businessType === 'opticals' && <Route path="/opticals" element={<Layout><Opticals /></Layout>} />}
      {config.features?.estimates && <Route path="/estimates" element={<Layout><Estimates /></Layout>} />}
      {config.features?.creditNotes && <Route path="/credit-notes" element={<Layout><CreditNotes /></Layout>} />}
      {config.features?.debitNotes && <Route path="/debit-notes" element={<Layout><DebitNotes /></Layout>} />}
      {config.features?.deliveryNotes && <Route path="/delivery-notes" element={<Layout><DeliveryNotes /></Layout>} />}
      {config.features?.journal && <Route path="/journal" element={<Layout><Journal /></Layout>} />}
      {config.features?.payments && <Route path="/payment-in" element={<Layout><PaymentEntry mode="payment-in" /></Layout>} />}
      {config.features?.payments && <Route path="/payment-out" element={<Layout><PaymentEntry mode="payment-out" /></Layout>} />}
      {config.features?.reports && <Route path="/reports" element={<Layout><Reports /></Layout>} />}
      {config.features?.backup && <Route path="/backup" element={<Layout><Backup /></Layout>} />}
      {config.features?.settings && <Route path="/settings" element={<Layout><Settings /></Layout>} />}
      {(config.customSections || []).length > 0 && (
        <Route path="/section/:sectionId" element={<Layout><CustomSection /></Layout>} />
      )}
      {isAdmin && <Route path="/admin" element={<Layout><Admin /></Layout>} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <ThemeProviderWrapper>
          <CssBaseline />
          <DataProvider>
            <BusinessProvider>
              <FinancialYearProvider>
                <DialogProvider>
                  <BrowserRouter>
                    <AppContent />
                  </BrowserRouter>
                </DialogProvider>
              </FinancialYearProvider>
            </BusinessProvider>
          </DataProvider>
        </ThemeProviderWrapper>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
