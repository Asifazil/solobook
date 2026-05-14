import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Card, CardContent, Typography, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, Grid, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, 
  InputAdornment, Chip, MenuItem, TablePagination, Snackbar, Alert, alpha
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, DollarSign, Printer, Share2, Filter, Calendar, FileText, Eye, X } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useFinancialYear } from './FinancialYearContext';
import { useConfig } from './ConfigContext';
import { useDialog } from './DialogContext';
import { useData } from './DataContext';
import { useReactToPrint } from 'react-to-print';
import ExpenseTemplate from './ExpenseTemplate';
import { useRef } from 'react';

const EXPENSE_CATEGORIES = ['Office Supplies', 'Travel', 'Utilities', 'Rent', 'Marketing', 'Equipment', 'Miscellaneous'];

const ExpensesPage = () => {
  const { currentBusiness } = useBusiness();
  const { activeFY } = useFinancialYear();
  const { data, addItem, updateItem, deleteItem, getItems } = useData();
  const { confirm } = useDialog();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category: 'Miscellaneous', amount: 0, date: new Date().toISOString().split('T')[0], description: ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: 'all',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date', // date, amount, category
    sortOrder: 'desc' // asc, desc
  });
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
   


  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { config } = useConfig();
  const [printingData, setPrintingData] = useState(null);
  const [paperSize, setPaperSize] = useState(() => {
    const d = config.defaultPaperSize;
    return ['A4', 'A5', 'Letter', 'Legal'].includes(d) ? d : 'A4';
  });
  const _psInit = useRef(!!config.defaultPaperSize);
  useEffect(() => {
    if (!_psInit.current && config.defaultPaperSize) {
      const d = config.defaultPaperSize;
      if (['A4', 'A5', 'Letter', 'Legal'].includes(d)) setPaperSize(d);
      _psInit.current = true;
    }
  }, [config.defaultPaperSize]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleShare = (row) => {
    const text = `*Expense Voucher from ${currentBusiness?.name || 'Solo Books'}*\n\n` +
      `Amount: ₹${row.amount.toLocaleString()}\n` +
      `Date: ${row.date}\n` +
      `Category: ${row.category}\n` +
      `Description: ${row.description}\n\n` +
      `Shared via Solo Books`;
    
    if (navigator.share) {
      navigator.share({ title: `Expense Voucher`, text }).catch(e => console.error(e));
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const expenses = getItems('expenses')
    .filter(e => e.businessId === currentBusiness?.id)
    .filter(r => !activeFY || !r.date || (r.date >= activeFY.start && r.date <= activeFY.end))
    .reverse();

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || 
                            e.category.toLowerCase().includes(search.toLowerCase());
      
      // Additional filters
      const matchesDateFrom = !filters.dateFrom || new Date(e.date) >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || new Date(e.date) <= new Date(filters.dateTo);
      const matchesCategory = filters.category === 'all' || e.category === filters.category;
      const matchesMinAmount = !filters.minAmount || e.amount >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || e.amount <= parseFloat(filters.maxAmount);
      
      return matchesSearch && matchesDateFrom && matchesDateTo && matchesCategory && matchesMinAmount && matchesMaxAmount;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (filters.sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, filters]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleOpen = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData(expense);
    } else {
      setEditingExpense(null);
      setFormData({ category: 'Miscellaneous', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const showSnackbar = (message, severity = 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate business
    if (!currentBusiness?.id) {
      showSnackbar('Business not selected. Please refresh and try again.', 'error');
      return;
    }

    // Validate required fields
    if (!formData.category || !formData.description || !formData.description.trim()) {
      showSnackbar('Please fill in all required fields', 'warning');
      return;
    }

    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showSnackbar('Please enter a valid amount greater than zero', 'warning');
      return;
    }

    if (!formData.date) {
      showSnackbar('Please select a date', 'warning');
      return;
    }

    try {
      const expenseData = { 
        ...formData, 
        businessId: currentBusiness.id,
        amount: amountNum,
        description: formData.description.trim(),
        date: formData.date
      };
      
      let saved;
      if (editingExpense) {
        saved = await updateItem('expenses', editingExpense.id, expenseData);
      } else {
        saved = await addItem('expenses', expenseData);
      }
      
      if (!saved) {
        // Check if expense was actually saved despite return value
        const savedExpense = getItems('expenses').find(e => 
          e.description === expenseData.description && 
          e.amount === expenseData.amount &&
          e.date === expenseData.date &&
          e.businessId === expenseData.businessId &&
          (!editingExpense || e.id === editingExpense.id)
        );
        
        if (!savedExpense) {
          showSnackbar('Failed to save expense. Please check your connection and try again.', 'error');
          return;
        }
      }
      
      showSnackbar(editingExpense ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
      handleClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      showSnackbar('An error occurred while saving. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    const ok = await confirm({ title: 'Delete Expense', message: 'This expense record will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) { await deleteItem('expenses', id); showSnackbar('Expense deleted successfully!', 'success'); }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <div style={{ display: 'none' }}>
        <ExpenseTemplate ref={printRef} data={printingData} business={currentBusiness} paperSize={paperSize} />
      </div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Expenses</Typography>
          <Typography variant="caption" color="text.secondary">Track and manage expenses</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => handleOpen()}>
            Add Expense
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: '3px solid',
              borderLeftColor: 'error.main',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 16px rgba(15,23,42,0.08)' },
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Total Expenses
                  </Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'error.main', mt: 0.5, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    ₹{totalExpenses.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'rgba(244,67,54,0.1)', color: 'error.main', p: 1.25, borderRadius: 1.5, flexShrink: 0, ml: 1 }}>
                  <DollarSign size={20} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Filter Controls */}
          <Box sx={{ mb: 3 }}>
            <Button 
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {(filters.dateFrom || filters.dateTo || filters.category !== 'all' || filters.minAmount || filters.maxAmount || filters.sortBy !== 'date' || filters.sortOrder !== 'desc') && (
              <Button 
                onClick={() => setFilters({ dateFrom: '', dateTo: '', category: 'all', minAmount: '', maxAmount: '', sortBy: 'date', sortOrder: 'desc' })}
                variant="text"
                size="small"
                color="error"
              >
                Clear Filters
              </Button>
            )}
          </Box>
          
          {showFilters && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  size="small"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min Amount"
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Amount"
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Sort By"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  size="small"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="amount">Amount</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Sort Order"
                  value={filters.sortOrder}
                  onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                  size="small"
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, py: 2 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 2 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 2 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 2 }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, py: 2 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((expense) => (
                  <TableRow key={expense.id} hover>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>
                      <Chip label={expense.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      ₹{expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setPreviewRecord(expense); setPreviewOpen(true); }} color="primary" title="Preview Voucher">
                        <Eye size={16} />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ color: '#25D366' }}
                        onClick={() => handleShare(expense)} 
                        title="Share on WhatsApp"
                      >
                        <Share2 size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpen(expense)} color="primary">
                        <Edit2 size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(expense.id)} color="error">
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: 0.5 }}>
                        <DollarSign size={32} strokeWidth={1.5} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>No expenses found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredExpenses.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Filter size={18} color={alpha('#4f46e5', 0.6)} />
                      </InputAdornment>
                    ),
                  }}
                >
                  {EXPENSE_CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={18} color={alpha('#4f46e5', 0.6)} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FileText size={18} color={alpha('#4f46e5', 0.6)} sx={{ mr: 1, alignSelf: 'flex-start', mt: 1 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save Expense</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' } }}>
        {/* Gradient header */}
        <Box sx={{ background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2, flexShrink: 0 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', mt: 0.5, flexShrink: 0 }}>
            <Eye size={18} color="white" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', lineHeight: 1 }}>
              Expense Preview
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, mt: 0.5, fontSize: '1.05rem' }}>
              {previewRecord?.category || '—'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              {previewRecord?.date && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.date}</Typography>
              )}
              {previewRecord?.description && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{previewRecord.description}</Typography>
              )}
              {previewRecord?.amount != null && (
                <Box sx={{ px: 1.25, py: 0.25, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>₹{previewRecord.amount.toFixed(2)}</Typography>
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
            onClick={() => { setPrintingData(previewRecord); setPreviewOpen(false); setTimeout(() => handlePrint(), 100); }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' } }}>
            Print
          </Button>
        </Box>
        {/* Scrollable preview */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e8eaed', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <Box sx={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}>
            <div style={{ zoom: 0.72 }}>
              <ExpenseTemplate data={previewRecord} business={currentBusiness} paperSize={paperSize} />
            </div>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ExpensesPage;