import React, { useState, useRef, useMemo } from 'react';
import {
  Box, Button, Typography, TextField, Grid, IconButton, InputAdornment, InputBase,
  Stack, Paper, Divider, Container, alpha, Autocomplete, Alert, Snackbar, MenuItem,
  Tabs, Tab, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Save, Edit2, Trash2, ChevronLeft,
  Eye, Info, Plus, Calendar, User, Printer, Phone, Share2,
  ShoppingBag, Settings, Truck, CheckCircle, Clock, X
} from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import DataGrid from './DataGrid';
import { useReactToPrint } from 'react-to-print';
import OpticalTemplate from './OpticalTemplate';

// --- ReadingField Component ---
const ReadingField = ({ label, value, onChange, unit, color }) => (
  <Box sx={{ flex: 1, textAlign: 'center', minWidth: '65px' }}>
    <Typography variant="caption" sx={{
      color: 'text.secondary',
      fontWeight: 700,
      fontSize: '0.65rem',
      textTransform: 'uppercase',
      letterSpacing: 1,
      mb: 1,
      display: 'block',
      opacity: 0.8
    }}>
      {label}
    </Typography>
    <Box sx={{
      position: 'relative',
      bgcolor: alpha(color, 0.05),
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: alpha(color, 0.1),
      transition: 'all 0.2s',
      '&:focus-within': {
        borderColor: color,
        bgcolor: alpha(color, 0.08),
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(color, 0.15)}`
      },
      p: '4px 8px'
    }}>
      <InputBase
        fullWidth
        value={value}
        onChange={onChange}
        placeholder="0.00"
        sx={{
          fontSize: '1rem',
          fontWeight: 700,
          color: color,
          '& input': { textAlign: 'center', p: 0 }
        }}
      />
      <Typography sx={{
        position: 'absolute',
        right: 4,
        bottom: 2,
        fontSize: '0.6rem',
        color: alpha(color, 0.5),
        fontWeight: 800
      }}>
        {unit}
      </Typography>
    </Box>
  </Box>
);

// --- Constants ---
const STATUS_COLORS = {
  Pending: 'warning',
  Ready: 'info',
  Delivered: 'success',
  Cancelled: 'error'
};

const DEFAULT_OPTICAL_SETTINGS = {
  frameTypes: ['Full Frame', 'Half Frame', 'Rimless', 'Semi-Rimless'],
  lensTypes: ['Single Vision', 'Progressive', 'Bifocal', 'Trifocal', 'Photochromic'],
  examCustomFields: [],
  orderCustomFields: []
};

const emptyExamForm = () => ({
  patientName: '',
  phone: '',
  date: new Date().toISOString().split('T')[0],
  rightEye: { sphere: '', cylinder: '', axis: '', add: '', va: '' },
  leftEye: { sphere: '', cylinder: '', axis: '', add: '', va: '' },
  frameType: '',
  lensType: '',
  notes: '',
  customFields: {},
  examReminder: 'off'
});

const emptyOrderForm = () => ({
  patientName: '',
  phone: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  frameType: '',
  lensType: '',
  items: [{ id: Date.now(), name: '', quantity: 1, price: 0 }],
  status: 'Pending',
  notes: '',
  totalAmount: 0,
  customFields: {}
});

// --- Main Component ---
const OpticalsPage = () => {
  const { currentBusiness } = useBusiness();
  const { getItems, addItem, updateItem, deleteItem } = useData();

  // Tab
  const [activeTab, setActiveTab] = useState('exams');

  // Exam state
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyExamForm());
  const [printingData, setPrintingData] = useState(null);
  const [paperSize, setPaperSize] = useState('A4');
  const printRef = useRef();
  const orderPrintRef = useRef();
  const [orderPrintData, setOrderPrintData] = useState(null);

  // Order state
  const [orderView, setOrderView] = useState('list');
  const [orderEditId, setOrderEditId] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm());

  // Settings state
  const [newFrameType, setNewFrameType] = useState('');
  const [newLensType, setNewLensType] = useState('');
  const [newExamField, setNewExamField] = useState({ name: '', type: 'text', options: '' });
  const [newOrderField, setNewOrderField] = useState({ name: '', type: 'text', options: '' });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const showSnackbar = (message, severity = 'error') => setSnackbar({ open: true, message, severity });

  // Derived data
  const readings = getItems('opticals').filter(o => o.businessId === currentBusiness?.id);
  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id && p.type === 'Customer');
  const orders = getItems('opticalOrders').filter(o => o.businessId === currentBusiness?.id);
  const allOpticalSettings = getItems('opticalSettings');

  const opticalSettings = useMemo(() => {
    const stored = allOpticalSettings.find(s => s.businessId === currentBusiness?.id);
    if (!stored) return DEFAULT_OPTICAL_SETTINGS;
    return {
      frameTypes: stored.frameTypes ?? DEFAULT_OPTICAL_SETTINGS.frameTypes,
      lensTypes: stored.lensTypes ?? DEFAULT_OPTICAL_SETTINGS.lensTypes,
      examCustomFields: stored.examCustomFields ?? [],
      orderCustomFields: stored.orderCustomFields ?? []
    };
  }, [allOpticalSettings, currentBusiness?.id]);

  // Print
  const handlePrint = useReactToPrint({ contentRef: printRef });
  const handleOrderPrint = useReactToPrint({ contentRef: orderPrintRef });

  // Share
  const handleShare = (row) => {
    const text =
      `*Optical Prescription from ${currentBusiness?.name || 'Solo Books'}*\n\n` +
      `Patient: ${row.patientName}\n` +
      `Date: ${row.date}\n` +
      `R (OD): ${row.rightEye?.sphere || '0'} / ${row.rightEye?.cylinder || '0'} x ${row.rightEye?.axis || '0'}°\n` +
      `L (OS): ${row.leftEye?.sphere || '0'} / ${row.leftEye?.cylinder || '0'} x ${row.leftEye?.axis || '0'}°\n\n` +
      `Shared via Solo Books`;
    if (navigator.share) {
      navigator.share({ title: `Prescription for ${row.patientName}`, text }).catch(e => console.error(e));
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // --- Exam Handlers ---
  const handleEyeDataChange = (eyeKey, field, value) => {
    setFormData(prev => ({ ...prev, [eyeKey]: { ...prev[eyeKey], [field]: value } }));
  };

  const handleSave = async () => {
    if (!currentBusiness?.id) { showSnackbar('Business not selected. Please refresh and try again.', 'error'); return; }
    if (!formData.patientName?.trim()) { showSnackbar('Please enter a patient name', 'warning'); return; }
    if (!formData.date) { showSnackbar('Please select a date', 'warning'); return; }

    try {
      const dataToSave = {
        ...formData,
        businessId: currentBusiness.id,
        patientName: formData.patientName.trim(),
        updatedAt: new Date().toISOString()
      };

      let saved;
      if (editId) {
        saved = await updateItem('opticals', editId, dataToSave);
      } else {
        saved = await addItem('opticals', { ...dataToSave, createdAt: new Date().toISOString() });
      }

      if (!saved) {
        const savedOptical = getItems('opticals').find(o =>
          o.patientName === dataToSave.patientName &&
          o.date === dataToSave.date &&
          o.businessId === dataToSave.businessId &&
          (!editId || o.id === editId)
        );
        if (!savedOptical) {
          showSnackbar('Failed to save optical record. Please try again.', 'error');
          return;
        }
      }

      showSnackbar(editId ? 'Prescription updated successfully!' : 'Examination saved successfully!', 'success');
      setView('list');
      setEditId(null);
      setFormData(emptyExamForm());
    } catch (error) {
      console.error('Error saving optical record:', error);
      showSnackbar('An error occurred while saving. Please try again.', 'error');
    }
  };

  // --- Order Handlers ---
  const calcTotal = (items) =>
    items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

  const handleOrderItemChange = (idx, field, value) => {
    setOrderForm(prev => {
      const items = prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
      return { ...prev, items, totalAmount: calcTotal(items) };
    });
  };

  const addOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), name: '', quantity: 1, price: 0 }]
    }));
  };

  const removeOrderItem = (idx) => {
    setOrderForm(prev => {
      const items = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items, totalAmount: calcTotal(items) };
    });
  };

  const handleOrderSave = async () => {
    if (!currentBusiness?.id) { showSnackbar('Business not selected', 'error'); return; }
    if (!orderForm.patientName?.trim()) { showSnackbar('Please enter customer name', 'warning'); return; }
    if (!orderForm.orderDate) { showSnackbar('Please select order date', 'warning'); return; }

    try {
      const dataToSave = {
        ...orderForm,
        businessId: currentBusiness.id,
        patientName: orderForm.patientName.trim(),
        totalAmount: calcTotal(orderForm.items),
        updatedAt: new Date().toISOString()
      };

      let saved;
      if (orderEditId) {
        saved = await updateItem('opticalOrders', orderEditId, dataToSave);
      } else {
        saved = await addItem('opticalOrders', { ...dataToSave, createdAt: new Date().toISOString() });
      }

      if (!saved) {
        const check = getItems('opticalOrders').find(o =>
          o.patientName === dataToSave.patientName &&
          o.orderDate === dataToSave.orderDate &&
          o.businessId === dataToSave.businessId &&
          (!orderEditId || o.id === orderEditId)
        );
        if (!check) {
          showSnackbar('Failed to save order. Please try again.', 'error');
          return;
        }
      }

      showSnackbar(orderEditId ? 'Order updated successfully!' : 'Order placed successfully!', 'success');
      setOrderView('list');
      setOrderEditId(null);
      setOrderForm(emptyOrderForm());
    } catch (error) {
      console.error('Error saving order:', error);
      showSnackbar('An error occurred while saving.', 'error');
    }
  };

  // --- Settings Handlers ---
  const saveOpticalSettings = async (newSettings) => {
    const existing = allOpticalSettings.find(s => s.businessId === currentBusiness?.id);
    const toSave = { ...newSettings, businessId: currentBusiness.id };
    if (existing) {
      return updateItem('opticalSettings', existing.id, toSave);
    }
    return addItem('opticalSettings', toSave);
  };

  const handleAddFrameType = async () => {
    const trimmed = newFrameType.trim();
    if (!trimmed || opticalSettings.frameTypes.includes(trimmed)) return;
    await saveOpticalSettings({ ...opticalSettings, frameTypes: [...opticalSettings.frameTypes, trimmed] });
    setNewFrameType('');
  };

  const handleRemoveFrameType = async (type) => {
    await saveOpticalSettings({ ...opticalSettings, frameTypes: opticalSettings.frameTypes.filter(t => t !== type) });
  };

  const handleAddLensType = async () => {
    const trimmed = newLensType.trim();
    if (!trimmed || opticalSettings.lensTypes.includes(trimmed)) return;
    await saveOpticalSettings({ ...opticalSettings, lensTypes: [...opticalSettings.lensTypes, trimmed] });
    setNewLensType('');
  };

  const handleRemoveLensType = async (type) => {
    await saveOpticalSettings({ ...opticalSettings, lensTypes: opticalSettings.lensTypes.filter(t => t !== type) });
  };

  const handleAddExamField = async () => {
    const name = newExamField.name.trim();
    if (!name) return;
    const field = {
      id: Date.now().toString(),
      name,
      type: newExamField.type,
      options: newExamField.type === 'select'
        ? newExamField.options.split(',').map(o => o.trim()).filter(Boolean)
        : []
    };
    await saveOpticalSettings({
      ...opticalSettings,
      examCustomFields: [...opticalSettings.examCustomFields, field]
    });
    setNewExamField({ name: '', type: 'text', options: '' });
  };

  const handleRemoveExamField = async (fieldId) => {
    await saveOpticalSettings({
      ...opticalSettings,
      examCustomFields: opticalSettings.examCustomFields.filter(f => f.id !== fieldId)
    });
  };

  const handleAddOrderField = async () => {
    const name = newOrderField.name.trim();
    if (!name) return;
    const field = {
      id: Date.now().toString(),
      name,
      type: newOrderField.type,
      options: newOrderField.type === 'select'
        ? newOrderField.options.split(',').map(o => o.trim()).filter(Boolean)
        : []
    };
    await saveOpticalSettings({
      ...opticalSettings,
      orderCustomFields: [...opticalSettings.orderCustomFields, field]
    });
    setNewOrderField({ name: '', type: 'text', options: '' });
  };

  const handleRemoveOrderField = async (fieldId) => {
    await saveOpticalSettings({
      ...opticalSettings,
      orderCustomFields: opticalSettings.orderCustomFields.filter(f => f.id !== fieldId)
    });
  };

  // ===================== RENDER =====================

  const snackbarEl = (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  // --- Exam Create/Edit ---
  if (activeTab === 'exams' && (view === 'create' || view === 'edit')) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
        <div style={{ display: 'none' }}>
          <OpticalTemplate ref={printRef} data={formData} business={currentBusiness} paperSize={paperSize} />
        </div>
        <Container maxWidth="lg">
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <Stack direction="row" spacing={2}>
              <IconButton
                onClick={() => { setView('list'); setEditId(null); }}
                sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ChevronLeft size={20} />
              </IconButton>
              <TextField
                select size="small" value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                sx={{ minWidth: 100, bgcolor: 'background.paper' }}
              >
                {['A4', 'A5', 'Letter', 'Legal'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <Button startIcon={<Printer size={18} />} onClick={() => handlePrint()} variant="outlined" sx={{ borderRadius: 2 }}>
                Print
              </Button>
              <Button
                startIcon={<Share2 size={18} />} onClick={() => handleShare(formData)} variant="outlined"
                sx={{ borderRadius: 2, color: '#25D366', borderColor: '#25D366', '&:hover': { borderColor: '#128C7E', bgcolor: 'rgba(37,211,102,0.04)' } }}
              >
                Share
              </Button>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {editId ? 'Edit Prescription' : 'New Examination'}
            </Typography>
            <Button variant="contained" size="medium" disableElevation startIcon={<Save size={18} />} onClick={handleSave} sx={{ borderRadius: 2, px: 3 }}>
              Save
            </Button>
          </Stack>

          <Stack spacing={3}>
            {/* Patient Info */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>Patient Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo options={parties.map(p => p.name)} fullWidth value={formData.patientName}
                    onChange={(_, v) => setFormData(prev => ({ ...prev, patientName: v || '' }))}
                    onInputChange={(_, v) => setFormData(prev => ({ ...prev, patientName: v }))}
                    renderInput={(params) => (
                      <TextField {...params} label="Patient Name" required
                        InputProps={{ ...params.InputProps, startAdornment: <User size={18} style={{ marginRight: 8, color: 'rgba(0,0,0,0.54)' }} /> }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone Number" variant="outlined" value={formData.phone}
                    placeholder="Enter patient phone"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="date" label="Examination Date" variant="outlined" value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    InputLabelProps={{ shrink: true }} required
                    InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="Exam Reminder" value={formData.examReminder || 'off'}
                    onChange={(e) => setFormData({ ...formData, examReminder: e.target.value })}>
                    <MenuItem value="off">Off (No reminder)</MenuItem>
                    <MenuItem value="1month">1 Month</MenuItem>
                    <MenuItem value="6months">6 Months</MenuItem>
                    <MenuItem value="1year">1 Year</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>

            {/* Refraction Data */}
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ p: 1.5, bgcolor: 'primary.main', display: 'flex', justifyContent: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 1.5, color: 'white' }}>
                  REFRACTION DATA
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 3, bgcolor: alpha('#1976d2', 0.05), borderRadius: 2, border: '2px solid', borderColor: alpha('#1976d2', 0.2) }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2', mb: 2 }}>Right Eye (OD)</Typography>
                      <Grid container spacing={2} alignItems="center">
                        {[
                          { field: 'sphere', label: 'Sphere', unit: 'D' },
                          { field: 'cylinder', label: 'Cylinder', unit: 'D' },
                          { field: 'axis', label: 'Axis', unit: '°' },
                          { field: 'add', label: 'Add', unit: 'D' },
                          { field: 'va', label: 'VA', unit: '' }
                        ].map(({ field, label, unit }) => (
                          <Grid item xs={6} sm={4} md={2.4} key={field}>
                            <ReadingField label={label} unit={unit} color="#1976d2"
                              value={formData.rightEye[field]}
                              onChange={(e) => handleEyeDataChange('rightEye', field, e.target.value)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 3, bgcolor: alpha('#dc004e', 0.05), borderRadius: 2, border: '2px solid', borderColor: alpha('#dc004e', 0.2) }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#dc004e', mb: 2 }}>Left Eye (OS)</Typography>
                      <Grid container spacing={2} alignItems="center">
                        {[
                          { field: 'sphere', label: 'Sphere', unit: 'D' },
                          { field: 'cylinder', label: 'Cylinder', unit: 'D' },
                          { field: 'axis', label: 'Axis', unit: '°' },
                          { field: 'add', label: 'Add', unit: 'D' },
                          { field: 'va', label: 'VA', unit: '' }
                        ].map(({ field, label, unit }) => (
                          <Grid item xs={6} sm={4} md={2.4} key={field}>
                            <ReadingField label={label} unit={unit} color="#dc004e"
                              value={formData.leftEye[field]}
                              onChange={(e) => handleEyeDataChange('leftEye', field, e.target.value)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Custom Exam Fields */}
            {opticalSettings.examCustomFields.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Additional Details</Typography>
                <Grid container spacing={2}>
                  {opticalSettings.examCustomFields.map(field => (
                    <Grid item xs={12} sm={6} key={field.id}>
                      {field.type === 'select' ? (
                        <TextField select fullWidth label={field.name}
                          value={formData.customFields?.[field.id] || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))}>
                          <MenuItem value="">None</MenuItem>
                          {field.options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                      ) : (
                        <TextField fullWidth label={field.name} type={field.type}
                          value={formData.customFields?.[field.id] || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))}
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Clinical Notes */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info size={18} /> Clinical Notes
              </Typography>
              <TextField fullWidth multiline rows={4} placeholder="Additional observations, recommendations, or notes..."
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Paper>
          </Stack>
          {snackbarEl}
        </Container>
      </Box>
    );
  }

  // --- Order Create/Edit ---
  if (activeTab === 'orders' && (orderView === 'create' || orderView === 'edit')) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <IconButton
              onClick={() => { setOrderView('list'); setOrderEditId(null); }}
              sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {orderEditId ? 'Edit Order' : 'New Order'}
            </Typography>
            <Button variant="contained" disableElevation startIcon={<Save size={18} />} onClick={handleOrderSave} sx={{ borderRadius: 2, px: 3 }}>
              Save
            </Button>
          </Stack>

          <Stack spacing={3}>
            {/* Customer Info */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Customer Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo options={parties.map(p => p.name)} fullWidth value={orderForm.patientName}
                    onChange={(_, v) => setOrderForm(prev => ({ ...prev, patientName: v || '' }))}
                    onInputChange={(_, v) => setOrderForm(prev => ({ ...prev, patientName: v }))}
                    renderInput={(params) => (
                      <TextField {...params} label="Customer Name" required
                        InputProps={{ ...params.InputProps, startAdornment: <User size={18} style={{ marginRight: 8, color: 'rgba(0,0,0,0.54)' }} /> }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone Number" value={orderForm.phone}
                    onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="date" label="Order Date" value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    InputLabelProps={{ shrink: true }} required
                    InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="date" label="Delivery Date" value={orderForm.deliveryDate}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Truck size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Frame & Lens */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Frame & Lens Details</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="Frame Type" value={orderForm.frameType}
                    onChange={(e) => setOrderForm({ ...orderForm, frameType: e.target.value })}>
                    <MenuItem value="">Select Frame Type</MenuItem>
                    {opticalSettings.frameTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="Lens Type" value={orderForm.lensType}
                    onChange={(e) => setOrderForm({ ...orderForm, lensType: e.target.value })}>
                    <MenuItem value="">Select Lens Type</MenuItem>
                    {opticalSettings.lensTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>
            </Paper>

            {/* Custom Order Fields */}
            {opticalSettings.orderCustomFields.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Additional Details</Typography>
                <Grid container spacing={2}>
                  {opticalSettings.orderCustomFields.map(field => (
                    <Grid item xs={12} sm={6} key={field.id}>
                      {field.type === 'select' ? (
                        <TextField select fullWidth label={field.name}
                          value={orderForm.customFields?.[field.id] || ''}
                          onChange={(e) => setOrderForm(prev => ({
                            ...prev, customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))}>
                          <MenuItem value="">None</MenuItem>
                          {field.options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                      ) : (
                        <TextField fullWidth label={field.name} type={field.type}
                          value={orderForm.customFields?.[field.id] || ''}
                          onChange={(e) => setOrderForm(prev => ({
                            ...prev, customFields: { ...prev.customFields, [field.id]: e.target.value }
                          }))}
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Order Items */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Order Items</Typography>
                <Button size="small" startIcon={<Plus size={16} />} onClick={addOrderItem} variant="outlined" sx={{ borderRadius: 2 }}>
                  Add Item
                </Button>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Item Description</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Price (₹)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Subtotal</TableCell>
                      <TableCell sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderForm.items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <TextField variant="standard" fullWidth placeholder="e.g., Prescription Glasses"
                            value={item.name}
                            onChange={(e) => handleOrderItemChange(idx, 'name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField variant="standard" type="number"
                            inputProps={{ min: 1, style: { textAlign: 'center' } }}
                            value={item.quantity}
                            onChange={(e) => handleOrderItemChange(idx, 'quantity', e.target.value)}
                            sx={{ width: 70 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField variant="standard" type="number"
                            inputProps={{ min: 0, style: { textAlign: 'right' } }}
                            value={item.price}
                            onChange={(e) => handleOrderItemChange(idx, 'price', e.target.value)}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600 }}>
                            ₹{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeOrderItem(idx)}
                            disabled={orderForm.items.length === 1}>
                            <X size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Total: ₹{calcTotal(orderForm.items).toFixed(2)}
                </Typography>
              </Stack>
            </Paper>

            {/* Status & Notes */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Order Status</Typography>
                  <TextField select fullWidth label="Status" value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}>
                    {Object.keys(STATUS_COLORS).map(s => (
                      <MenuItem key={s} value={s}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {s === 'Pending' && <Clock size={16} />}
                          {s === 'Ready' && <CheckCircle size={16} />}
                          {s === 'Delivered' && <Truck size={16} />}
                          {s === 'Cancelled' && <X size={16} />}
                          <span>{s}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Notes</Typography>
                  <TextField fullWidth multiline rows={3} placeholder="Special instructions, advance amount, etc."
                    value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Stack>
          {snackbarEl}
        </Container>
      </Box>
    );
  }

  // --- Main List View (with Tabs) ---
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <div style={{ display: 'none' }}>
        <OpticalTemplate ref={printRef} data={printingData} business={currentBusiness} paperSize={paperSize} />
      </div>
      <div style={{ display: 'none' }}>
        <div ref={orderPrintRef} style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
          {orderPrintData && (
            <>
              <h2 style={{ textAlign: 'center', margin: '0 0 4px' }}>{currentBusiness?.name}</h2>
              <p style={{ textAlign: 'center', margin: '0 0 16px', fontSize: 12 }}>Optical Order</p>
              <hr />
              <p><strong>Customer:</strong> {orderPrintData.patientName}</p>
              <p><strong>Phone:</strong> {orderPrintData.phone || '—'}</p>
              <p><strong>Order Date:</strong> {orderPrintData.orderDate}</p>
              <p><strong>Delivery Date:</strong> {orderPrintData.deliveryDate || '—'}</p>
              <p><strong>Frame Type:</strong> {orderPrintData.frameType || '—'}</p>
              <p><strong>Lens Type:</strong> {orderPrintData.lensType || '—'}</p>
              <p><strong>Status:</strong> {orderPrintData.status}</p>
              <hr />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '4px 0' }}>Item</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid #ccc', padding: '4px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: '4px 0' }}>Price</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: '4px 0' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(orderPrintData.items || []).map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: '3px 0' }}>{it.name}</td>
                      <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>₹{Number(it.price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>₹{(Number(it.quantity) * Number(it.price)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr />
              <p style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 15 }}>Total: ₹{(orderPrintData.totalAmount || 0).toFixed(2)}</p>
              {orderPrintData.notes && <p style={{ fontSize: 12 }}><strong>Notes:</strong> {orderPrintData.notes}</p>}
            </>
          )}
        </div>
      </div>

      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Opticals</Typography>
        {activeTab === 'exams' && (
          <Button variant="contained" disableElevation startIcon={<Plus />}
            onClick={() => { setEditId(null); setFormData(emptyExamForm()); setView('create'); }}
            sx={{ bgcolor: '#1A1C1E', borderRadius: 2, px: 3 }}>
            New Exam
          </Button>
        )}
        {activeTab === 'orders' && (
          <Button variant="contained" disableElevation startIcon={<Plus />}
            onClick={() => { setOrderEditId(null); setOrderForm(emptyOrderForm()); setOrderView('create'); }}
            sx={{ bgcolor: '#1A1C1E', borderRadius: 2, px: 3 }}>
            New Order
          </Button>
        )}
      </Stack>

      {/* Tab Bar */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ '& .MuiTabs-indicator': { height: 3 } }}
        >
          <Tab value="exams" label="Exams" icon={<Eye size={16} />} iconPosition="start"
            sx={{ fontWeight: 600, minHeight: 52 }} />
          <Tab value="orders" label="Orders" icon={<ShoppingBag size={16} />} iconPosition="start"
            sx={{ fontWeight: 600, minHeight: 52 }} />
          <Tab value="settings" label="Settings" icon={<Settings size={16} />} iconPosition="start"
            sx={{ fontWeight: 600, minHeight: 52 }} />
        </Tabs>
      </Paper>

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <DataGrid
          data={readings}
          columns={[
            { key: 'date', header: 'Date', width: 120 },
            { key: 'patientName', header: 'Patient', width: 200, render: (v) => <Typography sx={{ fontWeight: 600 }}>{v}</Typography> },
            { key: 'phone', header: 'Phone', width: 150 },
            { key: 'rightEye', header: 'R (OD)', width: 200, render: (v) => `${v?.sphere || '0'} / ${v?.cylinder || '0'} x ${v?.axis || '0'}°` },
            { key: 'leftEye', header: 'L (OS)', width: 200, render: (v) => `${v?.sphere || '0'} / ${v?.cylinder || '0'} x ${v?.axis || '0'}°` },
          ]}
          actions={(row) => (
            <Stack direction="row" spacing={1}>
              <IconButton size="small" color="primary"
                onClick={() => { setPrintingData(row); setTimeout(() => handlePrint(), 100); }} title="Print">
                <Printer size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: '#25D366' }} onClick={() => handleShare(row)} title="Share on WhatsApp">
                <Share2 size={18} />
              </IconButton>
              <IconButton size="small" onClick={() => {
                setEditId(row.id);
                setFormData({ ...emptyExamForm(), ...row, customFields: row.customFields || {} });
                setView('edit');
              }}>
                <Edit2 size={18} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => deleteItem('opticals', row.id)}>
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          )}
        />
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <DataGrid
          data={orders}
          columns={[
            { key: 'orderDate', header: 'Order Date', width: 120 },
            { key: 'patientName', header: 'Customer', width: 180, render: (v) => <Typography sx={{ fontWeight: 600 }}>{v}</Typography> },
            { key: 'phone', header: 'Phone', width: 140 },
            { key: 'deliveryDate', header: 'Delivery Date', width: 130 },
            { key: 'frameType', header: 'Frame Type', width: 140 },
            { key: 'lensType', header: 'Lens Type', width: 140 },
            { key: 'totalAmount', header: 'Total', width: 120, render: (v) => `₹${(v || 0).toFixed(2)}` },
            {
              key: 'status', header: 'Status', width: 120,
              render: (v) => <Chip size="small" label={v} color={STATUS_COLORS[v] || 'default'} sx={{ fontWeight: 600 }} />
            },
          ]}
          actions={(row) => (
            <Stack direction="row" spacing={1}>
              <IconButton size="small" color="primary" title="Print Order"
                onClick={() => { setOrderPrintData(row); setTimeout(() => handleOrderPrint(), 100); }}>
                <Printer size={18} />
              </IconButton>
              <IconButton size="small" onClick={() => {
                setOrderEditId(row.id);
                setOrderForm({ ...emptyOrderForm(), ...row, items: row.items?.length ? row.items : emptyOrderForm().items, customFields: row.customFields || {} });
                setOrderView('edit');
              }}>
                <Edit2 size={18} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => deleteItem('opticalOrders', row.id)}>
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          )}
        />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Stack spacing={3}>
          {/* Frame Types */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Frame Types</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shown as dropdown options in exam and order forms.
            </Typography>
            <Stack direction="row" flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              {opticalSettings.frameTypes.map(t => (
                <Chip key={t} label={t} onDelete={() => handleRemoveFrameType(t)} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" value={newFrameType} placeholder="New frame type"
                onChange={(e) => setNewFrameType(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddFrameType(); }}
                sx={{ minWidth: 200 }}
              />
              <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddFrameType} sx={{ borderRadius: 2 }}>
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Lens Types */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Lens Types</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shown as dropdown options in exam and order forms.
            </Typography>
            <Stack direction="row" flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              {opticalSettings.lensTypes.map(t => (
                <Chip key={t} label={t} onDelete={() => handleRemoveLensType(t)} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" value={newLensType} placeholder="New lens type"
                onChange={(e) => setNewLensType(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddLensType(); }}
                sx={{ minWidth: 200 }}
              />
              <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddLensType} sx={{ borderRadius: 2 }}>
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Custom Exam Fields */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Custom Exam Fields</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Additional fields that appear in the exam form under Product Recommendations.
            </Typography>

            {opticalSettings.examCustomFields.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {opticalSettings.examCustomFields.map(field => (
                  <Stack key={field.id} direction="row" alignItems="center" spacing={1}
                    sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{field.name}</Typography>
                      {field.type === 'select' && field.options.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Options: {field.options.join(', ')}
                        </Typography>
                      )}
                    </Box>
                    <Chip size="small" label={field.type} variant="outlined" />
                    <IconButton size="small" color="error" onClick={() => handleRemoveExamField(field.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Add New Field</Typography>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Field Name" value={newExamField.name}
                  onChange={(e) => setNewExamField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Color, IPD"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Field Type" value={newExamField.type}
                  onChange={(e) => setNewExamField(prev => ({ ...prev, type: e.target.value }))}>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="select">Dropdown</MenuItem>
                </TextField>
              </Grid>
              {newExamField.type === 'select' && (
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth size="small" label="Options (comma separated)" value={newExamField.options}
                    onChange={(e) => setNewExamField(prev => ({ ...prev, options: e.target.value }))}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={newExamField.type === 'select' ? 12 : 5} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddExamField} sx={{ borderRadius: 2 }}>
                  Add Field
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Custom Order Fields */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Custom Order Fields</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Additional fields that appear in the order form under Additional Details.
            </Typography>

            {opticalSettings.orderCustomFields.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {opticalSettings.orderCustomFields.map(field => (
                  <Stack key={field.id} direction="row" alignItems="center" spacing={1}
                    sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{field.name}</Typography>
                      {field.type === 'select' && field.options.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Options: {field.options.join(', ')}
                        </Typography>
                      )}
                    </Box>
                    <Chip size="small" label={field.type} variant="outlined" />
                    <IconButton size="small" color="error" onClick={() => handleRemoveOrderField(field.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Add New Field</Typography>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Field Name" value={newOrderField.name}
                  onChange={(e) => setNewOrderField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Advance Paid, Color"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Field Type" value={newOrderField.type}
                  onChange={(e) => setNewOrderField(prev => ({ ...prev, type: e.target.value }))}>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="select">Dropdown</MenuItem>
                </TextField>
              </Grid>
              {newOrderField.type === 'select' && (
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth size="small" label="Options (comma separated)" value={newOrderField.options}
                    onChange={(e) => setNewOrderField(prev => ({ ...prev, options: e.target.value }))}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={newOrderField.type === 'select' ? 12 : 5} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddOrderField} sx={{ borderRadius: 2 }}>
                  Add Field
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      )}

      {snackbarEl}
    </Box>
  );
};

export default OpticalsPage;
