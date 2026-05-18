import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, Grid, MenuItem, Alert
} from '@mui/material';
import { Building2 } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const BusinessSetupDialog = () => {
  const { currentBusiness } = useBusiness();
  const { updateBusiness, backupToFirestore } = useData();
  const { staffSession } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', gstNumber: '', address: '', state: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Never show for staff sessions; only show when business truly needs setup
  if (staffSession || !currentBusiness?.needsSetup) return null;

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Business name is required.');
      return;
    }
    setSaving(true);
    try {
      const savedData = await updateBusiness(currentBusiness.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        gstNumber: form.gstNumber.trim(),
        address: form.address.trim(),
        state: form.state,
        email: form.email.trim(),
        needsSetup: false,
      });

      if (!savedData) {
        setError('Could not save your business details. Please try again.');
        return;
      }

      // Fire-and-forget Firestore backup so staff can see the data.
      // Don't await — a slow/offline Firestore should never block the dialog from closing.
      backupToFirestore(savedData).catch(() => {});
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'primary.main', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Building2 size={20} color="white" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Set Up Your Business
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enter your business details to get started
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              label="Business Name"
              value={form.name}
              onChange={handleChange('name')}
              fullWidth
              required
              autoFocus
              placeholder="e.g. ABC Traders"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={handleChange('phone')}
              fullWidth
              placeholder="e.g. 9876543210"
              inputProps={{ maxLength: 15 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="GST Number"
              value={form.gstNumber}
              onChange={handleChange('gstNumber')}
              fullWidth
              placeholder="e.g. 29ABCDE1234F1Z5"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              value={form.address}
              onChange={handleChange('address')}
              fullWidth
              multiline
              rows={2}
              placeholder="Street, City, PIN"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="State"
              value={form.state}
              onChange={handleChange('state')}
              fullWidth
              select
            >
              <MenuItem value=""><em>Select state</em></MenuItem>
              {INDIAN_STATES.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              value={form.email}
              onChange={handleChange('email')}
              fullWidth
              type="email"
              placeholder="contact@business.com"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          fullWidth
          size="large"
        >
          {saving ? 'Saving…' : 'Get Started'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BusinessSetupDialog;
