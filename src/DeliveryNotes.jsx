import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Autocomplete, TablePagination, Dialog, MenuItem
} from '@mui/material';
import { Plus, Trash2, Printer, Edit2, Eye, X } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useFinancialYear } from './FinancialYearContext';
import { useConfig } from './ConfigContext';
import { useData } from './DataContext';
import { useDialog } from './DialogContext';
import { useReactToPrint } from 'react-to-print';
import InvoiceTemplate from './InvoiceTemplate';

const DeliveryNotes = () => {
  const { currentBusiness } = useBusiness();
  const { activeFY } = useFinancialYear();
  const { addItem, deleteItem, getItems } = useData();
  const { confirm, showAlert } = useDialog();
  const { config } = useConfig();
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteNumber, setNoteNumber] = useState('');
  const [items, setItems] = useState([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const [address, setAddress] = useState('');
  const [printingTx, setPrintingTx] = useState(null);
  const [paperSize, setPaperSize] = useState(() => {
    const d = config.defaultPaperSize;
    return ['A4', 'A5', 'Letter', 'Legal'].includes(d) ? d : 'A4';
  });
  const _psInit = React.useRef(!!config.defaultPaperSize);
  useEffect(() => {
    if (!_psInit.current && config.defaultPaperSize) {
      const d = config.defaultPaperSize;
      if (['A4', 'A5', 'Letter', 'Legal'].includes(d)) setPaperSize(d);
      _psInit.current = true;
    }
  }, [config.defaultPaperSize]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const printRef = React.useRef();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id && p.type === 'Customer');
  const stockItems = getItems('items').filter(i => i.businessId === currentBusiness?.id);
  const deliveryNotes = getItems('deliveryNotes').filter(d => d.businessId === currentBusiness?.id).filter(r => !activeFY || !r.date || (r.date >= activeFY.start && r.date <= activeFY.end)).reverse();

  useEffect(() => {
    if (view === 'create' && !isSaving) {
      setNoteNumber(`DN-${Date.now().toString().slice(-6)}`);
      setItems([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
      setSelectedParty(null);
      setNoteDate(new Date().toISOString().split('T')[0]);
      setAddress('');
      setEditId(null);
    }
  }, [view, isSaving]);

  const addItemRow = () => setItems([...items, { itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const removeItemRow = (index) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next.length ? next : [{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
  };
  const updateItemRow = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'itemId') {
      const sel = stockItems.find(i => i.id === value);
      if (sel) { item.name = sel.name; item.price = sel.salePrice; item.taxRate = sel.taxRate; }
    }
    item.total = item.qty * item.price * (1 + (item.taxRate || 0) / 100);
    newItems[index] = item;
    setItems(newItems);
  };

  const total = items.reduce((s, i) => s + i.qty * i.price * (1 + (i.taxRate || 0) / 100), 0);

  const handleSave = async () => {
    if (!currentBusiness?.id || !selectedParty?.id || !noteNumber?.trim() || !noteDate) {
      await showAlert({ title: 'Missing fields', message: 'Please fill in the customer, delivery note number and date.', variant: 'warning' });
      return;
    }
    const cleaned = items.filter(i => i.itemId && i.qty > 0).map(i => ({ ...i }));
    if (!cleaned.length) { await showAlert({ title: 'No items', message: 'Add at least one item with a valid quantity.', variant: 'warning' }); return; }
    setIsSaving(true);
    try {
      const payload = {
        businessId: currentBusiness.id,
        partyId: selectedParty.id,
        partyName: selectedParty.name || '',
        date: noteDate,
        noteNumber: noteNumber.trim(),
        items: cleaned,
        deliveryAddress: address || selectedParty.address || ''
      };
      if (editId) await addItem('deliveryNotes', { ...payload, id: editId });
      else await addItem('deliveryNotes', payload);
      setView('list');
    } catch (e) { await showAlert({ title: 'Save failed', message: 'Save failed: ' + (e?.message || e), variant: 'danger' }); }
    setIsSaving(false);
  };

  const handleEdit = (dn) => {
    setEditId(dn.id);
    setSelectedParty(parties.find(p => p.id === dn.partyId) || null);
    setNoteDate(dn.date || '');
    setNoteNumber(dn.noteNumber || '');
    setItems(dn.items?.length ? dn.items.map(i => ({ ...i, total: i.qty * i.price * (1 + (i.taxRate || 0) / 100) })) : [{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
    setAddress(dn.deliveryAddress || '');
    setView('create');
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Delivery Note', message: 'This delivery note will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) await deleteItem('deliveryNotes', id);
  };

  const doPrint = (dn) => {
    const dnTotal = dn.items?.reduce((s, i) => s + i.qty * i.price * (1 + (i.taxRate || 0) / 100), 0) || 0;
    setPrintingTx({ ...dn, invoiceNumber: dn.noteNumber, date: dn.date, subtotal: dnTotal, taxAmount: 0, totalAmount: dnTotal });
    setTimeout(() => handlePrint(), 100);
  };

  const previewTx = previewRecord
    ? (() => {
        const dnTotal = previewRecord.items?.reduce((s, i) => s + i.qty * i.price * (1 + (i.taxRate || 0) / 100), 0) || 0;
        return { ...previewRecord, invoiceNumber: previewRecord.noteNumber, date: previewRecord.date, subtotal: dnTotal, taxAmount: 0, totalAmount: dnTotal };
      })()
    : null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Hidden print ref */}
      <Box sx={{ position: 'absolute', left: -9999 }}>
        <InvoiceTemplate ref={printRef} transaction={printingTx} business={currentBusiness} paperSize={paperSize} title="Delivery Note" />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Delivery Notes</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setView(view === 'list' ? 'create' : 'list')}>{view === 'list' ? 'New Delivery Note' : 'Back to List'}</Button>
      </Box>

      {view === 'list' && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead><TableRow><TableCell>Date</TableCell><TableCell>#</TableCell><TableCell>Customer</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {deliveryNotes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((dn) => (
                    <TableRow key={dn.id}>
                      <TableCell>{dn.date}</TableCell><TableCell>{dn.noteNumber}</TableCell><TableCell>{dn.partyName}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" title="Preview" onClick={() => { setPreviewRecord(dn); setPreviewOpen(true); }}><Eye size={16} /></IconButton>
                        <IconButton size="small" onClick={() => handleEdit(dn)}><Edit2 size={16} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(dn.id)}><Trash2 size={16} /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[10, 25, 50]} count={deliveryNotes.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
          </CardContent>
        </Card>
      )}

      {view === 'create' && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}><Autocomplete size="small" options={parties} getOptionLabel={(o) => o.name || ''} value={selectedParty} onChange={(_, v) => setSelectedParty(v)} renderInput={(params) => <TextField {...params} label="Customer" />} /></Grid>
              <Grid item xs={6} sm={3} md={2}><TextField fullWidth size="small" label="Delivery Note #" value={noteNumber} onChange={(e) => setNoteNumber(e.target.value)} /></Grid>
              <Grid item xs={6} sm={3} md={2}><TextField fullWidth size="small" type="date" label="Date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Delivery Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Leave blank to use party address" /></Grid>
              <Grid item xs={12}>
                <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Qty</TableCell><TableCell>Price</TableCell><TableCell align="right">Total</TableCell><TableCell></TableCell></TableRow></TableHead>
                  <TableBody>
                    {items.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Autocomplete size="small" options={stockItems} getOptionLabel={(o) => o.name || ''} value={stockItems.find(i => i.id === row.itemId) || null} onChange={(_, v) => updateItemRow(idx, 'itemId', v?.id || '')} renderInput={(params) => <TextField {...params} />} sx={{ minWidth: 200 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.qty} onChange={(e) => updateItemRow(idx, 'qty', parseFloat(e.target.value) || 0)} inputProps={{ min: 0 }} sx={{ width: 70 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.price} onChange={(e) => updateItemRow(idx, 'price', parseFloat(e.target.value) || 0)} sx={{ width: 90 }} /></TableCell>
                        <TableCell align="right">₹{row.total?.toFixed(2)}</TableCell>
                        <TableCell><IconButton size="small" onClick={() => removeItemRow(idx)}><Trash2 size={14} /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></TableContainer>
                <Button size="small" startIcon={<Plus size={14} />} onClick={addItemRow} sx={{ mt: 1 }}>Add line</Button>
              </Grid>
              <Grid item xs={12} sx={{ textAlign: 'right' }}>
                <Box sx={{ mt: 2 }}><Button variant="outlined" sx={{ mr: 1 }} onClick={() => setView('list')}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={isSaving}>Save Delivery Note</Button></Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' } }}>
        {/* Gradient header */}
        <Box sx={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2, flexShrink: 0 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', mt: 0.5, flexShrink: 0 }}>
            <Eye size={18} color="white" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', lineHeight: 1 }}>
              Delivery Note Preview
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, mt: 0.5, fontSize: '1.05rem', fontFamily: 'monospace' }}>
              {previewRecord?.noteNumber || '—'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              {previewRecord?.partyName && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.partyName}</Typography>
              )}
              {previewRecord?.date && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.date}</Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={() => setPreviewOpen(false)} size="small" sx={{ color: 'rgba(255,255,255,0.75)', mt: -0.5, '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <X size={18} />
          </IconButton>
        </Box>
        {/* Toolbar */}
        <Box sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.015)', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem' }}>Page Size</Typography>
            <TextField select size="small" value={paperSize} onChange={(e) => setPaperSize(e.target.value)} sx={{ minWidth: 84, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}>
              {['A4', 'A5', 'Letter', 'Legal'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<Printer size={15} />} variant="contained" size="small" disableElevation
            onClick={() => { setPreviewOpen(false); doPrint(previewRecord); }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}>
            Print
          </Button>
        </Box>
        {/* Scrollable preview */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e8eaed', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <Box sx={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}>
            <div style={{ zoom: 0.72 }}>
              <InvoiceTemplate transaction={previewTx} business={currentBusiness} paperSize={paperSize} title="Delivery Note" />
            </div>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default DeliveryNotes;
