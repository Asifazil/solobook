import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
  InputAdornment, Chip, IconButton, Snackbar, Alert, Stack
} from '@mui/material';
import { Plus, Edit2, Trash2, Box as BoxIcon, Barcode, Printer, RefreshCw } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useConfig } from './ConfigContext';
import { useReactToPrint } from 'react-to-print';
import DataGrid from './DataGrid';
import JsBarcode from 'jsbarcode';

const UNITES = ['NOS', 'BAGS', 'BOX', 'KGS', 'Ltr', 'Mtr', 'Pcs'];
const TAX_SLABS = [0, 5, 12, 18, 28];

const generateBarcode = () => String(Math.floor(Math.random() * 9e8 + 1e8));

// Inline barcode renderer using jsbarcode
const BarcodeImage = ({ value }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 13,
          margin: 12,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (e) {
        // invalid value — clear the SVG
        svgRef.current.innerHTML = '';
      }
    }
  }, [value]);
  return <svg ref={svgRef} style={{ maxWidth: '100%' }} />;
};

// Print-only barcode card
const BarcodePrintCard = React.forwardRef(({ item }, ref) => (
  <div ref={ref} style={{ padding: 24, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>{item?.name}</p>
    {item?.itemCode && <p style={{ margin: '0 0 6px', fontSize: 11, color: '#333' }}>Code: {item.itemCode}</p>}
    {item?.barcode && <BarcodeImage value={item.barcode} />}
    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>{item?.barcode}</p>
    {(item?.barcodeExtraFields || []).filter(f => f.label || f.value).map((f, i) => (
      <p key={i} style={{ margin: '2px 0', fontSize: 11 }}><strong>{f.label}:</strong> {f.value}</p>
    ))}
  </div>
));
BarcodePrintCard.displayName = 'BarcodePrintCard';

const BarcodeDialog = ({ item, onClose }) => {
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (!item) return null;
  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Item Barcode</DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>{item.name}</Typography>
        {item.barcode ? (
          <>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, display: 'inline-block' }}>
              <BarcodeImage value={item.barcode} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {item.barcode}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No barcode assigned to this item.</Typography>
        )}
        {/* Hidden print target */}
        <div style={{ display: 'none' }}>
          <BarcodePrintCard ref={printRef} item={item} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {item.barcode && (
          <Button variant="contained" startIcon={<Printer size={16} />} onClick={() => handlePrint()}>
            Print
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const ItemsPage = () => {
  const { currentBusiness } = useBusiness();
  const { data, addItem, updateItem, deleteItem, getItems } = useData();
  const { config } = useConfig();
  const barcodeEnabled = !!config.features?.barcode;

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', unit: 'NOS', salePrice: 0, purchasePrice: 0,
    taxRate: 18, hsnCode: '', stock: 0, barcode: '', itemCode: '', barcodeExtraFields: []
  });

  const [filters, setFilters] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const items = getItems('items').filter(item => item.businessId === currentBusiness?.id);

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ barcode: '', itemCode: '', barcodeExtraFields: [], ...item });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', unit: 'NOS', salePrice: 0, purchasePrice: 0,
        taxRate: 18, hsnCode: '', stock: 0, barcode: '', itemCode: '', barcodeExtraFields: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const showSnackbar = (message, severity = 'error') => setSnackbar({ open: true, message, severity });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentBusiness?.id) { showSnackbar('Business not selected.', 'error'); return; }
    if (!formData.name?.trim()) { showSnackbar('Please enter an item name', 'warning'); return; }

    try {
      const itemData = {
        ...formData,
        businessId: currentBusiness.id,
        name: formData.name.trim(),
        salePrice: Number(formData.salePrice) || 0,
        purchasePrice: Number(formData.purchasePrice) || 0,
        taxRate: Number(formData.taxRate) || 0,
        stock: Number(formData.stock) || 0,
        itemCode: formData.itemCode?.trim() || '',
        barcodeExtraFields: formData.barcodeExtraFields || [],
        // Auto-generate barcode if feature is enabled and none provided
        barcode: barcodeEnabled
          ? (formData.barcode?.trim() || generateBarcode())
          : (formData.barcode?.trim() || '')
      };

      if (editingItem) {
        await updateItem('items', editingItem.id, itemData);
      } else {
        await addItem('items', itemData);
      }

      showSnackbar(editingItem ? 'Item updated successfully!' : 'Item added successfully!', 'success');
      handleClose();
    } catch (error) {
      showSnackbar('An error occurred while saving. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) deleteItem('items', id);
  };

  const columns = [
    {
      key: 'name',
      header: 'Item Name',
      width: 250,
      searchable: true,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{row.unit}</Typography>
        </Box>
      )
    },
    {
      key: 'itemCode',
      header: 'Item Code',
      width: 120,
      searchable: true,
      render: (value) => value
        ? <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{value}</Typography>
        : <Typography variant="caption" color="text.disabled">—</Typography>
    },
    {
      key: 'hsnCode',
      header: 'HSN Code',
      width: 120,
      searchable: true,
      render: (value) => value || '-'
    },
    ...(barcodeEnabled ? [{
      key: 'barcode',
      header: 'Barcode',
      width: 140,
      render: (value) => value
        ? <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
        : <Typography variant="caption" color="text.disabled">—</Typography>
    }] : []),
    {
      key: 'salePrice',
      header: 'Sale Price',
      width: 120,
      align: 'right',
      filterType: 'range',
      render: (value) => `₹${value?.toFixed(2) || '0.00'}`
    },
    {
      key: 'taxRate',
      header: 'Tax Rate',
      width: 100,
      align: 'right',
      filterType: 'select',
      filterOptions: TAX_SLABS.map(rate => ({ value: rate.toString(), label: `${rate}%` })),
      render: (value) => `${value || 0}%`
    },
    {
      key: 'stock',
      header: 'Stock',
      width: 120,
      align: 'right',
      filterType: 'range',
      render: (value, row) => (
        <Chip
          label={`${value || 0} ${row.unit}`}
          size="small"
          color={value > 10 ? 'success' : value > 0 ? 'warning' : 'error'}
        />
      )
    },
    {
      key: 'unit',
      header: 'Unit',
      width: 100,
      filterType: 'select',
      filterOptions: UNITES.map(unit => ({ value: unit, label: unit }))
    }
  ];

  const actions = (row) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {barcodeEnabled && (
        <IconButton size="small" color="default" title="View Barcode" onClick={() => setBarcodeItem(row)}>
          <Barcode size={16} />
        </IconButton>
      )}
      <IconButton size="small" color="primary" onClick={() => handleOpen(row)}>
        <Edit2 size={16} />
      </IconButton>
      <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
        <Trash2 size={16} />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Items / Inventory</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => handleOpen()}>
          Add Item
        </Button>
      </Box>

      <DataGrid
        data={items}
        columns={columns}
        title="Items / Inventory"
        searchPlaceholder="Search by name or HSN code..."
        enableSearch={true}
        enableFilters={true}
        enablePagination={true}
        enableSorting={true}
        pageSize={15}
        emptyMessage="No items found. Add your first inventory item."
        actions={actions}
        height={600}
      />

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Item Name" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Item Code" value={formData.itemCode || ''}
                  placeholder="e.g., ITM-001"
                  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                  helperText="Unique identifier for this item"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth select label="Unit" value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                  {UNITES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="HSN Code" value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="number" label="Sale Price" value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="number" label="Purchase Price" value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth select label="Tax Rate (%)" value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}>
                  {TAX_SLABS.map(s => <MenuItem key={s} value={s}>{s}%</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="number" label="Opening Stock" value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
              </Grid>
              {barcodeEnabled && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Barcode" value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Leave blank to auto-generate"
                      helperText="Unique barcode for scanning in sales"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Barcode size={16} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" title="Generate barcode"
                              onClick={() => setFormData(f => ({ ...f, barcode: generateBarcode() }))}>
                              <RefreshCw size={15} />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Extra Barcode Info</Typography>
                    <Typography variant="caption" color="text.secondary">These will print on the barcode label.</Typography>
                    {(formData.barcodeExtraFields || []).map((f, idx) => (
                      <Stack direction="row" spacing={1} key={idx} sx={{ mt: 1 }}>
                        <TextField size="small" label="Label" value={f.label}
                          onChange={e => setFormData(prev => {
                            const fields = [...(prev.barcodeExtraFields || [])];
                            fields[idx] = { ...fields[idx], label: e.target.value };
                            return { ...prev, barcodeExtraFields: fields };
                          })} sx={{ flex: 1 }} />
                        <TextField size="small" label="Value" value={f.value}
                          onChange={e => setFormData(prev => {
                            const fields = [...(prev.barcodeExtraFields || [])];
                            fields[idx] = { ...fields[idx], value: e.target.value };
                            return { ...prev, barcodeExtraFields: fields };
                          })} sx={{ flex: 1 }} />
                        <IconButton size="small" color="error" onClick={() => setFormData(prev => ({
                          ...prev,
                          barcodeExtraFields: (prev.barcodeExtraFields || []).filter((_, i) => i !== idx)
                        }))}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button size="small" startIcon={<Plus size={14} />} sx={{ mt: 1 }}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        barcodeExtraFields: [...(prev.barcodeExtraFields || []), { label: '', value: '' }]
                      }))}>
                      Add Field
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save Item</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Barcode View Dialog */}
      <BarcodeDialog item={barcodeItem} onClose={() => setBarcodeItem(null)} />

      <Snackbar open={snackbar.open} autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}
          variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ItemsPage;
