import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid,
  CircularProgress, Alert, Paper, TextField, Switch, FormControlLabel,
  InputAdornment
} from '@mui/material';
import { Download, Upload, CloudUpload, CloudDownload, AlertCircle, Folder } from 'lucide-react';
import { useData } from './DataContext';
import { useConfig } from './ConfigContext';
import { useDialog } from './DialogContext';

const Backup = () => {
  const { confirm } = useDialog();
  const {
    data,
    allBusinessData,
    addItem,
    deleteItem,
    reloadData,
    backupToFirestore,
    restoreFromFirestore,
    restoreFromFile
  } = useData();
  const { config } = useConfig();
  const canExportFile = config.features?.backupExportFile !== false;
  const canRestoreFile = config.features?.backupRestoreFile !== false;
  const canBackupOnline = config.features?.backupOnline !== false;
  const canRestoreOnline = config.features?.backupRestoreOnline !== false;

  const [loading, setLoading] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('autoBackup') === 'true');
  const [backupFolder, setBackupFolder] = useState(() => localStorage.getItem('backupFolder') || '');

  useEffect(() => {
    localStorage.setItem('autoBackup', autoBackup);
  }, [autoBackup]);

  useEffect(() => {
    localStorage.setItem('backupFolder', backupFolder);
  }, [backupFolder]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoBackup && allBusinessData && Object.keys(allBusinessData).length > 0) {
        try {
          const payload = JSON.stringify({ businesses: allBusinessData, exportedAt: new Date().toISOString() });
          localStorage.setItem('solobooks_autobackup', payload);
        } catch (_) {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoBackup, allBusinessData]);

  const exportData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        businesses: allBusinessData,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solobooks_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup exported successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Export failed: ' + error.message });
    }
    setLoading(false);
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ok = await confirm({ title: 'Overwrite Data', message: 'This will overwrite all current data with the imported file. This action cannot be undone. Are you sure?', confirmLabel: 'Overwrite', variant: 'danger' });
    if (!ok) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const businesses = parsed.businesses && typeof parsed.businesses === 'object' ? parsed.businesses : null;

      if (businesses && Object.keys(businesses).length > 0) {
        const result = await restoreFromFile(businesses);
        if (result.success) {
          setMessage({ type: 'success', text: 'Full backup restored from file (all businesses).' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Restore failed.' });
        }
        setLoading(false);
        event.target.value = '';
        return;
      }

      const parties = parsed.parties || [];
      const items = parsed.items || [];
      const sales = parsed.sales || parsed.transactions || [];
      const purchases = parsed.purchases || [];
      const expenses = parsed.expenses || [];
      const opticals = parsed.opticals || [];
      const payments = parsed.payments || [];

      const currentParties = data.parties || [];
      const currentItems = data.items || [];
      const currentSales = data.sales || [];
      const currentPurchases = data.purchases || [];
      const currentExpenses = data.expenses || [];
      const currentOpticals = data.opticals || [];
      const currentPayments = data.payments || [];

      for (const p of currentParties) await deleteItem('parties', p.id);
      for (const i of currentItems) await deleteItem('items', i.id);
      for (const s of currentSales) await deleteItem('sales', s.id);
      for (const p of currentPurchases) await deleteItem('purchases', p.id);
      for (const e of currentExpenses) await deleteItem('expenses', e.id);
      for (const o of currentOpticals) await deleteItem('opticals', o.id);
      for (const p of currentPayments) await deleteItem('payments', p.id);

      for (const p of parties) await addItem('parties', p);
      for (const i of items) await addItem('items', i);
      for (const s of sales) await addItem('sales', s);
      for (const p of purchases) await addItem('purchases', p);
      for (const e of expenses) await addItem('expenses', e);
      for (const o of opticals) await addItem('opticals', o);
      for (const p of payments) await addItem('payments', p);

      setMessage({ type: 'success', text: 'Backup restored successfully! Data is in IndexedDB.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Restore failed: ' + error.message });
    }
    setLoading(false);
    event.target.value = '';
  };

  const handleBackupToOnline = async () => {
    setOnlineLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await backupToFirestore();
      if (result.success) {
        setMessage({ type: 'success', text: 'Data backed up to online database (Firestore) successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Backup to online failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Backup to online failed.' });
    }
    setOnlineLoading(false);
  };

  const handleRestoreFromOnline = async () => {
    const ok = await confirm({ title: 'Restore from Online Backup', message: 'This will replace your local data with the last online backup. Any unsaved local changes will be lost.', confirmLabel: 'Restore', variant: 'warning' });
    if (!ok) return;
    setOnlineLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await restoreFromFirestore();
      if (result.success) {
        setMessage({ type: 'success', text: 'Restored from online backup. Reloading...' });
        await reloadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Restore from online failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Restore from online failed.' });
    }
    setOnlineLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>Backup &amp; Restore</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Data is stored locally. Export a file or back up to the online database when needed.
      </Typography>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        {canExportFile && (
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2, px: 2, textAlign: 'center' }}>
                <Box sx={{ color: 'primary.main', mb: 1 }}><Download size={40} /></Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Export to File</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Download JSON backup
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={exportData}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <Download size={16} />}
                >
                  Download
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {canRestoreFile && (
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2, px: 2, textAlign: 'center' }}>
                <Box sx={{ color: 'secondary.main', mb: 1 }}><Upload size={40} /></Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Restore from File</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Upload JSON file
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  component="label"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <Upload size={16} />}
                >
                  Upload
                  <input type="file" hidden accept=".json" onChange={importData} />
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {canBackupOnline && (
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2, px: 2, textAlign: 'center' }}>
                <Box sx={{ color: 'info.main', mb: 1 }}><CloudUpload size={40} /></Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Backup to Online</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Save to Firestore
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="info"
                  size="small"
                  onClick={handleBackupToOnline}
                  disabled={onlineLoading}
                  startIcon={onlineLoading ? <CircularProgress size={16} /> : <CloudUpload size={16} />}
                >
                  Backup Online
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {canRestoreOnline && (
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2, px: 2, textAlign: 'center' }}>
                <Box sx={{ color: 'info.dark', mb: 1 }}><CloudDownload size={40} /></Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Restore from Online</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Load from Firestore
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  color="info"
                  size="small"
                  onClick={handleRestoreFromOnline}
                  disabled={onlineLoading}
                  startIcon={onlineLoading ? <CircularProgress size={16} /> : <CloudDownload size={16} />}
                >
                  Restore Online
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2, px: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Options</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Backup folder hint"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                    helperText="Reminder where you save backups."
                    InputProps={{ startAdornment: <InputAdornment position="start"><Folder size={18} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={<Switch checked={autoBackup} onChange={(e) => setAutoBackup(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2">Snapshot on close</Typography>}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }} variant="outlined">
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <AlertCircle size={20} color="text.secondary" />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Why backup?</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Data is in IndexedDB. Use &quot;Backup to Online&quot; or &quot;Download&quot; to keep a copy.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Backup;
