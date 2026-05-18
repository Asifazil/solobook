import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid,
  Divider, List, ListItem, ListItemText, IconButton, Alert, Avatar,
  FormControl, InputLabel, Select, MenuItem, Chip, FormControlLabel, Switch,
  InputAdornment, Stack, Tooltip, alpha
} from '@mui/material';
import { Save, Plus, Trash2, Building2, Check, Image, QrCode, FileSearch, RotateCcw, CornerUpLeft, Truck, BookOpen, CalendarRange, Printer, Users, Copy, KeyRound } from 'lucide-react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useBusiness } from './BusinessContext';
import { useThemeContext } from './ThemeContext';
import { useConfig } from './ConfigContext';
import { useData } from './DataContext';
import { useDialog } from './DialogContext';
import { useAuth } from './AuthContext';
import { firestore } from './db';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

const STAFF_FEATURE_KEYS = [
  'dashboard', 'parties', 'items', 'sales', 'purchases', 'expenses',
  'opticals', 'payments', 'reports', 'settings', 'barcode',
  'backupExportFile', 'backupRestoreFile', 'backupOnline', 'backupRestoreOnline',
  'viewPurchasePrice'
];

const STAFF_FEATURE_LABELS = {
  dashboard: 'Dashboard', parties: 'Parties', items: 'Items', sales: 'Sales',
  purchases: 'Purchases', expenses: 'Expenses', opticals: 'Opticals',
  payments: 'Payments', reports: 'Reports', settings: 'Settings', barcode: 'Barcode',
  backupExportFile: 'Export File', backupRestoreFile: 'Restore File',
  backupOnline: 'Backup Online', backupRestoreOnline: 'Restore Online',
  viewPurchasePrice: 'View Purchase Price',
};

const defaultStaffFeatures = () =>
  STAFF_FEATURE_KEYS.reduce((acc, key) => ({
    ...acc,
    [key]: !['backupOnline', 'backupRestoreOnline', 'backupExportFile', 'backupRestoreFile', 'viewPurchasePrice'].includes(key)
  }), {});

const SettingsPage = () => {
  const { currentBusiness, businesses, switchBusiness, setCurrentBusinessId } = useBusiness();
  const { mode, primaryColor, updateTheme } = useThemeContext();
  const { config, saveConfig } = useConfig();
  const { addBusiness, updateBusiness, deleteBusiness: deleteBusinessFromData, deleteItem, getItems } = useData();
  const { confirm, showAlert } = useDialog();
  const { currentBusiness: authBusiness, isAdmin, staffSession } = useAuth();
  const [uploading, setUploading] = useState({ logo: false, qrCode: false });
  const [formData, setFormData] = useState({
    name: '', gstNumber: '', address: '', phone: '', email: '', state: '',
    username: '', password: '', confirmPassword: '', fyStartMonth: 3
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isNew, setIsNew] = useState(false);
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  // Staff management state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '', username: '', password: '', active: true, features: defaultStaffFeatures()
  });
  const [showStaffPwd, setShowStaffPwd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [staffMsg, setStaffMsg] = useState({ type: '', text: '' });

  // Load staff from Firestore when business is available
  useEffect(() => {
    if (!authBusiness?.id) return;
    const ref = collection(firestore, 'businesses', authBusiness.id, 'staff');
    const unsub = onSnapshot(ref,
      snap => setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Staff load error:', err)
    );
    return unsub;
  }, [authBusiness]);

  const resetStaffForm = () => {
    setSelectedStaff(null);
    setStaffForm({ name: '', username: '', password: '', active: true, features: defaultStaffFeatures() });
    setShowStaffPwd(false);
  };

  const loadStaff = (staff) => {
    setSelectedStaff(staff);
    setStaffForm({
      name: staff.name || '',
      username: staff.username || '',
      password: '',
      active: staff.active !== false,
      features: { ...defaultStaffFeatures(), ...(staff.features || {}) }
    });
    setShowStaffPwd(false);
  };

  const handleSaveStaff = async () => {
    if (!authBusiness?.id) { setStaffMsg({ type: 'error', text: 'No business linked to your account yet.' }); return; }
    if (!staffForm.name.trim()) { setStaffMsg({ type: 'error', text: 'Name is required.' }); return; }
    if (!staffForm.username.trim()) { setStaffMsg({ type: 'error', text: 'Username is required.' }); return; }
    if (!selectedStaff && !staffForm.password) { setStaffMsg({ type: 'error', text: 'Password is required for new staff.' }); return; }

    const username = staffForm.username.trim().toLowerCase();
    const duplicate = staffList.find(s => s.username === username && s.id !== selectedStaff?.id);
    if (duplicate) { setStaffMsg({ type: 'error', text: 'Username already taken.' }); return; }

    try {
      const staffId = selectedStaff?.id || `staff_${Date.now()}`;
      const staffData = {
        id: staffId,
        name: staffForm.name.trim(),
        username,
        active: staffForm.active,
        features: staffForm.features,
        ...(staffForm.password ? { password: staffForm.password } : {})
      };
      await setDoc(doc(firestore, 'businesses', authBusiness.id, 'staff', staffId), staffData, { merge: true });
      setStaffMsg({ type: 'success', text: selectedStaff ? 'Staff updated.' : 'Staff account created.' });
      if (!selectedStaff) resetStaffForm();
      else setSelectedStaff({ ...selectedStaff, ...staffData });
      setTimeout(() => setStaffMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setStaffMsg({ type: 'error', text: 'Failed: ' + err.message });
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!authBusiness?.id) return;
    const ok = await confirm({
      title: `Remove: ${staff.name}`,
      message: `Remove ${staff.name}'s account? They will no longer be able to log in.`,
      confirmLabel: 'Remove', variant: 'danger'
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(firestore, 'businesses', authBusiness.id, 'staff', staff.id));
      if (selectedStaff?.id === staff.id) resetStaffForm();
      setStaffMsg({ type: 'success', text: 'Staff account removed.' });
      setTimeout(() => setStaffMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setStaffMsg({ type: 'error', text: 'Failed: ' + err.message });
    }
  };

  const copyCode = () => {
    if (authBusiness?.businessCode) {
      navigator.clipboard.writeText(authBusiness.businessCode).catch(() => {});
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleFeatureToggle = async (featureKey, checked) => {
    const newFeatures = { ...(config.features || {}), [featureKey]: checked };
    setFeaturesSaving(true);
    try {
      await saveConfig({ features: newFeatures });
      setMsg({ type: 'success', text: 'Features updated.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update features.' });
    } finally {
      setFeaturesSaving(false);
    }
  };

  // Sync formData with currentBusiness when it changes, unless we are in "isNew" mode
  useEffect(() => {
    if (currentBusiness && !isNew) {
      setFormData({
        name: currentBusiness.name || '',
        gstNumber: currentBusiness.gstNumber || '',
        address: currentBusiness.address || '',
        phone: currentBusiness.phone || '',
        email: currentBusiness.email || '',
        state: currentBusiness.state || '',
        username: currentBusiness.username || '',
        password: '',
        confirmPassword: '',
        fyStartMonth: currentBusiness.fyStartMonth ?? 3
      });
    }
  }, [currentBusiness, isNew]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness?.id) return;
    setUploading(u => ({ ...u, logo: true }));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateBusiness(currentBusiness.id, { logo: reader.result });
        setMsg({ type: 'success', text: 'Logo updated.' });
      } catch (err) {
        setMsg({ type: 'error', text: 'Failed to update logo.' });
      }
      setUploading(u => ({ ...u, logo: false }));
    };
    reader.onerror = () => { setUploading(u => ({ ...u, logo: false })); setMsg({ type: 'error', text: 'Failed to read file.' }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQrCodeUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness?.id) return;
    setUploading(u => ({ ...u, qrCode: true }));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateBusiness(currentBusiness.id, { qrCode: reader.result });
        setMsg({ type: 'success', text: 'QR code updated.' });
      } catch (err) {
        setMsg({ type: 'error', text: 'Failed to update QR code.' });
      }
      setUploading(u => ({ ...u, qrCode: false }));
    };
    reader.onerror = () => { setUploading(u => ({ ...u, qrCode: false })); setMsg({ type: 'error', text: 'Failed to read file.' }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    if (!currentBusiness?.id) return;
    try {
      await updateBusiness(currentBusiness.id, { logo: '' });
      setMsg({ type: 'success', text: 'Logo removed.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to remove logo.' });
    }
  };

  const handleRemoveQrCode = async () => {
    if (!currentBusiness?.id) return;
    try {
      await updateBusiness(currentBusiness.id, { qrCode: '' });
      setMsg({ type: 'success', text: 'QR code removed.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to remove QR code.' });
    }
  };

  const handleSaveListUpdate = async (e) => {
    e.preventDefault();
    
    if (isNew) {
      if (!config.multiBusiness) {
        setMsg({ type: 'error', text: 'Multiple businesses feature is disabled. Please enable it in the admin panel.' });
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setMsg({ type: 'error', text: 'Passwords do not match!' });
        return;
      }
      if (!formData.username || !formData.password) {
        setMsg({ type: 'error', text: 'Username and password are required!' });
        return;
      }
    }
    
    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      setMsg({ type: 'error', text: 'Business name is required!' });
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      return;
    }

    try {
      if (isNew) {
        const businessData = {
          name: formData.name,
          gstNumber: formData.gstNumber || '',
          address: formData.address || '',
          phone: formData.phone || '',
          email: formData.email || '',
          state: formData.state || 'Unknown',
          fyStartMonth: Number(formData.fyStartMonth ?? 3)
        };
        
        const id = await addBusiness(businessData);
        if (id) {
          setCurrentBusinessId(id);
          setIsNew(false);
          setMsg({ type: 'success', text: 'New business created successfully!' });
        } else {
          setMsg({ type: 'error', text: 'Failed to create business. Please try again.' });
        }
      } else if (currentBusiness?.id) {
        const updateData = {
          name: formData.name,
          gstNumber: formData.gstNumber || '',
          address: formData.address || '',
          phone: formData.phone || '',
          email: formData.email || '',
          state: formData.state || 'Unknown',
          fyStartMonth: Number(formData.fyStartMonth ?? 3)
        };
        
        const saved = await updateBusiness(currentBusiness.id, updateData);
        if (saved) {
          setMsg({ type: 'success', text: 'Business profile updated successfully!' });
        } else {
          setMsg({ type: 'error', text: 'Failed to update business. Please try again.' });
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
      setMsg({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
    }
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const handleDeleteBusiness = async (id) => {
    const bizToDelete = businesses.find(b => b.id === id);
    if (!bizToDelete) return;

    if (businesses.length <= 1) {
      await showAlert({ title: 'Cannot delete', message: 'You need at least one business at all times.', variant: 'warning' });
      return;
    }

    const ok = await confirm({
      title: `Delete "${bizToDelete.name}"`,
      message: `EXTREME CAUTION: This will permanently delete "${bizToDelete.name}" along with ALL its parties, items, invoices, and transactions. This cannot be undone.`,
      confirmLabel: 'Delete Business',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const otherBusiness = businesses.find(b => b.id !== id);
      
      // Delete all related data
      const parties = getItems('parties').filter(p => p.businessId === id);
      const items = getItems('items').filter(i => i.businessId === id);
      const sales = getItems('sales').filter(s => s.businessId === id);
      const purchases = getItems('purchases').filter(p => p.businessId === id);
      const expenses = getItems('expenses').filter(e => e.businessId === id);
      const payments = getItems('payments').filter(p => p.businessId === id);
      const opticals = getItems('opticals').filter(o => o.businessId === id);
      
      // Delete all related data (in parallel for better performance)
      await Promise.all([
        ...parties.map(party => deleteItem('parties', party.id)),
        ...items.map(item => deleteItem('items', item.id)),
        ...sales.map(sale => deleteItem('sales', sale.id)),
        ...purchases.map(purchase => deleteItem('purchases', purchase.id)),
        ...expenses.map(expense => deleteItem('expenses', expense.id)),
        ...payments.map(payment => deleteItem('payments', payment.id)),
        ...opticals.map(optical => deleteItem('opticals', optical.id))
      ]);

      // Delete the business
      const deleted = await deleteBusinessFromData(id);
      
      if (deleted) {
        if (id === currentBusiness?.id && otherBusiness) {
          switchBusiness(otherBusiness.id);
        }
        setMsg({ type: 'success', text: 'Business and all its data deleted.' });
      } else {
        setMsg({ type: 'error', text: 'Failed to delete business. Please try again.' });
      }
    } catch (err) {
      console.error("Deletion failed:", err);
      setMsg({ type: 'error', text: 'Deletion failed: ' + (err.message || 'Unknown error') });
    }
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Settings</Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Manage your business profiles and application preferences.</Typography>

      {msg.text && (
        <Alert severity={msg.type} variant="filled" sx={{ mb: 4, borderRadius: 2 }}>
          {msg.text}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                <Avatar sx={{ bgcolor: isNew ? 'secondary.main' : 'primary.main', width: 40, height: 40 }}>
                  <Building2 size={24} color="white" />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {isNew ? 'New Business Profile' : 'Edit Business Profile'}
                </Typography>
              </Box>
              
              <form onSubmit={handleSaveListUpdate}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Business Name"
                      placeholder="e.g. Acme Corp"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="GSTIN"
                      placeholder="Optional"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      multiline
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Financial Year Start</InputLabel>
                      <Select
                        value={formData.fyStartMonth}
                        label="Financial Year Start"
                        onChange={(e) => setFormData({ ...formData, fyStartMonth: e.target.value })}
                      >
                        <MenuItem value={3}>April (India standard)</MenuItem>
                        <MenuItem value={0}>January (Calendar year)</MenuItem>
                        <MenuItem value={6}>July</MenuItem>
                        <MenuItem value={9}>October</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {!isNew && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'block' }}>Branding (shown on invoices)</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Business Logo</Typography>
                          {currentBusiness?.logo ? (
                            <Box>
                              <img src={currentBusiness.logo} alt="Logo" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
                              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" component="label" disabled={uploading.logo}>
                                  Change
                                  <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                                </Button>
                                <Button size="small" color="error" onClick={handleRemoveLogo}>Remove</Button>
                              </Box>
                            </Box>
                          ) : (
                            <Button size="small" variant="outlined" component="label" startIcon={<Image size={16} />} disabled={uploading.logo}>
                              Upload Logo
                              <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                            </Button>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>QR Code</Typography>
                          {currentBusiness?.qrCode ? (
                            <Box>
                              <img src={currentBusiness.qrCode} alt="QR" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" component="label" disabled={uploading.qrCode}>
                                  Change
                                  <input type="file" hidden accept="image/*" onChange={handleQrCodeUpload} />
                                </Button>
                                <Button size="small" color="error" onClick={handleRemoveQrCode}>Remove</Button>
                              </Box>
                            </Box>
                          ) : (
                            <Button size="small" variant="outlined" component="label" startIcon={<QrCode size={16} />} disabled={uploading.qrCode}>
                              Upload QR Code
                              <input type="file" hidden accept="image/*" onChange={handleQrCodeUpload} />
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    </>
                  )}
                  {isNew && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Username"
                          placeholder="Choose a username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Password"
                          type="password"
                          placeholder="Choose a password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Confirm Password"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required
                          error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                          helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== '' ? 'Passwords do not match' : ''}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12} sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {isNew && (
                      <Button 
                        variant="outlined" 
                        fullWidth
                        onClick={() => setIsNew(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      variant="contained" 
                      fullWidth
                      size="large"
                      startIcon={<Save size={20} />}
                    >
                      {isNew ? 'Create Business' : 'Update Profile'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {config.multiBusiness && (
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Multiple Businesses</Typography>
                <List disablePadding>
                  {businesses.map((biz) => (
                    <Box key={biz.id} sx={{ mb: 2, border: '1px solid', borderColor: biz.id === currentBusiness?.id ? 'primary.main' : 'divider', borderRadius: 3, overflow: 'hidden' }}>
                      <ListItem 
                        sx={{ 
                          py: 2,
                          bgcolor: biz.id === currentBusiness?.id ? 'primary.50' : 'transparent',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ListItemText 
                          primary={biz.name} 
                          secondary={biz.gstNumber || 'No GSTIN'}
                          primaryTypographyProps={{ fontWeight: 600, color: biz.id === currentBusiness?.id ? 'primary.main' : 'text.primary' }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => {
                              setIsNew(false);
                              switchBusiness(biz.id);
                            }} 
                            disabled={biz.id === currentBusiness?.id}
                            title="Switch to this business"
                          >
                            {biz.id === currentBusiness?.id ? <Check size={18} /> : <Save size={18} />}
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteBusiness(biz.id)}
                            title="Delete business"
                            disabled={businesses.length <= 1}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Box>
                      </ListItem>
                    </Box>
                  ))}
                </List>
                <Button 
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1, borderStyle: 'dashed', borderWidth: 2 }}
                  startIcon={<Plus size={20} />}
                  onClick={() => {
                    setFormData({ name: '', gstNumber: '', address: '', phone: '', email: '', state: '' });
                    setIsNew(true);
                  }}
                >
                  Add New Business
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Features / Modules */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Features</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Turn on or off modules you use. Disabled modules are hidden from the menu.</Typography>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.features?.estimates}
                      onChange={(e) => handleFeatureToggle('estimates', e.target.checked)}
                      color="primary"
                      disabled={featuresSaving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileSearch size={18} />
                      <span>Estimates</span>
                    </Box>
                  }
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: 0.25 }}>Quotes & estimates</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.features?.creditNotes}
                      onChange={(e) => handleFeatureToggle('creditNotes', e.target.checked)}
                      color="primary"
                      disabled={featuresSaving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RotateCcw size={18} />
                      <span>Credit Notes</span>
                    </Box>
                  }
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: 0.25 }}>Sales returns / credit memos</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.features?.debitNotes}
                      onChange={(e) => handleFeatureToggle('debitNotes', e.target.checked)}
                      color="primary"
                      disabled={featuresSaving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CornerUpLeft size={18} />
                      <span>Debit Notes</span>
                    </Box>
                  }
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: 0.25 }}>Purchase returns / debit memos</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.features?.deliveryNotes}
                      onChange={(e) => handleFeatureToggle('deliveryNotes', e.target.checked)}
                      color="primary"
                      disabled={featuresSaving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Truck size={18} />
                      <span>Delivery Notes</span>
                    </Box>
                  }
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: 0.25 }}>Delivery challans</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.features?.journal}
                      onChange={(e) => handleFeatureToggle('journal', e.target.checked)}
                      color="primary"
                      disabled={featuresSaving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BookOpen size={18} />
                      <span>Journal</span>
                    </Box>
                  }
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: 0.25 }}>Journal entries</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Lists & Categories */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Lists &amp; Categories</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Customize the dropdown options used across the app. Changes apply immediately.</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Expense Categories</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small" fullWidth placeholder="Add new category…"
                    value={newExpenseCat}
                    onChange={e => setNewExpenseCat(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newExpenseCat.trim()) {
                        const cats = config.expenseCategories || [];
                        if (!cats.includes(newExpenseCat.trim())) {
                          await saveConfig({ ...config, expenseCategories: [...cats, newExpenseCat.trim()] });
                        }
                        setNewExpenseCat('');
                      }
                    }}
                  />
                  <Button variant="contained" disableElevation size="small" startIcon={<Plus size={14} />}
                    onClick={async () => {
                      if (!newExpenseCat.trim()) return;
                      const cats = config.expenseCategories || [];
                      if (!cats.includes(newExpenseCat.trim())) {
                        await saveConfig({ ...config, expenseCategories: [...cats, newExpenseCat.trim()] });
                      }
                      setNewExpenseCat('');
                    }}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(config.expenseCategories || []).map(cat => (
                    <Chip key={cat} label={cat} size="small" variant="outlined"
                      onDelete={async () => {
                        const updated = (config.expenseCategories || []).filter(c => c !== cat);
                        await saveConfig({ ...config, expenseCategories: updated });
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Item Units</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small" fullWidth placeholder="Add new unit… (e.g. Ream, Sq.Ft)"
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && newItemUnit.trim()) {
                        const units = config.itemUnits || [];
                        if (!units.includes(newItemUnit.trim())) {
                          await saveConfig({ ...config, itemUnits: [...units, newItemUnit.trim()] });
                        }
                        setNewItemUnit('');
                      }
                    }}
                  />
                  <Button variant="contained" disableElevation size="small" startIcon={<Plus size={14} />}
                    onClick={async () => {
                      if (!newItemUnit.trim()) return;
                      const units = config.itemUnits || [];
                      if (!units.includes(newItemUnit.trim())) {
                        await saveConfig({ ...config, itemUnits: [...units, newItemUnit.trim()] });
                      }
                      setNewItemUnit('');
                    }}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(config.itemUnits || []).map(unit => (
                    <Chip key={unit} label={unit} size="small" variant="outlined"
                      onDelete={async () => {
                        const updated = (config.itemUnits || []).filter(u => u !== unit);
                        await saveConfig({ ...config, itemUnits: updated });
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Print & Invoice */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Print &amp; Invoice</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Default settings used when printing invoices and documents.</Typography>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Printer size={18} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Default Paper Size</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Pre-selected paper size when printing. Can be changed per document.
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Paper Size</InputLabel>
                  <Select
                    value={config.defaultPaperSize || 'A4'}
                    label="Paper Size"
                    onChange={async (e) => {
                      await saveConfig({ ...config, defaultPaperSize: e.target.value });
                    }}
                  >
                    {['A4', 'A5', 'Letter', 'Legal', 'Thermal 80mm', 'Thermal 58mm'].map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* ===== STAFF MANAGEMENT (visible to owner/admin only, not to staff themselves) ===== */}
      {isAdmin && !staffSession && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Staff Management</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create staff accounts and control which features each staff member can access.
          </Typography>

          {/* Business Code Banner */}
          {authBusiness?.businessCode && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'primary.light', bgcolor: alpha('#1976d2', 0.05), mb: 3 }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Business Code — Share with Staff
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 6, fontFamily: 'monospace', color: 'primary.main' }}>
                      {authBusiness.businessCode}
                    </Typography>
                    <Tooltip title={copiedCode ? 'Copied!' : 'Copy'}>
                      <IconButton size="small" color="primary" onClick={copyCode}>
                        {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300 }}>
                  Staff use this code along with their username and password on the Staff Login tab of the login page.
                </Typography>
              </CardContent>
            </Card>
          )}

          {!authBusiness?.businessCode && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              Your business profile is not linked yet. Sign out and sign back in to complete setup.
            </Alert>
          )}

          {staffMsg.text && (
            <Alert severity={staffMsg.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setStaffMsg({ type: '', text: '' })}>
              {staffMsg.text}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Left: Staff list */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Users size={18} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>Staff Accounts</Typography>
                    </Box>
                    <Button size="small" startIcon={<Plus size={16} />} onClick={resetStaffForm}>New</Button>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {staffList.length === 0 && (
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Users size={32} style={{ opacity: 0.15, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        <Typography variant="body2" color="text.secondary">No staff accounts yet.</Typography>
                        <Typography variant="caption" color="text.secondary">Click "New" to add your first staff member.</Typography>
                      </Box>
                    )}
                    {staffList.map(s => (
                      <Box
                        key={s.id}
                        onClick={() => loadStaff(s)}
                        sx={{
                          mb: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', cursor: 'pointer',
                          borderColor: selectedStaff?.id === s.id ? 'primary.main' : 'divider',
                          bgcolor: selectedStaff?.id === s.id ? alpha('#1976d2', 0.06) : 'background.paper',
                          display: 'flex', alignItems: 'center', gap: 1,
                          '&:hover': { borderColor: 'primary.light' }, transition: 'border-color 0.15s'
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: s.active !== false ? 'primary.main' : 'text.disabled' }}>
                          {(s.name?.[0] || '?').toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{s.username} · {s.active !== false ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDeleteStaff(s); }}>
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Staff form */}
            <Grid item xs={12} md={8}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                    {selectedStaff ? `Editing: ${selectedStaff.name}` : 'New Staff Account'}
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Full Name *" fullWidth
                        value={staffForm.name}
                        onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Rahul Kumar"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Username *" fullWidth
                        value={staffForm.username}
                        onChange={e => setStaffForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                        placeholder="e.g. rahul"
                        helperText="Lowercase, no spaces. Used to log in."
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={selectedStaff ? 'New Password (blank = keep existing)' : 'Password *'}
                        fullWidth
                        type={showStaffPwd ? 'text' : 'password'}
                        value={staffForm.password}
                        onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><KeyRound size={16} style={{ opacity: 0.4 }} /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setShowStaffPwd(v => !v)} edge="end">
                                {showStaffPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={staffForm.active}
                            onChange={e => setStaffForm(f => ({ ...f, active: e.target.checked }))}
                            color="success"
                          />
                        }
                        label={staffForm.active ? 'Account Active' : 'Account Inactive'}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Allowed Features</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Toggle features on or off. Disabled ones are completely hidden from this staff member.
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {STAFF_FEATURE_KEYS.map(key => (
                          <Chip
                            key={key}
                            label={STAFF_FEATURE_LABELS[key] || key}
                            clickable
                            color={staffForm.features[key] ? 'primary' : 'default'}
                            variant={staffForm.features[key] ? 'filled' : 'outlined'}
                            onClick={() => setStaffForm(f => ({
                              ...f,
                              features: { ...f.features, [key]: !f.features[key] }
                            }))}
                          />
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                        <Button variant="outlined" onClick={resetStaffForm}>Cancel</Button>
                        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSaveStaff}>
                          {selectedStaff ? 'Update Staff' : 'Create Staff Account'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Appearance</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Customize the look and feel of your application.</Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Theme Mode</Typography>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={mode}
                    label="Mode"
                    onChange={(e) => updateTheme(e.target.value, primaryColor)}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Primary Color</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { value: 'indigo', label: 'Indigo', color: '#4f46e5' },
                    { value: 'blue', label: 'Blue', color: '#2563eb' },
                    { value: 'green', label: 'Green', color: '#059669' },
                    { value: 'purple', label: 'Purple', color: '#7c3aed' },
                  ].map((colorOption) => (
                    <Chip
                      key={colorOption.value}
                      label={colorOption.label}
                      onClick={() => updateTheme(mode, colorOption.value)}
                      sx={{
                        bgcolor: primaryColor === colorOption.value ? colorOption.color : 'transparent',
                        color: primaryColor === colorOption.value ? 'white' : 'text.primary',
                        border: `2px solid ${colorOption.color}`,
                        '&:hover': {
                          bgcolor: colorOption.color,
                          color: 'white',
                        },
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

    </Box>
  );
};

export default SettingsPage;
