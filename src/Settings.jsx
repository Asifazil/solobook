import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, TextField, Button, Grid, 
  Divider, List, ListItem, ListItemText, IconButton, Alert, Avatar,
  FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, FormControlLabel, Switch
} from '@mui/material';
import { Save, Plus, Trash2, Building2, Check, Image, QrCode, FileSearch, RotateCcw, Truck, BookOpen } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useThemeContext } from './ThemeContext';
import { useConfig } from './ConfigContext';
import { useData } from './DataContext';

const SettingsPage = () => {
  const { currentBusiness, businesses, switchBusiness, setCurrentBusinessId } = useBusiness();
  const { mode, primaryColor, updateTheme } = useThemeContext();
  const { config, saveConfig } = useConfig();
  const { addBusiness, updateBusiness, deleteBusiness: deleteBusinessFromData, deleteItem, getItems } = useData();
  const [uploading, setUploading] = useState({ logo: false, qrCode: false });
  const [formData, setFormData] = useState({
    name: '', gstNumber: '', address: '', phone: '', email: '', state: '',
    username: '', password: '', confirmPassword: ''
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, businessId: null, businessName: '' });
  const [featuresSaving, setFeaturesSaving] = useState(false);

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
        confirmPassword: ''
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
          state: formData.state || 'Unknown'
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
          state: formData.state || 'Unknown'
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

  const handleDeleteBusiness = (id) => {
    const bizToDelete = businesses.find(b => b.id === id);
    if (!bizToDelete) return;

    if (businesses.length <= 1) {
      setMsg({ type: 'error', text: 'You need at least one business at all times.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      return;
    }
    
    setDeleteConfirm({ open: true, businessId: id, businessName: bizToDelete.name });
  };

  const confirmDeleteBusiness = async () => {
    const id = deleteConfirm.businessId;
    if (!id) return;

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
    setDeleteConfirm({ open: false, businessId: null, businessName: '' });
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, businessId: null, businessName: '' })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>EXTREME CAUTION:</strong> Deleting "{deleteConfirm.businessName}" will permanently remove ALL associated parties, items, and transactions.
            <br /><br />
            Are you absolutely sure?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, businessId: null, businessName: '' })}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteBusiness} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
