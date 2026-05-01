import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, TextField, MenuItem, Button,
  Card, CardContent, Stack, Avatar, alpha, useTheme,
  InputAdornment, IconButton, InputBase, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Tabs, Tab,
  Autocomplete, ToggleButton, ToggleButtonGroup, Chip, Tooltip,
} from '@mui/material';
import {
  CheckCircle2, ArrowLeft, Landmark, Banknote,
  CreditCard, User, Search,
  Calendar, FileClock, Wallet, ArrowDownRight, ArrowUpRight, Printer, Share2, Edit2, Trash2
} from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PaymentTemplate from './PaymentTemplate';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const PaymentEntry = ({ mode = 'payment-in' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const { addItem, updateItem, deleteItem, getItems } = useData();

  const [tabValue, setTabValue] = useState(0); // 0: In, 1: Out
  const [formData, setFormData] = useState({
    partyId: '', amount: '', date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash', referenceNo: '', notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [printingData, setPrintingData] = useState(null);
  const [printTrigger, setPrintTrigger] = useState(0);
  const [paperSize, setPaperSize] = useState('A4');
  const printRef = useRef();
  const [editingId, setEditingId] = useState(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    if (!printTrigger) return;
    handlePrint();
  }, [printTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = (row) => {
    const text = `*Payment Receipt from ${currentBusiness?.name || 'Solo Books'}*\n\n` +
      `Amount: ₹${row.totalAmount.toLocaleString()}\n` +
      `Date: ${row.date}\n` +
      `Party: ${row.partyName}\n` +
      `Mode: ${row.paymentMode}\n` +
      `Ref: ${row.referenceNo}\n\n` +
      `Shared via Solo Books`;
    if (navigator.share) {
      navigator.share({ title: `Payment Receipt ${row.referenceNo}`, text }).catch(e => console.error(e));
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const [filters, setFilters] = useState({
    paymentMode: 'all', minAmount: '', maxAmount: '',
    sortBy: 'date', sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isPaymentIn = tabValue === 0;

  const parties = getItems('parties').filter(p => {
    if (p.businessId !== currentBusiness?.id) return false;
    return isPaymentIn ? p.type === 'Customer' : p.type === 'Vendor';
  });

  const transactions = getItems('payments')
    .filter(t => t.businessId === currentBusiness?.id && t.type === (isPaymentIn ? 'PaymentIn' : 'PaymentOut'));

  const accentColor = isPaymentIn ? theme.palette.success.main : theme.palette.warning.main;

  const selectedParty = useMemo(() => parties.find(p => p.id === formData.partyId), [formData.partyId, parties]);

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.partyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = t.date >= dateRange.start && t.date <= dateRange.end;
      const matchesPaymentMode = filters.paymentMode === 'all' || t.paymentMode === filters.paymentMode;
      const matchesMinAmount = !filters.minAmount || t.totalAmount >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || t.totalAmount <= parseFloat(filters.maxAmount);
      return matchesSearch && matchesDate && matchesPaymentMode && matchesMinAmount && matchesMaxAmount;
    }).sort((a, b) => {
      let aValue, bValue;
      switch (filters.sortBy) {
        case 'amount': aValue = a.amount; bValue = b.amount; break;
        case 'party': aValue = a.partyName.toLowerCase(); bValue = b.partyName.toLowerCase(); break;
        default: aValue = new Date(a.date); bValue = new Date(b.date);
      }
      return filters.sortOrder === 'desc' ? (aValue < bValue ? 1 : -1) : (aValue > bValue ? 1 : -1);
    });
  }, [transactions, searchQuery, dateRange, filters]);

  useEffect(() => { setPage(0); }, [searchQuery, dateRange, filters]);

  const handleSave = async () => {
    if (!currentBusiness?.id) { alert('Business not selected. Please refresh and try again.'); return; }
    if (!formData.partyId || !formData.amount) { alert('Please select a party and enter an amount'); return; }
    if (!selectedParty) { alert('Please select a valid party'); return; }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) { alert('Please enter a valid amount greater than zero'); return; }

    try {
      const paymentData = {
        businessId: currentBusiness.id,
        partyId: formData.partyId,
        partyName: selectedParty.name || 'Unknown',
        type: isPaymentIn ? 'PaymentIn' : 'PaymentOut',
        totalAmount: amountNum,
        date: formData.date || new Date().toISOString().split('T')[0],
        paymentMode: formData.paymentMode || 'Cash',
        referenceNo: formData.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
        notes: formData.notes || ''
      };

      if (editingId) {
        const oldPayment = getItems('payments').find(p => p.id === editingId);
        if (!oldPayment) { alert('Payment not found.'); return; }
        const oldParty = parties.find(p => p.id === oldPayment.partyId);
        const newParty = selectedParty;
        const oldAmount = oldPayment.totalAmount || 0;
        const rollbackOld = isPaymentIn ? oldAmount : -oldAmount;
        const applyNew = isPaymentIn ? -amountNum : amountNum;
        if (oldParty) await updateItem('parties', oldPayment.partyId, { balance: (oldParty.balance || 0) + rollbackOld });
        if (newParty && newParty.id !== oldPayment.partyId) {
          await updateItem('parties', formData.partyId, { balance: (newParty.balance || 0) + applyNew });
        } else if (newParty && newParty.id === oldPayment.partyId) {
          await updateItem('parties', formData.partyId, { balance: (newParty.balance || 0) + rollbackOld + applyNew });
        }
        await updateItem('payments', editingId, paymentData);
        setEditingId(null);
        setFormData({ ...formData, amount: '', referenceNo: '', notes: '' });
        return;
      }

      const saved = await addItem('payments', paymentData);
      if (!saved) {
        const savedPayment = getItems('payments').find(p =>
          p.partyId === paymentData.partyId && p.totalAmount === paymentData.totalAmount &&
          p.date === paymentData.date && p.businessId === paymentData.businessId
        );
        if (!savedPayment) { alert('Failed to save payment. Please check your connection and try again.'); return; }
      }
      const newBalance = (selectedParty.balance || 0) + (isPaymentIn ? -amountNum : amountNum);
      await updateItem('parties', formData.partyId, { balance: newBalance });
      setFormData({ ...formData, amount: '', referenceNo: '', notes: '' });
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('An error occurred while saving. Please try again.');
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      partyId: row.partyId,
      amount: String(row.totalAmount ?? ''),
      date: row.date || new Date().toISOString().split('T')[0],
      paymentMode: row.paymentMode || 'Cash',
      referenceNo: row.referenceNo || '',
      notes: row.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      partyId: formData.partyId, amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash', referenceNo: '', notes: ''
    });
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this ${isPaymentIn ? 'Payment In' : 'Payment Out'} of ₹${row.totalAmount?.toLocaleString()} for ${row.partyName}?`)) return;
    try {
      const party = parties.find(p => p.id === row.partyId);
      if (party) {
        const rollback = isPaymentIn ? (row.totalAmount || 0) : -(row.totalAmount || 0);
        await updateItem('parties', row.partyId, { balance: (party.balance || 0) + rollback });
      }
      deleteItem('payments', row.id);
      if (editingId === row.id) {
        setEditingId(null);
        setFormData({ partyId: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash', referenceNo: '', notes: '' });
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment.');
    }
  };

  const paginatedHistory = filteredHistory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Hidden print target */}
      <div style={{ display: 'none' }}>
        <PaymentTemplate ref={printRef} data={printingData} business={currentBusiness} paperSize={paperSize} />
      </div>

      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Tooltip title="Go back">
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{ border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Payments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Record and manage payment receipts and disbursements
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value)}
          sx={{ minWidth: 90 }}
        >
          <MenuItem value="A4">A4</MenuItem>
          <MenuItem value="A5">A5</MenuItem>
          <MenuItem value="Letter">Letter</MenuItem>
          <MenuItem value="Legal">Legal</MenuItem>
        </TextField>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => { setTabValue(v); setFormData(f => ({ ...f, partyId: '' })); }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ArrowDownRight size={15} />
                <span>Payment In (Received)</span>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ArrowUpRight size={15} />
                <span>Payment Out (Paid)</span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Entry form card */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderTop: '3px solid',
          borderTopColor: accentColor,
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {editingId ? 'Edit Payment' : `New ${isPaymentIn ? 'Payment In' : 'Payment Out'}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isPaymentIn ? 'Record money received from a customer' : 'Record money paid to a vendor'}
            </Typography>
          </Box>
          {editingId && (
            <Chip
              label="Editing"
              size="small"
              color={isPaymentIn ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        </Box>

        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Party autocomplete */}
            <Grid item xs={12} sm={4} lg={3}>
              <Autocomplete
                fullWidth
                options={parties}
                getOptionLabel={(option) => option.name || ''}
                value={parties.find(p => p.id === formData.partyId) || null}
                onChange={(_, v) => setFormData({ ...formData, partyId: v?.id || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={isPaymentIn ? 'Customer *' : 'Vendor *'}
                    placeholder="Search and select…"
                  />
                )}
              />
            </Grid>

            {/* Amount */}
            <Grid item xs={6} sm={4} lg={3}>
              <TextField
                fullWidth
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                onFocus={(e) => e.target.select()}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    min: 0, step: 0.01,
                  }
                }}
              />
            </Grid>

            {/* Date */}
            <Grid item xs={6} sm={4} lg={2}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Payment method toggle */}
            <Grid item xs={12} sm={6} lg={2}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.75, fontWeight: 600, lineHeight: 1 }}
                >
                  Method
                </Typography>
                <ToggleButtonGroup
                  value={formData.paymentMode}
                  exclusive
                  onChange={(_, v) => v && setFormData({ ...formData, paymentMode: v })}
                  size="small"
                  sx={{ width: '100%' }}
                >
                  <ToggleButton value="Cash" sx={{ flex: 1, gap: 0.5, py: 1 }}>
                    <Banknote size={14} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Cash</Box>
                  </ToggleButton>
                  <ToggleButton value="Bank" sx={{ flex: 1, gap: 0.5, py: 1 }}>
                    <Landmark size={14} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Bank</Box>
                  </ToggleButton>
                  <ToggleButton value="UPI" sx={{ flex: 1, gap: 0.5, py: 1 }}>
                    <CreditCard size={14} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>UPI</Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>

            {/* Save button */}
            <Grid item xs={12} sm={6} lg={2}>
              {editingId ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={!formData.partyId || !formData.amount}
                    startIcon={<CheckCircle2 size={18} />}
                    sx={{
                      fontWeight: 700,
                      bgcolor: accentColor,
                      '&:hover': { bgcolor: accentColor, filter: 'brightness(0.9)' },
                    }}
                  >
                    Update
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={cancelEdit}
                    sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 1.5 }}
                  >
                    Cancel
                  </Button>
                </Stack>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSave}
                  disabled={!formData.partyId || !formData.amount}
                  startIcon={<CheckCircle2 size={18} />}
                  sx={{
                    fontWeight: 700,
                    bgcolor: accentColor,
                    '&:hover': { bgcolor: accentColor, filter: 'brightness(0.9)' },
                  }}
                >
                  {isPaymentIn ? 'Record Receipt' : 'Record Payment'}
                </Button>
              )}
            </Grid>

            {/* Reference */}
            <Grid item xs={12} sm={5} md={4} lg={4}>
              <TextField
                fullWidth
                label="Reference No."
                placeholder="e.g. TXN12345"
                size="small"
                value={formData.referenceNo}
                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12} sm={7} md={8} lg={8}>
              <TextField
                fullWidth
                label="Notes"
                placeholder="Optional notes about this payment"
                size="small"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                maxRows={2}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* History + Ledger */}
      <Grid container spacing={2.5}>
        {/* Payment history table */}
        <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {/* Table toolbar */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 140,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Search size={14} color={theme.palette.text.disabled} />
                <InputBase
                  sx={{ ml: 1, flex: 1, fontSize: '0.8125rem' }}
                  placeholder="Search vouchers…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Paper>
              <TextField
                type="date"
                size="small"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                sx={{ width: 142 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="date"
                size="small"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                sx={{ width: 142 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outlined"
                size="small"
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {showFilters ? 'Hide' : 'Filters'}
              </Button>
            </Box>

            {/* Extra filters */}
            {showFilters && (
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <TextField select fullWidth label="Mode" size="small"
                      value={filters.paymentMode} onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank">Bank</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="UPI">UPI</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="Min ₹" type="number" size="small"
                      value={filters.minAmount} onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="Max ₹" type="number" size="small"
                      value={filters.maxAmount} onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField select fullWidth label="Sort By" size="small"
                      value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
                      <MenuItem value="date">Date</MenuItem>
                      <MenuItem value="amount">Amount</MenuItem>
                      <MenuItem value="party">Party</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Table */}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Party</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Reference</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Mode</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedHistory.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.partyName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                        {row.referenceNo || '—'}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Chip label={row.paymentMode} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: accentColor, whiteSpace: 'nowrap' }}>
                        ₹{row.totalAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => startEdit(row)}>
                              <Edit2 size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print receipt">
                            <IconButton size="small" onClick={() => { setPrintingData(row); setPrintTrigger(t => t + 1); }}>
                              <Printer size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share">
                            <IconButton size="small" sx={{ color: '#25D366' }} onClick={() => handleShare(row)}>
                              <Share2 size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center' }}>
                        <FileClock size={32} color={theme.palette.text.disabled} style={{ marginBottom: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          No payment records found
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          Try adjusting the date range or search term
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredHistory.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />
          </Card>
        </Grid>

        {/* Party ledger balance */}
        <Grid item xs={12} lg={4}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: selectedParty ? alpha(accentColor, 0.3) : 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
            }}
          >
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {isPaymentIn ? 'Customer' : 'Vendor'} Balance
              </Typography>
            </Box>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              {selectedParty ? (
                <>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      color: accentColor,
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 1.5,
                      fontSize: '1.375rem',
                      fontWeight: 800,
                    }}
                  >
                    {selectedParty.name?.[0]?.toUpperCase() || 'P'}
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {selectedParty.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Current ledger balance
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      color: (selectedParty.balance || 0) >= 0 ? 'success.main' : 'error.main',
                      mb: 1,
                    }}
                  >
                    ₹{Math.abs(selectedParty.balance || 0).toLocaleString()}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.625,
                      borderRadius: 100,
                      bgcolor: (selectedParty.balance || 0) >= 0
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.error.main, 0.1),
                      color: (selectedParty.balance || 0) >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {(selectedParty.balance || 0) >= 0
                      ? <ArrowDownRight size={14} />
                      : <ArrowUpRight size={14} />}
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {(selectedParty.balance || 0) >= 0 ? 'Amount to receive' : 'Amount to pay'}
                    </Typography>
                  </Box>

                  {/* After-payment preview */}
                  {formData.amount && Number(formData.amount) > 0 && (
                    <Box
                      sx={{
                        mt: 2.5,
                        pt: 2,
                        borderTop: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Balance after this payment
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: 'text.primary',
                        }}
                      >
                        ₹{Math.abs(
                          (selectedParty.balance || 0) + (isPaymentIn ? -Number(formData.amount) : Number(formData.amount))
                        ).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ py: 3 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'action.hover',
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    <User size={26} color={theme.palette.text.disabled} />
                  </Avatar>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Select a {isPaymentIn ? 'customer' : 'vendor'} to view balance
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PaymentEntry;
