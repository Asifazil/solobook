import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
  InputAdornment, Chip, IconButton, Snackbar, Alert, Stack,
  alpha, useTheme
} from '@mui/material';
import { Plus, Edit2, Trash2, Box as BoxIcon, Barcode, Printer, RefreshCw, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useConfig } from './ConfigContext';
import { useDialog } from './DialogContext';
import { useAuth } from './AuthContext';
import { useReactToPrint } from 'react-to-print';
import DataGrid from './DataGrid';
import JsBarcode from 'jsbarcode';

const DEFAULT_UNITS = ['NOS', 'BAGS', 'BOX', 'KGS', 'Ltr', 'Mtr', 'Pcs'];
const TAX_SLABS = [0, 5, 12, 18, 28];

const generateBarcode = () => String(Math.floor(Math.random() * 9e8 + 1e8));

// Inline barcode renderer using jsbarcode
const BarcodeImage = ({ value, height = 70, fontSize = 13 }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.5,
          height,
          displayValue: true,
          fontSize,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (e) {
        svgRef.current.innerHTML = '';
      }
    }
  }, [value, height, fontSize]);
  return <svg ref={svgRef} style={{ maxWidth: '100%' }} />;
};

const LABEL_SIZES = [
  { key: 'standard', label: 'Standard (80×40mm)', width: '80mm', height: '40mm', barcodeHeight: 40, fontSize: 10, smallFontSize: 8 },
  { key: 'small',    label: 'Small (58×30mm)',    width: '58mm', height: '30mm', barcodeHeight: 28, fontSize: 9,  smallFontSize: 7.5 },
  { key: 'large',    label: 'Large (100×60mm)',   width: '100mm', height: '60mm', barcodeHeight: 58, fontSize: 12, smallFontSize: 10 },
  { key: 'a4',       label: 'A4 Full Page',       width: '210mm', height: null,   barcodeHeight: 70, fontSize: 13, smallFontSize: 11 },
];

// Single barcode label card for a given size config
const BarcodeLabel = ({ item, sizeConfig }) => {
  const { width, height, barcodeHeight, fontSize, smallFontSize } = sizeConfig;
  return (
    <div style={{
      width, height: height || 'auto',
      padding: sizeConfig.key === 'a4' ? '20px 24px' : '4px 6px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      border: sizeConfig.key === 'a4' ? 'none' : '0.5px solid #ccc',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize, lineHeight: 1.2 }}>{item?.name}</p>
      {item?.itemCode && <p style={{ margin: '0 0 2px', fontSize: smallFontSize, color: '#333' }}>{item.itemCode}</p>}
      {item?.barcode && (
        <BarcodeImage
          value={item.barcode}
          height={barcodeHeight}
          fontSize={smallFontSize}
        />
      )}
      <p style={{ margin: '2px 0 0', fontSize: smallFontSize, color: '#555' }}>{item?.barcode}</p>
      {(item?.barcodeExtraFields || []).filter(f => f.label || f.value).map((f, i) => (
        <p key={i} style={{ margin: '1px 0', fontSize: smallFontSize }}><strong>{f.label}:</strong> {f.value}</p>
      ))}
    </div>
  );
};

// Print sheet — multiple copies arranged for the selected size
const BarcodePrintSheet = React.forwardRef(({ item, copies, sizeConfig }, ref) => {
  const isA4 = sizeConfig.key === 'a4';
  const cols = isA4 ? 1 : sizeConfig.key === 'standard' ? 2 : sizeConfig.key === 'small' ? 3 : 2;
  return (
    <div ref={ref} style={{
      padding: isA4 ? 16 : 8,
      backgroundColor: '#fff',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexWrap: 'wrap',
      gap: isA4 ? 8 : 4,
      justifyContent: isA4 ? 'flex-start' : 'flex-start',
      width: isA4 ? '210mm' : undefined,
    }}>
      {Array.from({ length: copies }).map((_, i) => (
        <BarcodeLabel key={i} item={item} sizeConfig={sizeConfig} />
      ))}
    </div>
  );
});
BarcodePrintSheet.displayName = 'BarcodePrintSheet';

const BarcodeDialog = ({ item, onClose }) => {
  const theme = useTheme();
  const printRef = useRef(null);
  const [labelSizeKey, setLabelSizeKey] = useState('standard');
  const [copies, setCopies] = useState(1);
  const sizeConfig = LABEL_SIZES.find(s => s.key === labelSizeKey) || LABEL_SIZES[0];
  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (!item) return null;
  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Item Barcode</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        {/* Preview */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>{item.name}</Typography>
          {item.barcode ? (
            <>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, display: 'inline-block' }}>
                <BarcodeImage value={item.barcode} height={60} fontSize={11} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {item.barcode}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No barcode assigned to this item.</Typography>
          )}
        </Box>

        {item.barcode && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            {/* Label size */}
            <TextField
              select
              label="Label Size"
              size="small"
              value={labelSizeKey}
              onChange={e => setLabelSizeKey(e.target.value)}
              sx={{ flex: 2, minWidth: 160 }}
            >
              {LABEL_SIZES.map(s => (
                <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
              ))}
            </TextField>
            {/* Copies */}
            <TextField
              label="Copies"
              type="number"
              size="small"
              value={copies}
              onChange={e => setCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 50 }}
              sx={{ flex: 1, minWidth: 80 }}
            />
          </Box>
        )}

        {/* Hidden print target */}
        <div style={{ display: 'none' }}>
          <BarcodePrintSheet ref={printRef} item={item} copies={copies} sizeConfig={sizeConfig} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {item.barcode && (
          <Button variant="contained" startIcon={<Printer size={16} />} onClick={() => handlePrint()}>
            Print {copies > 1 ? `(${copies} copies)` : ''}
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
  const { confirm } = useDialog();
  const { staffSession } = useAuth();
  const canViewPurchasePrice = !staffSession || !!staffSession.features?.viewPurchasePrice;
  const barcodeEnabled = !!config.features?.barcode;
  const UNITES = config.itemUnits?.length ? config.itemUnits : DEFAULT_UNITS;
  const defaultUnit = UNITES[0] || 'NOS';

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', unit: defaultUnit, salePrice: 0, purchasePrice: 0,
    taxRate: 18, hsnCode: '', stock: 0, barcode: '', itemCode: '', barcodeExtraFields: [],
    batchNo: '', expiryDate: ''
  });

  const theme = useTheme();
  const [filters, setFilters] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const items = getItems('items').filter(item => item.businessId === currentBusiness?.id);
  const totalStockValue = items.reduce((s, i) => s + (i.stock || 0) * (i.salePrice || 0), 0);
  const lowStockItems = items.filter(i => (i.stock || 0) <= 5).length;

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ barcode: '', itemCode: '', barcodeExtraFields: [], ...item });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', unit: defaultUnit, salePrice: 0, purchasePrice: 0,
        taxRate: 18, hsnCode: '', stock: 0, barcode: '', itemCode: '', barcodeExtraFields: [],
        batchNo: '', expiryDate: ''
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
    const ok = await confirm({ title: 'Delete Item', message: 'This item will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteItem('items', id);
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
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      width: 130,
      render: (value) => {
        if (!value) return <Typography variant="caption" color="text.disabled">—</Typography>;
        const days = Math.ceil((new Date(value) - new Date()) / 86400000);
        const color = days < 0 ? 'error' : days <= 30 ? 'warning' : 'default';
        return <Chip label={value} size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
      }
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
      {/* Hero Header */}
      <Box sx={{
        borderRadius: 3,
        background: 'linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)',
        p: { xs: 2.5, md: 3.5 }, mb: 3,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -30, right: 100, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, position: 'relative' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                <Package size={20} color="white" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>Items & Inventory</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', pl: 0.5 }}>Track your products and stock levels</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => handleOpen()}
            sx={{ bgcolor: 'white', color: '#b45309', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }, borderRadius: 2, textTransform: 'none', flexShrink: 0 }}>
            Add Item
          </Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, position: 'relative' }}>
          {[
            { label: 'Total Items', value: items.length, icon: Package, color: '#fde68a' },
            { label: 'Stock Value', value: `₹${totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: '#6ee7b7' },
            { label: 'Low Stock', value: lowStockItems, icon: AlertTriangle, color: lowStockItems > 0 ? '#fca5a5' : '#a3e635' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Box key={label} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <Icon size={14} color={color} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
              </Box>
              <Typography sx={{ color: 'white', fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>{value}</Typography>
            </Box>
          ))}
        </Box>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Item Name" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Item Code" value={formData.itemCode || ''}
                  placeholder="e.g., ITM-001"
                  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                  helperText="Unique identifier for this item"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth select label="Unit" value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                  {UNITES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="HSN Code" value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth type="number" label="Sale Price" value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth type="number" label="Purchase Price" value={formData.purchasePrice}
                  onChange={(e) => canViewPurchasePrice && setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    readOnly: !canViewPurchasePrice,
                  }}
                  inputProps={!canViewPurchasePrice ? { style: { filter: 'blur(6px)', userSelect: 'none' } } : undefined}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth select label="Tax Rate (%)" value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}>
                  {TAX_SLABS.map(s => <MenuItem key={s} value={s}>{s}%</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth type="number" label="Opening Stock" value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Batch / Lot No." value={formData.batchNo || ''}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder="e.g. BT2024-001" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth type="date" label="Expiry Date" value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              {barcodeEnabled && (
                <>
                  <Grid size={{ xs: 12 }}>
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
                  <Grid size={{ xs: 12 }}>
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
