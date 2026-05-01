import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Autocomplete, TablePagination
} from '@mui/material';
import { Plus, Trash2, Printer, ChevronLeft, Edit2 } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useReactToPrint } from 'react-to-print';
import InvoiceTemplate from './InvoiceTemplate';

const CreditNotes = () => {
  const { currentBusiness } = useBusiness();
  const { addItem, deleteItem, getItems } = useData();
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteNumber, setNoteNumber] = useState('');
  const [items, setItems] = useState([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
  const [reason, setReason] = useState('');
  const [noGST, setNoGST] = useState(false);
  const [printingTx, setPrintingTx] = useState(null);
  const [paperSize, setPaperSize] = useState('A4');
  const [isSaving, setIsSaving] = useState(false);
  const printRef = React.useRef();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id && p.type === 'Customer');
  const stockItems = getItems('items').filter(i => i.businessId === currentBusiness?.id);
  const creditNotes = getItems('creditNotes').filter(c => c.businessId === currentBusiness?.id).reverse();

  useEffect(() => {
    if (view === 'create' && !isSaving) {
      setNoteNumber(`CN-${Date.now().toString().slice(-6)}`);
      setItems([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
      setSelectedParty(null);
      setNoteDate(new Date().toISOString().split('T')[0]);
      setReason('');
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

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = noGST ? 0 : items.reduce((s, i) => s + i.qty * i.price * ((i.taxRate || 0) / 100), 0);
  const total = subtotal + tax;

  const handleSave = async () => {
    if (!currentBusiness?.id || !selectedParty?.id || !noteNumber?.trim() || !noteDate) {
      alert('Please fill customer, credit note number and date.');
      return;
    }
    const cleaned = items.filter(i => i.itemId && i.qty > 0 && i.price >= 0).map(i => ({ ...i, taxRate: noGST ? 0 : i.taxRate }));
    if (!cleaned.length) { alert('Add at least one item.'); return; }
    if (total <= 0) { alert('Total must be greater than zero.'); return; }
    setIsSaving(true);
    try {
      const payload = {
        businessId: currentBusiness.id,
        partyId: selectedParty.id,
        partyName: selectedParty.name || '',
        date: noteDate,
        noteNumber: noteNumber.trim(),
        items: cleaned,
        reason: reason || '',
        noGST,
        subtotal,
        taxAmount: tax,
        totalAmount: total
      };
      if (editId) await addItem('creditNotes', { ...payload, id: editId });
      else await addItem('creditNotes', payload);
      setView('list');
    } catch (e) { alert('Save failed: ' + (e?.message || e)); }
    setIsSaving(false);
  };

  const handleEdit = (cn) => {
    setEditId(cn.id);
    setSelectedParty(parties.find(p => p.id === cn.partyId) || null);
    setNoteDate(cn.date || '');
    setNoteNumber(cn.noteNumber || '');
    setItems(cn.items?.length ? cn.items.map(i => ({ ...i, total: i.qty * i.price * (1 + (i.taxRate || 0) / 100) })) : [{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, total: 0 }]);
    setReason(cn.reason || '');
    setNoGST(!!cn.noGST);
    setView('create');
  };

  const handleDelete = async (id) => { if (window.confirm('Delete this credit note?')) await deleteItem('creditNotes', id); };
  const doPrint = (cn) => {
    setPrintingTx({ ...cn, invoiceNumber: cn.noteNumber, date: cn.date });
    setTimeout(() => handlePrint(), 100);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Credit Notes</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setView(view === 'list' ? 'create' : 'list')}>{view === 'list' ? 'New Credit Note' : 'Back to List'}</Button>
      </Box>

      {view === 'list' && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead><TableRow><TableCell>Date</TableCell><TableCell>#</TableCell><TableCell>Customer</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {creditNotes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell>{cn.date}</TableCell><TableCell>{cn.noteNumber}</TableCell><TableCell>{cn.partyName}</TableCell>
                      <TableCell align="right">₹{cn.totalAmount?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => doPrint(cn)}><Printer size={16} /></IconButton>
                        <IconButton size="small" onClick={() => handleEdit(cn)}><Edit2 size={16} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(cn.id)}><Trash2 size={16} /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[10, 25, 50]} count={creditNotes.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
          </CardContent>
        </Card>
      )}

      {view === 'create' && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete size="small" options={parties} getOptionLabel={(o) => o.name || ''} value={selectedParty} onChange={(_, v) => setSelectedParty(v)} renderInput={(params) => <TextField {...params} label="Customer" />} />
              </Grid>
              <Grid item xs={6} sm={3} md={2}><TextField fullWidth size="small" label="Credit Note #" value={noteNumber} onChange={(e) => setNoteNumber(e.target.value)} /></Grid>
              <Grid item xs={6} sm={3} md={2}><TextField fullWidth size="small" type="date" label="Date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Grid>
              <Grid item xs={12}>
                <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Qty</TableCell><TableCell>Price</TableCell><TableCell>Tax %</TableCell><TableCell align="right">Total</TableCell><TableCell></TableCell></TableRow></TableHead>
                  <TableBody>
                    {items.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Autocomplete size="small" options={stockItems} getOptionLabel={(o) => o.name || ''} value={stockItems.find(i => i.id === row.itemId) || null} onChange={(_, v) => updateItemRow(idx, 'itemId', v?.id || '')} renderInput={(params) => <TextField {...params} />} sx={{ minWidth: 200 }} /></TableCell>
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
                <Box sx={{ mt: 2 }}><Button variant="outlined" sx={{ mr: 1 }} onClick={() => setView('list')}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={isSaving}>Save Credit Note</Button></Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {printingTx && (
        <Box sx={{ position: 'absolute', left: -9999 }}>
          <InvoiceTemplate ref={printRef} transaction={printingTx} business={currentBusiness} paperSize={paperSize} title="Credit Note" />
        </Box>
      )}
    </Box>
  );
};

export default CreditNotes;
