import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, MenuItem, Autocomplete, InputAdornment,
  TablePagination, Chip, Dialog
} from '@mui/material';
import { Plus, Trash2, Printer, ChevronLeft, FileText, Edit2, Eye, X } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useFinancialYear } from './FinancialYearContext';
import { useConfig } from './ConfigContext';
import { useData } from './DataContext';
import { useDialog } from './DialogContext';
import { useReactToPrint } from 'react-to-print';
import InvoiceTemplate from './InvoiceTemplate';
import PartySelect from './PartySelect';
import ItemSelect from './ItemSelect';

const Estimates = () => {
  const { currentBusiness } = useBusiness();
  const { activeFY } = useFinancialYear();
  const { addItem, deleteItem, getItems } = useData();
  const { confirm, showAlert } = useDialog();
  const { config } = useConfig();
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimateNumber, setEstimateNumber] = useState('');
  const [items, setItems] = useState([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const [description, setDescription] = useState('');
  const [noGST, setNoGST] = useState(false);
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
  const estimates = getItems('estimates').filter(e => e.businessId === currentBusiness?.id).filter(r => !activeFY || !r.date || (r.date >= activeFY.start && r.date <= activeFY.end)).reverse();

  useEffect(() => {
    if (view === 'create' && !isSaving) {
      setEstimateNumber(`EST-${Date.now().toString().slice(-6)}`);
      setItems([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
      setSelectedParty(null);
      setEstimateDate(new Date().toISOString().split('T')[0]);
      setDescription('');
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
      if (sel) {
        item.name = sel.name;
        item.price = sel.salePrice;
        item.taxRate = sel.taxRate;
      }
    }
    item.total = item.qty * item.price * (1 + (item.taxRate || 0) / 100);
    newItems[index] = item;
    setItems(newItems);
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = noGST ? 0 : items.reduce((s, i) => s + i.qty * i.price * ((i.taxRate || 0) / 100), 0);
  const total = subtotal + tax;

  const handleSave = async () => {
    if (!currentBusiness?.id || !selectedParty?.id || !estimateNumber?.trim() || !estimateDate) {
      await showAlert({ title: 'Missing fields', message: 'Please fill in the party, estimate number and date.', variant: 'warning' });
      return;
    }
    const cleaned = items.filter(i => i.itemId && i.qty > 0 && i.price >= 0).map(i => ({ ...i, taxRate: noGST ? 0 : i.taxRate }));
    if (!cleaned.length) {
      await showAlert({ title: 'No items', message: 'Add at least one item with a valid quantity and price.', variant: 'warning' });
      return;
    }
    if (total <= 0) {
      await showAlert({ title: 'Invalid total', message: 'Total must be greater than zero.', variant: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        businessId: currentBusiness.id,
        partyId: selectedParty.id,
        partyName: selectedParty.name || '',
        date: estimateDate,
        estimateNumber: estimateNumber.trim(),
        items: cleaned,
        description: description || '',
        noGST,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        status: 'Draft'
      };
      if (editId) {
        await addItem('estimates', { ...payload, id: editId });
      } else {
        await addItem('estimates', payload);
      }
      setView('list');
    } catch (e) {
      await showAlert({ title: 'Save failed', message: 'Save failed: ' + (e?.message || e), variant: 'danger' });
    }
    setIsSaving(false);
  };

  const handleEdit = (est) => {
    setEditId(est.id);
    setSelectedParty(parties.find(p => p.id === est.partyId) || null);
    setEstimateDate(est.date || '');
    setEstimateNumber(est.estimateNumber || '');
    setItems(est.items?.length ? est.items.map(i => ({ ...i, total: i.qty * i.price * (1 + (i.taxRate || 0) / 100) })) : [{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
    setDescription(est.description || '');
    setNoGST(!!est.noGST);
    setView('create');
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Estimate', message: 'This estimate will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) await deleteItem('estimates', id);
  };

  const doPrint = (est) => {
    setPrintingTx({ ...est, invoiceNumber: est.estimateNumber, date: est.date });
    setTimeout(() => handlePrint(), 100);
  };

  const previewTx = previewRecord
    ? { ...previewRecord, invoiceNumber: previewRecord.estimateNumber, date: previewRecord.date }
    : null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Hidden print ref */}
      <Box sx={{ position: 'absolute', left: -9999 }}>
        <InvoiceTemplate ref={printRef} transaction={printingTx} business={currentBusiness} paperSize={paperSize} title="Estimate" />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Estimates &amp; Quotes</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setView(view === 'list' ? 'create' : 'list')}>
          {view === 'list' ? 'New Estimate' : 'Back to List'}
        </Button>
      </Box>

      {view === 'list' && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead><TableRow><TableCell>Date</TableCell><TableCell>#</TableCell><TableCell>Customer</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {estimates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((est) => (
                    <TableRow key={est.id}>
                      <TableCell>{est.date}</TableCell>
                      <TableCell>{est.estimateNumber}</TableCell>
                      <TableCell>{est.partyName}</TableCell>
                      <TableCell align="right">₹{est.totalAmount?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" title="Preview" onClick={() => { setPreviewRecord(est); setPreviewOpen(true); }}><Eye size={16} /></IconButton>
                        <IconButton size="small" onClick={() => handleEdit(est)}><Edit2 size={16} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(est.id)}><Trash2 size={16} /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[10, 25, 50]} count={estimates.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
          </CardContent>
        </Card>
      )}

      {view === 'create' && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <PartySelect
                  options={parties}
                  value={selectedParty}
                  onChange={(v) => setSelectedParty(v)}
                  label="Customer"
                  placeholder="Search customer…"
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField fullWidth size="small" label="Estimate #" value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField fullWidth size="small" type="date" label="Date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={1} />
              </Grid>
              <Grid item xs={12}>
                <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Qty</TableCell><TableCell>Price</TableCell><TableCell>Tax %</TableCell><TableCell align="right">Total</TableCell><TableCell></TableCell></TableRow></TableHead>
                  <TableBody>
                    {items.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ItemSelect
                            options={stockItems}
                            value={stockItems.find(i => i.id === row.itemId) || null}
                            onChange={(v) => updateItemRow(idx, 'itemId', typeof v === 'string' ? '' : v?.id || '')}
                            placeholder="Item…"
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell><TextField type="number" size="small" value={row.qty} onChange={(e) => updateItemRow(idx, 'qty', parseFloat(e.target.value) || 0)} inputProps={{ min: 0 }} sx={{ width: 70 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.price} onChange={(e) => updateItemRow(idx, 'price', parseFloat(e.target.value) || 0)} sx={{ width: 90 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.taxRate} onChange={(e) => updateItemRow(idx, 'taxRate', parseFloat(e.target.value) || 0)} sx={{ width: 60 }} /></TableCell>
                        <TableCell align="right">₹{row.total?.toFixed(2)}</TableCell>
                        <TableCell><IconButton size="small" onClick={() => removeItemRow(idx)}><Trash2 size={14} /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></TableContainer>
                <Button size="small" startIcon={<Plus size={14} />} onClick={addItemRow} sx={{ mt: 1 }}>Add line</Button>
              </Grid>
              <Grid item xs={12} sx={{ textAlign: 'right' }}>
                <Typography>Subtotal: ₹{subtotal.toFixed(2)} | Tax: ₹{tax.toFixed(2)} | Total: ₹{total.toFixed(2)}</Typography>
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" sx={{ mr: 1 }} onClick={() => setView('list')}>Cancel</Button>
                  <Button variant="contained" onClick={handleSave} disabled={isSaving}>Save Estimate</Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' } }}>
        {/* Gradient header */}
        <Box sx={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2, flexShrink: 0 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', mt: 0.5, flexShrink: 0 }}>
            <Eye size={18} color="white" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', lineHeight: 1 }}>
              Estimate Preview
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, mt: 0.5, fontSize: '1.05rem', fontFamily: 'monospace' }}>
              {previewRecord?.estimateNumber || '—'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              {previewRecord?.partyName && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.partyName}</Typography>
              )}
              {previewRecord?.date && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.date}</Typography>
              )}
              {previewRecord?.totalAmount != null && (
                <Box sx={{ px: 1.25, py: 0.25, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>₹{previewRecord.totalAmount.toFixed(2)}</Typography>
                </Box>
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
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, bgcolor: '#0f766e', '&:hover': { bgcolor: '#0d9488' } }}>
            Print
          </Button>
        </Box>
        {/* Scrollable preview */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e8eaed', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <Box sx={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}>
            <div style={{ zoom: 0.72 }}>
              <InvoiceTemplate transaction={previewTx} business={currentBusiness} paperSize={paperSize} title="Estimate" />
            </div>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Estimates;
