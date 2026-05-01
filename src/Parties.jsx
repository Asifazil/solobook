import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Tabs, Tab, Chip, InputAdornment, MenuItem, Autocomplete, TablePagination,
  Snackbar, Alert
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';

const PartiesPage = () => {
  const { currentBusiness } = useBusiness();
  const { data, addItem, updateItem, deleteItem, getItems } = useData();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'Customer', phone: '', gstNumber: '', address: '', balance: 0
  });

  // Filter states
  const [filters, setFilters] = useState({
    balanceMin: '',
    balanceMax: '',
    hasGST: 'all', // all, yes, no
    sortBy: 'name', // name, balance, phone
    sortOrder: 'asc' // asc, desc
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id);

  // Similar name suggestions while typing party name
  const similarParties = useMemo(() => {
    const name = formData.name.trim();
    if (name.length < 2) return [];
    const lower = name.toLowerCase();
    return parties
      .filter(p => !editingParty || p.id !== editingParty.id)
      .filter(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()))
      .slice(0, 4);
  }, [formData.name, parties, editingParty]);

  const filteredParties = parties
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.phone.includes(search);
      const matchesTab = tab === 0 ? p.type === 'Customer' : p.type === 'Vendor';
      
      // Additional filters
      const matchesBalanceMin = !filters.balanceMin || p.balance >= parseFloat(filters.balanceMin);
      const matchesBalanceMax = !filters.balanceMax || p.balance <= parseFloat(filters.balanceMax);
      const matchesGST = filters.hasGST === 'all' || 
                        (filters.hasGST === 'yes' && p.gstNumber) || 
                        (filters.hasGST === 'no' && !p.gstNumber);
      
      return matchesSearch && matchesTab && matchesBalanceMin && matchesBalanceMax && matchesGST;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (filters.sortBy) {
        case 'balance':
          aValue = a.balance;
          bValue = b.balance;
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, tab, filters]);

  const handleOpen = (party = null) => {
    if (party) {
      setEditingParty(party);
      setFormData(party);
    } else {
      setEditingParty(null);
      setFormData({ name: '', type: tab === 0 ? 'Customer' : 'Vendor', phone: '', gstNumber: '', address: '', balance: 0 });
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
    if (!formData.name || formData.name.trim() === '') {
      showSnackbar('Please enter a party name', 'warning');
      return;
    }

    try {
      const partyData = { 
        ...formData, 
        businessId: currentBusiness.id,
        name: formData.name.trim(),
        balance: Number(formData.balance) || 0
      };
      
      let saved;
      if (editingParty) {
        saved = await updateItem('parties', editingParty.id, partyData);
      } else {
        saved = await addItem('parties', partyData);
      }
      
      if (!saved) {
        // Check if item was actually saved despite return value
        const savedParty = getItems('parties').find(p => 
          p.name === partyData.name && 
          p.businessId === partyData.businessId &&
          (!editingParty || p.id === editingParty.id)
        );
        
        if (!savedParty) {
          showSnackbar('Failed to save party. Please check your connection and try again.', 'error');
          return;
        }
      }
      
      showSnackbar(editingParty ? 'Party updated successfully!' : 'Party added successfully!', 'success');
      handleClose();
    } catch (error) {
      console.error('Error saving party:', error);
      showSnackbar('An error occurred while saving. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const party = parties.find(p => p.id === id);
    if (party && window.confirm(`Are you sure you want to delete "${party.name}"?`)) {
      await deleteItem('parties', id);
      showSnackbar('Party deleted successfully!', 'success');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Parties</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Manage customers and vendors</Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => handleOpen()}>
          Add Party
        </Button>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ minHeight: 40 }}><Tab label="Customers" /><Tab label="Vendors" /></Tabs>
        </Box>
        <CardContent sx={{ pt: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search size={16} /></InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Button 
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {(filters.balanceMin || filters.balanceMax || filters.hasGST !== 'all' || filters.sortBy !== 'name' || filters.sortOrder !== 'asc') && (
              <Button 
                onClick={() => setFilters({ balanceMin: '', balanceMax: '', hasGST: 'all', sortBy: 'name', sortOrder: 'asc' })}
                variant="text"
                size="small"
                color="error"
              >
                Clear Filters
              </Button>
            )}
          </Box>
          
          {showFilters && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min Balance"
                  type="number"
                  value={filters.balanceMin}
                  onChange={(e) => setFilters({...filters, balanceMin: e.target.value})}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Balance"
                  type="number"
                  value={filters.balanceMax}
                  onChange={(e) => setFilters({...filters, balanceMax: e.target.value})}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="GST Status"
                  value={filters.hasGST}
                  onChange={(e) => setFilters({...filters, hasGST: e.target.value})}
                  size="small"
                >
                  <MenuItem value="all">All Parties</MenuItem>
                  <MenuItem value="yes">Has GST</MenuItem>
                  <MenuItem value="no">No GST</MenuItem>
                </TextField>
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
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="balance">Balance</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
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
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>GSTIN</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParties
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((party) => (
                  <TableRow key={party.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{party.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{party.address}</Typography>
                    </TableCell>
                    <TableCell>{party.phone}</TableCell>
                    <TableCell>{party.gstNumber || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`₹${Math.abs(party.balance).toFixed(2)}`} 
                        size="small"
                        color={party.balance >= 0 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(party)} color="primary">
                        <Edit2 size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(party.id)} color="error">
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredParties.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: 0.5 }}>
                        <Users size={32} strokeWidth={1.5} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>No parties found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

            <TablePagination
              component="div"
              count={filteredParties.length}
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
          <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Party Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
                {similarParties.length > 0 && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{ mt: 1, py: 0.5 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Similar {formData.type === 'Customer' ? 'customers' : 'vendors'} already exist — make sure you're not creating a duplicate:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {similarParties.map(p => (
                        <Chip
                          key={p.id}
                          label={`${p.name}${p.phone ? ` · ${p.phone}` : ''}`}
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => { handleClose(); handleOpen(p); }}
                          title="Click to edit this party instead"
                        />
                      ))}
                    </Box>
                  </Alert>
                )}
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="GSTIN (Optional)"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Opening Balance"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Negative for you owe them, positive for they owe you"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save Party</Button>
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
    </Box>
  );
};

export default PartiesPage;
