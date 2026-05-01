import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, MenuItem, Divider, Autocomplete, InputAdornment, Chip,
  TablePagination, FormControlLabel, Switch, alpha, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Checkbox,
  Snackbar, Alert, Tooltip, useTheme
} from '@mui/material';
import { Plus, Trash2, Printer, Save, ChevronLeft, Receipt, ShoppingBasket, Edit, Share2, Calendar, User, Package, Users, Wallet, CheckCircle2, ScanLine, Search } from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useConfig } from './ConfigContext';
import { useReactToPrint } from 'react-to-print';
import { useLocation } from 'react-router-dom';
import InvoiceTemplate from './InvoiceTemplate';
import BarcodeScanner from './BarcodeScanner';

const SalesPage = ({ mode = 'sales' }) => {
  const isSale = mode === 'sales';
  const { currentBusiness } = useBusiness();
  const { data, addItem, updateItem, deleteItem, getItems } = useData();
  const { config } = useConfig();
  const location = useLocation();
  const barcodeScanEnabled = !!config.features?.barcode;

  const [view, setView] = useState('list'); // 'list' or 'create' or 'edit'
  const [editId, setEditId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([{ itemId: '', name: '', qty: 1, price: 0, taxRate: 0, discountPercent: 0, total: 0 }]);
  const [description, setDescription] = useState('');
  const [noGST, setNoGST] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [printingTx, setPrintingTx] = useState(null);
  const [printTrigger, setPrintTrigger] = useState(0);
  const [paperSize, setPaperSize] = useState('A4');
  const printRef = useRef();
  const bulkPrintRef = useRef();

  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [bulkPrintDateFrom, setBulkPrintDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [bulkPrintDateTo, setBulkPrintDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  // Selected bill ids for bulk print (subset to actually print)
  const [bulkPrintSelectedIds, setBulkPrintSelectedIds] = useState(() => new Set());

  const [advance, setAdvance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [taxMode, setTaxMode] = useState('exclusive');

  // Product-First mode state
  const [pfProduct, setPfProduct] = useState(null);
  const [pfDate, setPfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pfNoGST, setPfNoGST] = useState(false);
  const [pfCustomers, setPfCustomers] = useState([{ _key: 1, party: null, qty: 1, price: '', discountPercent: '' }]);
  const [pfIsSaving, setPfIsSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Quick-add inline dialogs
  const [quickAddParty, setQuickAddParty] = useState({ open: false, name: '', phone: '', balance: '' });
  const [quickAddPartyLoading, setQuickAddPartyLoading] = useState(false);
  const quickAddPartyCallbackRef = useRef(null);
  const [quickAddItem, setQuickAddItem] = useState({ open: false, name: '', salePrice: '', purchasePrice: '', taxRate: 18, stock: '', unit: 'NOS' });
  const [quickAddItemLoading, setQuickAddItemLoading] = useState(false);
  const quickAddItemCallbackRef = useRef(null);

  // NEW: ref to prevent multiple saves
  const savingRef = useRef(false);

  // Handle barcode scan navigation from global scan button in Layout
  useEffect(() => {
    if (!location.state?.scannedBarcode) return;
    const { scannedBarcode, scannedItem } = location.state;
    // Clear state immediately to prevent re-triggering on re-renders
    window.history.replaceState({}, document.title);

    const found = scannedItem || (() => {
      const allItems = getItems('items').filter(i => i.businessId === currentBusiness?.id);
      return allItems.find(i => i.barcode === scannedBarcode || i.id === scannedBarcode);
    })();

    if (found) {
      const price = Number(isSale ? found.salePrice : found.purchasePrice) || 0;
      const taxRate = Number(found.taxRate) || 0;
      setView('create');
      setEditId(null);
      setSelectedParty(null);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setItems([{
        itemId: found.id, name: found.name,
        qty: 1, price, taxRate, discountPercent: 0,
        total: price * (1 + taxRate / 100)
      }]);
      setSnack({ open: true, message: `${found.name} added from scan`, severity: 'success' });
    } else {
      setSnack({ open: true, message: `No item found for barcode: ${scannedBarcode}`, severity: 'warning' });
    }
  }, [location.state]);

  // Barcode scanner (inline within Sales)
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleBarcodeScan = (barcode) => {
    const stockItems = getItems('items').filter(i => i.businessId === currentBusiness?.id);
    const foundItem = stockItems.find(i => i.barcode === barcode || i.id === barcode);
    if (!foundItem) {
      setSnack({ open: true, message: `No item found for barcode: ${barcode}`, severity: 'warning' });
      return;
    }
    const emptyIdx = items.findIndex(i => !i.itemId);
    if (emptyIdx >= 0) {
      updateItemRow(emptyIdx, 'itemId', foundItem.id);
    } else {
      const price = Number(foundItem[isSale ? 'salePrice' : 'purchasePrice']) || 0;
      const taxRate = Number(foundItem.taxRate) || 0;
      setItems(prev => [...prev, {
        itemId: foundItem.id, name: foundItem.name,
        qty: 1, price, taxRate, discountPercent: 0,
        total: price * (1 + taxRate / 100)
      }]);
    }
    setSnack({ open: true, message: `Added: ${foundItem.name}`, severity: 'success' });
  };

  // Format date string YYYY-MM-DD → DD/MM/YYYY for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    partyId: '',
    minAmount: '',
    maxAmount: '',
    status: 'all', // all, completed
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [entryMode, setEntryMode] = useState('customer'); // 'customer' | 'product' — sales only

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });
  const handleBulkPrint = useReactToPrint({
    contentRef: bulkPrintRef,
    copyStyles: true,
  });

  // Queries
  const parties = getItems('parties').filter(
    p =>
      p.businessId === currentBusiness?.id &&
      p.type === (isSale ? 'Customer' : 'Vendor')
  );

  const stockItems = getItems('items').filter(
    item => item.businessId === currentBusiness?.id
  );

  // Invoice number generator
  const generateInvoiceNumber = (date, isSaleMode) => {
    const d = date ? new Date(date + 'T12:00:00') : new Date();
    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const month = monthNames[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    const prefix = isSaleMode ? `INVSB${month}${year}-` : `BILL${month}${year}-`;
    const existing = getItems(isSaleMode ? 'sales' : 'purchases')
      .filter(tx => tx.businessId === currentBusiness?.id && tx.invoiceNumber?.startsWith(prefix));
    let maxSerial = 0;
    existing.forEach(tx => {
      const parts = tx.invoiceNumber.split('-');
      const serial = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
    });
    return `${prefix}${String(maxSerial + 1).padStart(4, '0')}`;
  };

  const tableName = isSale ? 'sales' : 'purchases';
  const transactions = getItems(tableName)
    .filter(tx => tx.businessId === currentBusiness?.id)
    .filter(tx => {
      // Search filter
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!tx.partyName?.toLowerCase().includes(s) && !tx.invoiceNumber?.toLowerCase().includes(s)) return false;
      }

      // Date range filter
      if (filters.dateFrom && new Date(tx.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(tx.date) > new Date(filters.dateTo)) return false;

      // Party filter
      if (filters.partyId && tx.partyId !== filters.partyId) return false;

      // Amount range filter
      if (filters.minAmount && tx.totalAmount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && tx.totalAmount > parseFloat(filters.maxAmount)) return false;

      // Status filter
      if (filters.status !== 'all' && tx.status !== filters.status) return false;

      return true;
    })
    .reverse();

  // Group sales by customer for bulk print (sales only, within selected date range)
  const bulkPrintQueue = React.useMemo(() => {
    if (!isSale || !currentBusiness?.id) return [];
    const from = bulkPrintDateFrom ? new Date(bulkPrintDateFrom + 'T00:00:00') : null;
    const to = bulkPrintDateTo ? new Date(bulkPrintDateTo + 'T23:59:59.999') : null;
    const allSales = getItems('sales')
      .filter(tx => tx.businessId === currentBusiness.id)
      .filter(tx => {
        if (!from && !to) return true;
        const d = new Date(tx.date + 'T12:00:00');
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    const byParty = {};
    allSales.forEach(tx => {
      const key = tx.partyId;
      if (!byParty[key]) byParty[key] = { partyId: tx.partyId, partyName: tx.partyName, transactions: [] };
      byParty[key].transactions.push(tx);
    });
    return Object.values(byParty).sort((a, b) => (a.partyName || '').localeCompare(b.partyName || ''));
  }, [isSale, currentBusiness?.id, bulkPrintDateFrom, bulkPrintDateTo, getItems]);

  // Flat list of all bills in range (for selection UI and for building selected list)
  const bulkPrintAllBills = React.useMemo(() => {
    const list = [];
    bulkPrintQueue.forEach(group => {
      group.transactions.forEach(tx => list.push(tx));
    });
    return list;
  }, [bulkPrintQueue]);

  // Keep selection in sync when date range or queue changes: default all selected
  useEffect(() => {
    if (!bulkPrintOpen) return;
    setBulkPrintSelectedIds(new Set(bulkPrintAllBills.map(tx => tx.id)));
  }, [bulkPrintOpen, bulkPrintDateFrom, bulkPrintDateTo, bulkPrintAllBills]);

  // Single bulk print: one document with all customers' bills (page breaks between each invoice and between customers)
  const handleBulkPrintClick = () => {
    if (bulkPrintMergedList.length === 0) return;
    setIsBulkPrinting(true);
    setTimeout(() => {
      handleBulkPrint();
      setIsBulkPrinting(false);
    }, 300);
  };

  const toggleBulkPrintBill = (id) => {
    setBulkPrintSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBulkPrintBills = () => {
    setBulkPrintSelectedIds(new Set(bulkPrintAllBills.map(tx => tx.id)));
  };

  const deselectAllBulkPrintBills = () => {
    setBulkPrintSelectedIds(new Set());
  };

  const bulkPrintFlatList = React.useMemo(() => {
    return bulkPrintAllBills.filter(tx => bulkPrintSelectedIds.has(tx.id));
  }, [bulkPrintAllBills, bulkPrintSelectedIds]);

  // Merge same-customer same-day selected bills into one per (partyId, date) for printing
  const bulkPrintMergedList = React.useMemo(() => {
    const groupKey = tx => `${tx.partyId}|${tx.date}`;
    const groups = {};
    bulkPrintFlatList.forEach(tx => {
      const key = groupKey(tx);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.values(groups).map(txs => {
      const first = txs[0];
      if (txs.length === 1) {
        return { ...first, type: 'Sales', id: first.id };
      }
      const mergedItems = txs.flatMap(t => (t.items || []).map(it => ({ ...it })));
      const subtotal = txs.reduce((s, t) => s + (t.subtotal ?? 0), 0);
      const taxAmount = txs.reduce((s, t) => s + (t.taxAmount ?? 0), 0);
      const discountAmount = txs.reduce((s, t) => s + (t.discountAmount ?? 0), 0);
      const totalAmount = txs.reduce((s, t) => s + (t.totalAmount ?? 0), 0);
      const invoiceLabel = txs.length > 1
        ? `${first.invoiceNumber} (+${txs.length - 1} more on same day)`
        : first.invoiceNumber;
      return {
        ...first,
        id: `merged-${first.partyId}-${first.date}`,
        type: 'Sales',
        invoiceNumber: invoiceLabel,
        items: mergedItems,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        discountPercent: first.discountPercent ?? 0,
      };
    }).sort((a, b) => {
      const nameCmp = (a.partyName || '').localeCompare(b.partyName || '');
      if (nameCmp !== 0) return nameCmp;
      return (a.date || '').localeCompare(b.date || '');
    });
  }, [bulkPrintFlatList]);

  useEffect(() => {
    // Only reset form when switching to create view AND not currently saving
    if (view === 'create' && !savingRef.current && !isSaving) {
      const today = new Date().toISOString().split('T')[0];
      setInvoiceNumber(generateInvoiceNumber(today, isSale));
      setItems([{ itemId: '', name: '', qty: 1, price: '', taxRate: 0, discountPercent: '', total: 0 }]);
      setSelectedParty(null);
      setInvoiceDate(today);
      setDescription('');
      setNoGST(false);
      setDiscountPercent(0);
      setAdvance('');
      setDueDate('');
      setTaxMode('inclusive');
      setEditId(null);
    }
  }, [view, isSale, isSaving]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate invoice number when date changes in create mode
  useEffect(() => {
    if (view === 'create' && !savingRef.current && !isSaving) {
      setInvoiceNumber(generateInvoiceNumber(invoiceDate, isSale));
    }
  }, [invoiceDate, isSale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea';
      // Ctrl/Cmd + S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && (view === 'create' || view === 'edit')) {
        e.preventDefault();
        if (!savingRef.current) handleSave();
      }
      // Ctrl/Cmd + Enter → Save & Create New (create view only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && view === 'create') {
        e.preventDefault();
        if (!savingRef.current) handleSave({ saveAndCreateNew: true });
      }
      // Escape → back to list
      if (e.key === 'Escape' && !isTyping && (view === 'create' || view === 'edit')) {
        setView('list');
      }
      // Ctrl/Cmd + N → new invoice (from list)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && view === 'list') {
        e.preventDefault();
        setView('create');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Logic Handlers
  const addItemRow = () => {
    setItems([
      ...items,
      { itemId: '', name: '', qty: 1, price: '', taxRate: 0, discountPercent: '', total: 0 },
    ]);
  };

  const removeItemRow = index => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(
      newItems.length
        ? newItems
        : [{ itemId: '', name: '', qty: 1, price: '', taxRate: 0, discountPercent: '', total: 0 }]
    );
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'itemId') {
      const selected = stockItems.find(i => i.id === value);
      if (selected) {
        item.name = selected.name;
        item.price = isSale ? selected.salePrice : selected.purchasePrice;
        item.taxRate = selected.taxRate;
      }
    }

    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const discountPercent = Number(item.discountPercent) || 0;
    const taxRate = Number(item.taxRate) || 0;
    if (taxMode === 'inclusive') {
      // price already includes tax; total = qty * price * (1-disc/100)
      item.total = qty * price * (1 - discountPercent / 100);
    } else {
      const lineAfterItemDiscount = qty * price * (1 - discountPercent / 100);
      item.total = lineAfterItemDiscount * (1 + taxRate / 100);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const getBasePrice = (item) => {
    const price = Number(item.price) || 0;
    const taxRate = Number(item.taxRate) || 0;
    return taxMode === 'inclusive' ? price / (1 + taxRate / 100) : price;
  };

  const calculateSubtotal = () =>
    items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const discPct = Number(item.discountPercent) || 0;
      return sum + qty * getBasePrice(item) * (1 - discPct / 100);
    }, 0);

  const calculateDiscountAmount = () =>
    calculateSubtotal() * ((discountPercent || 0) / 100);

  const calculateTax = () => {
    if (noGST) return 0;
    return items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const discPct = Number(item.discountPercent) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const base = getBasePrice(item);
      return sum + qty * base * (1 - discPct / 100) * (taxRate / 100);
    }, 0);
  };

  const calculateTotal = () =>
    calculateSubtotal() - calculateDiscountAmount() + calculateTax();

  const handleSave = async (options = {}) => {
    const { saveAndCreateNew = false } = options;
    // Prevent multiple simultaneous saves using ref
    if (savingRef.current) {
      console.log('⚠️ Save already in progress, ignoring duplicate call');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);

    try {
      // CAPTURE ALL DATA AT THE BEGINNING to prevent race conditions
      const currentSelectedParty = selectedParty;
      const currentInvoiceDate = invoiceDate;
      const currentInvoiceNumber = invoiceNumber;
      const currentItems = [...items];
      const currentDescription = description;
      const currentNoGST = noGST;
      const currentDiscountPercent = discountPercent ?? 0;
      const currentEditId = editId;
      const currentIsSale = isSale;
      const currentBusinessId = currentBusiness?.id;
      // Capture advance only for new sales (not edits, not purchases)
      const currentAdvance = (currentIsSale && !editId) ? (Number(advance) || 0) : 0;
      const currentDueDate = dueDate;
      const currentTaxMode = taxMode;

      // Validate business ID
      if (!currentBusinessId) {
        alert('Business not selected. Please refresh and try again.');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Validate party selection
      if (!currentSelectedParty || !currentSelectedParty.id) {
        alert('Please select a party');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Validate invoice number
      if (!currentInvoiceNumber || currentInvoiceNumber.trim() === '') {
        alert('Please enter an invoice/bill number');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Validate date
      if (!currentInvoiceDate) {
        alert('Please select a date');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Prepare transaction data with captured values
      const getBasePriceFinal = (item) => {
        const price = Number(item.price) || 0;
        const taxRate = Number(item.taxRate) || 0;
        return currentTaxMode === 'inclusive' ? price / (1 + taxRate / 100) : price;
      };
      const finalSubtotal = currentItems.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const discPct = Number(item.discountPercent) || 0;
        return sum + qty * getBasePriceFinal(item) * (1 - discPct / 100);
      }, 0);
      const finalDiscountAmount = finalSubtotal * (currentDiscountPercent / 100);
      const finalTaxAmount = currentNoGST ? 0 : currentItems.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const discPct = Number(item.discountPercent) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const base = getBasePriceFinal(item);
        return sum + qty * base * (1 - discPct / 100) * (taxRate / 100);
      }, 0);
      const finalTotalAmount = finalSubtotal - finalDiscountAmount + finalTaxAmount;

      // stricter: only keep items which have an itemId and positive qty
      const cleanedItems = currentItems
        .filter(i => i.itemId && Number(i.qty) > 0 && Number(i.price) >= 0)
        .map(item => ({
          ...item,
          taxRate: currentNoGST ? 0 : item.taxRate,
          discountPercent: item.discountPercent ?? 0,
        }));

      // Validate items
      if (!cleanedItems.length) {
        alert('Please add at least one item with valid quantity and price');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Additional validation: ensure total amount is positive
      if (finalTotalAmount <= 0) {
        alert('Total amount must be greater than zero');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      const transactionData = {
        businessId: currentBusinessId,
        partyId: currentSelectedParty.id,
        partyName: currentSelectedParty.name || 'Unknown',
        type: currentIsSale ? 'Sales' : 'Purchases',
        date: currentInvoiceDate,
        invoiceNumber: currentInvoiceNumber.trim(),
        items: cleanedItems,
        description: currentDescription || '',
        noGST: currentNoGST,
        discountPercent: currentDiscountPercent,
        discountAmount: finalDiscountAmount,
        subtotal: finalSubtotal,
        taxAmount: finalTaxAmount,
        totalAmount: finalTotalAmount,
        advance: currentAdvance,
        dueDate: currentDueDate || '',
        taxMode: currentTaxMode,
      };

      // Validate transaction data before saving
      if (!transactionData.partyId || !transactionData.items || transactionData.items.length === 0) {
        console.error('❌ Invalid transaction data:', transactionData);
        alert('Invalid transaction data. Please check all fields and try again.');
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      // Get current data state for rollback calculations
      const currentData = data;
      const currentParties = getItems('parties');
      const currentStockItems = getItems('items');

      let editedOldTx = null;
      let editedOldParty = null;
      let editedOldBalanceRollback = null;

      if (currentEditId) {
        const tableName = currentIsSale ? 'sales' : 'purchases';
        const oldTx = currentData[tableName]?.find(t => t.id === currentEditId);
        if (oldTx) {
          editedOldTx = oldTx;
          // Rollback old effects
          const oldBalanceRollback = currentIsSale
            ? -oldTx.totalAmount
            : oldTx.totalAmount;
          editedOldBalanceRollback = oldBalanceRollback;
          const oldParty = currentParties.find(p => p.id === oldTx.partyId);
          editedOldParty = oldParty;
          if (oldParty) {
            await updateItem('parties', oldTx.partyId, {
              balance: oldParty.balance + oldBalanceRollback,
            });
          }

          for (const item of oldTx.items) {
            if (item.itemId) {
              const stockItem = currentStockItems.find(i => i.id === item.itemId);
              if (stockItem) {
                const stockRollback = currentIsSale ? item.qty : -item.qty;
                await updateItem('items', item.itemId, {
                  stock: stockItem.stock + stockRollback,
                });
              }
            }
          }
        }
      }

      // Save the transaction
      const tableName = currentIsSale ? 'sales' : 'purchases';
      let saved;
      if (currentEditId) {
        saved = await updateItem(tableName, currentEditId, transactionData);
      } else {
        saved = await addItem(tableName, transactionData);
      }

      if (!saved) {
        console.error('❌ Save returned false, but checking if data was actually saved...');
        // Even if save returns false, the data might have been saved
        // Check if the item exists in the data
        const tableName = currentIsSale ? 'sales' : 'purchases';
        const savedItem = getItems(tableName).find(t => 
          t.invoiceNumber === transactionData.invoiceNumber && 
          t.partyId === transactionData.partyId
        );
        
        if (!savedItem) {
          alert(
            'Failed to save transaction. Please check your connection and try again.'
          );
          savingRef.current = false;
          setIsSaving(false);
          return;
        } else {
          console.log('✅ Transaction was saved despite return value');
          // Continue with the flow
        }
      }

      // Apply new effects
      const balanceChange = currentIsSale
        ? transactionData.totalAmount
        : -transactionData.totalAmount;
      const newParty = currentParties.find(
        p => p.id === currentSelectedParty.id
      );
      if (newParty) {
        // When editing: use rolled-back balance + new amount so we apply only the delta.
        // Otherwise we'd add the full new amount to the original balance (double-counting).
        const isEditSameParty = currentEditId && editedOldTx && editedOldParty &&
          editedOldParty.id === currentSelectedParty.id;
        // Advance is a payment received — reduces what customer owes us
        const newBalance = isEditSameParty
          ? editedOldParty.balance + editedOldBalanceRollback + balanceChange - currentAdvance
          : newParty.balance + balanceChange - currentAdvance;
        await updateItem('parties', currentSelectedParty.id, {
          balance: newBalance,
        });
      }

      // Auto-create a PaymentIn record for the advance amount (new sales only)
      if (currentIsSale && !currentEditId && currentAdvance > 0) {
        await addItem('payments', {
          businessId: currentBusinessId,
          partyId: currentSelectedParty.id,
          partyName: currentSelectedParty.name || 'Unknown',
          type: 'PaymentIn',
          totalAmount: currentAdvance,
          date: currentInvoiceDate,
          paymentMode: 'Cash',
          referenceNo: `ADV-${currentInvoiceNumber.trim()}`,
          notes: `Advance received for invoice ${currentInvoiceNumber.trim()}`,
        });
      }

      for (const item of transactionData.items) {
        if (item.itemId) {
          const stockItem = currentStockItems.find(i => i.id === item.itemId);
          if (stockItem) {
            const stockChange = currentIsSale ? -item.qty : item.qty;
            await updateItem('items', item.itemId, {
              stock: stockItem.stock + stockChange,
            });
          }
        }
      }

      // Only update UI state after everything succeeds
      if (saveAndCreateNew) {
        const today = new Date().toISOString().split('T')[0];
        setInvoiceNumber(generateInvoiceNumber(today, currentIsSale));
        setItems([{ itemId: '', name: '', qty: 1, price: '', taxRate: 0, discountPercent: '', total: 0 }]);
        setSelectedParty(null);
        setInvoiceDate(today);
        setDescription('');
        setNoGST(false);
        setDiscountPercent(0);
        setAdvance('');
        setDueDate('');
        setTaxMode('inclusive');
        setEditId(null);
        setView('create');
      } else {
        setAdvance('');
        setView('list');
        setEditId(null);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async tx => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${
          isSale ? 'invoice' : 'bill'
        }?`
      )
    )
      return;

    try {
      // 1. Reverse Balance
      const balanceRollback = isSale ? -tx.totalAmount : tx.totalAmount;
      const party = getItems('parties').find(p => p.id === tx.partyId);
      if (party) {
        updateItem('parties', tx.partyId, {
          balance: party.balance + balanceRollback,
        });
      }

      // 2. Reverse Stock
      for (const item of tx.items) {
        if (item.itemId) {
          const stockItem = getItems('items').find(i => i.id === item.itemId);
          if (stockItem) {
            const stockRollback = isSale ? item.qty : -item.qty;
            updateItem('items', item.itemId, {
              stock: stockItem.stock + stockRollback,
            });
          }
        }
      }

      // 3. Delete Record
      const tableName = isSale ? 'sales' : 'purchases';
      deleteItem(tableName, tx.id);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Error deleting record: ' + error.message);
    }
  };

  const startEdit = tx => {
    setEditId(tx.id);
    setSelectedParty(
      parties.find(p => p.id === tx.partyId) || {
        id: tx.partyId,
        name: tx.partyName,
      }
    );
    setInvoiceDate(tx.date);
    setInvoiceNumber(tx.invoiceNumber);
    setItems(tx.items.map(i => ({ ...i, discountPercent: i.discountPercent ?? 0 })));
    setDescription(tx.description || '');
    setNoGST(tx.noGST || false);
    setDiscountPercent(tx.discountPercent ?? 0);
    setAdvance(tx.advance ? String(tx.advance) : '');
    setDueDate(tx.dueDate || '');
    setTaxMode(tx.taxMode || 'inclusive');
    setView('edit');
  };

  // Fire handlePrint only after React has committed printingTx to the DOM
  useEffect(() => {
    if (!printTrigger) return;
    handlePrint();
  }, [printTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerPrint = tx => {
    setPrintingTx(tx);
    setPrintTrigger(t => t + 1);
  };

  const handleShare = tx => {
    const text = `*Invoice from ${currentBusiness?.name || 'Solo Books'}*\n\n` +
      `Invoice #: ${tx.invoiceNumber}\n` +
      `Date: ${tx.date}\n` +
      `Party: ${tx.partyName}\n` +
      `Total: ₹${tx.totalAmount.toFixed(2)}\n\n` +
      `Shared via Solo Books`;
    
    if (navigator.share) {
      navigator.share({ title: `Invoice ${tx.invoiceNumber}`, text }).catch(e => console.error(e));
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // ── Product-First helpers ───────────────────────────────────────────
  const addPfCustomer = () => {
    setPfCustomers(prev => [
      ...prev,
      { _key: Date.now(), party: null, qty: 1, price: pfProduct ? (pfProduct.salePrice ?? '') : '', discountPercent: '' },
    ]);
  };

  const removePfCustomer = (key) => {
    setPfCustomers(prev => {
      const next = prev.filter(r => r._key !== key);
      return next.length ? next : [{ _key: Date.now(), party: null, qty: 1, price: pfProduct ? (pfProduct.salePrice ?? '') : '', discountPercent: '' }];
    });
  };

  const updatePfCustomer = (key, field, value) => {
    setPfCustomers(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  };

  const pfRowTotal = (row) => {
    if (!pfProduct) return 0;
    const qty = Number(row.qty) || 0;
    const price = Number(row.price) || 0;
    const discPct = Number(row.discountPercent) || 0;
    const taxRate = pfNoGST ? 0 : (Number(pfProduct.taxRate) || 0);
    const afterDisc = qty * price * (1 - discPct / 100);
    return afterDisc * (1 + taxRate / 100);
  };

  const handlePfSave = async () => {
    if (!currentBusiness?.id) { alert('Business not selected.'); return; }
    if (!pfProduct) { alert('Please select a product first.'); return; }
    const validRows = pfCustomers.filter(r => r.party && Number(r.qty) > 0);
    if (!validRows.length) { alert('Please add at least one customer with a quantity.'); return; }

    setPfIsSaving(true);
    try {
      // Pre-compute per-row data
      const baseTime = Date.now();
      const rowData = validRows.map((row, idx) => {
        const qty = Number(row.qty);
        const price = Number(row.price) || 0;
        const discPct = Number(row.discountPercent) || 0;
        const taxRate = pfNoGST ? 0 : (Number(pfProduct.taxRate) || 0);
        const subtotal = qty * price * (1 - discPct / 100);
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        return {
          ...row, qty, price, discPct, taxRate, subtotal, taxAmount, totalAmount,
          invoiceNumber: `INV-${String(baseTime + idx).slice(-8)}`,
        };
      });

      // Aggregate balance changes per party (in case same party appears twice).
      // Store the party object (not just its ID as a key) to preserve the original
      // ID type — Object.entries() stringifies keys which breaks strict === matching.
      const balanceDelta = {};
      rowData.forEach(rd => {
        const key = rd.party.id;
        if (!balanceDelta[key]) balanceDelta[key] = { party: rd.party, delta: 0 };
        balanceDelta[key].delta += rd.totalAmount;
      });

      // Save invoices
      for (const rd of rowData) {
        await addItem('sales', {
          businessId: currentBusiness.id,
          partyId: rd.party.id,
          partyName: rd.party.name || 'Unknown',
          type: 'Sales',
          date: pfDate,
          invoiceNumber: rd.invoiceNumber,
          items: [{
            itemId: pfProduct.id,
            name: pfProduct.name,
            qty: rd.qty,
            price: rd.price,
            taxRate: rd.taxRate,
            discountPercent: rd.discPct,
            total: rd.totalAmount,
          }],
          noGST: pfNoGST,
          discountPercent: 0,
          discountAmount: 0,
          subtotal: rd.subtotal,
          taxAmount: rd.taxAmount,
          totalAmount: rd.totalAmount,
          advance: 0,
        });
      }

      // Update party balances using the original party object (preserves ID type)
      const currentParties = getItems('parties');
      for (const { party, delta } of Object.values(balanceDelta)) {
        const p = currentParties.find(x => x.id === party.id);
        if (p) await updateItem('parties', party.id, { balance: (p.balance || 0) + delta });
      }

      // Update stock (deduct total qty once)
      const totalQty = rowData.reduce((s, r) => s + r.qty, 0);
      const stockItem = getItems('items').find(i => i.id === pfProduct.id);
      if (stockItem) await updateItem('items', pfProduct.id, { stock: (stockItem.stock || 0) - totalQty });

      setSnack({ open: true, message: `${rowData.length} invoice${rowData.length > 1 ? 's' : ''} saved successfully!`, severity: 'success' });

      // Reset product-first form
      setPfProduct(null);
      setPfDate(new Date().toISOString().split('T')[0]);
      setPfNoGST(false);
      setPfCustomers([{ _key: Date.now(), party: null, qty: 1, price: '', discountPercent: '' }]);
      setView('list');
    } catch (err) {
      console.error('Product-first save error:', err);
      alert('Error saving invoices: ' + err.message);
    } finally {
      setPfIsSaving(false);
    }
  };

  // ── Quick-add helpers ──────────────────────────────────────────────────
  const openQuickAddParty = (inputValue, callback) => {
    quickAddPartyCallbackRef.current = callback;
    setQuickAddParty({ open: true, name: inputValue || '', phone: '', balance: '' });
  };

  const handleQuickSaveParty = async () => {
    const name = quickAddParty.name.trim();
    if (!name) return;
    setQuickAddPartyLoading(true);
    try {
      const newId = Date.now();
      const partyType = isSale ? 'Customer' : 'Vendor';
      const newParty = {
        id: newId,
        businessId: currentBusiness.id,
        name,
        type: partyType,
        phone: quickAddParty.phone || '',
        gstNumber: '',
        address: '',
        balance: Number(quickAddParty.balance) || 0,
      };
      await addItem('parties', newParty);
      if (quickAddPartyCallbackRef.current) quickAddPartyCallbackRef.current(newParty);
      setQuickAddParty({ open: false, name: '', phone: '', balance: '' });
    } finally {
      setQuickAddPartyLoading(false);
    }
  };

  const openQuickAddItem = (inputValue, callback) => {
    quickAddItemCallbackRef.current = callback;
    setQuickAddItem({ open: true, name: inputValue || '', salePrice: '', purchasePrice: '', taxRate: 18, stock: '', unit: 'NOS' });
  };

  const handleQuickSaveItem = async () => {
    const name = quickAddItem.name.trim();
    if (!name) return;
    setQuickAddItemLoading(true);
    try {
      const newId = Date.now();
      const newStockItem = {
        id: newId,
        businessId: currentBusiness.id,
        name,
        unit: quickAddItem.unit || 'NOS',
        salePrice: Number(quickAddItem.salePrice) || 0,
        purchasePrice: Number(quickAddItem.purchasePrice) || 0,
        taxRate: Number(quickAddItem.taxRate) || 18,
        stock: Number(quickAddItem.stock) || 0,
        hsnCode: '',
      };
      await addItem('items', newStockItem);
      if (quickAddItemCallbackRef.current) quickAddItemCallbackRef.current(newStockItem);
      setQuickAddItem({ open: false, name: '', salePrice: '', purchasePrice: '', taxRate: 18, stock: '', unit: 'NOS' });
    } finally {
      setQuickAddItemLoading(false);
    }
  };

  // Shared quick-add dialog JSX (inserted into each create/edit view)
  const quickAddDialogs = (
    <>
      {/* Quick Add Party Dialog */}
      <Dialog open={quickAddParty.open} onClose={() => !quickAddPartyLoading && setQuickAddParty(s => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Add New {isSale ? 'Customer' : 'Vendor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name *" value={quickAddParty.name} autoFocus fullWidth size="small"
              onChange={e => setQuickAddParty(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuickSaveParty()}
            />
            <TextField
              label="Phone" value={quickAddParty.phone} fullWidth size="small"
              onChange={e => setQuickAddParty(s => ({ ...s, phone: e.target.value }))}
            />
            <TextField
              label="Opening Balance (₹)" type="number" value={quickAddParty.balance} fullWidth size="small"
              placeholder="0" onChange={e => setQuickAddParty(s => ({ ...s, balance: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setQuickAddParty(s => ({ ...s, open: false }))} disabled={quickAddPartyLoading}>Cancel</Button>
          <Button variant="contained" onClick={handleQuickSaveParty}
            disabled={quickAddPartyLoading || !quickAddParty.name.trim()}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {quickAddPartyLoading ? 'Creating…' : 'Create & Select'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Add Item Dialog */}
      <Dialog open={quickAddItem.open} onClose={() => !quickAddItemLoading && setQuickAddItem(s => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add New Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Item Name *" value={quickAddItem.name} autoFocus fullWidth size="small"
              onChange={e => setQuickAddItem(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuickSaveItem()}
            />
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField label="Sale Price (₹)" type="number" value={quickAddItem.salePrice} size="small" fullWidth placeholder="0"
                  onChange={e => setQuickAddItem(s => ({ ...s, salePrice: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Purchase Price (₹)" type="number" value={quickAddItem.purchasePrice} size="small" fullWidth placeholder="0"
                  onChange={e => setQuickAddItem(s => ({ ...s, purchasePrice: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Tax Rate" value={quickAddItem.taxRate} size="small" fullWidth
                  onChange={e => setQuickAddItem(s => ({ ...s, taxRate: e.target.value }))}>
                  {[0, 5, 12, 18, 28].map(r => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Unit" value={quickAddItem.unit} size="small" fullWidth
                  onChange={e => setQuickAddItem(s => ({ ...s, unit: e.target.value }))}>
                  {['NOS', 'BAGS', 'BOX', 'KGS', 'Ltr', 'Mtr', 'Pcs'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Opening Stock" type="number" value={quickAddItem.stock} size="small" fullWidth placeholder="0"
                  onChange={e => setQuickAddItem(s => ({ ...s, stock: e.target.value }))} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setQuickAddItem(s => ({ ...s, open: false }))} disabled={quickAddItemLoading}>Cancel</Button>
          <Button variant="contained" onClick={handleQuickSaveItem}
            disabled={quickAddItemLoading || !quickAddItem.name.trim()}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {quickAddItemLoading ? 'Creating…' : 'Create & Select'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // RENDER CREATE/EDIT VIEW
  if (view === 'create' || view === 'edit') {

    // ── PRODUCT FIRST VIEW (sales only, create only) ──────────────────────
    if (isSale && entryMode === 'product' && view === 'create') {
      const pfTotal = pfCustomers.reduce((s, r) => s + pfRowTotal(r), 0);
      const pfValidCount = pfCustomers.filter(r => r.party && Number(r.qty) > 0).length;
      return (
        <>
        <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Tooltip title="Back to list (Esc)">
              <IconButton onClick={() => setView('list')} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <ChevronLeft size={20} />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Product First — Bulk Sales Entry</Typography>
              <Typography variant="caption" color="text.secondary">Select a product, add customers with their purchase quantities</Typography>
            </Box>
            <ToggleButtonGroup value={entryMode} exclusive onChange={(_e, v) => v && setEntryMode(v)} size="small">
              <ToggleButton value="customer" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
                <Users size={15} style={{ marginRight: 5 }} />Customer First
              </ToggleButton>
              <ToggleButton value="product" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
                <Package size={15} style={{ marginRight: 5 }} />Product First
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Product & Date row */}
          <Card elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'primary.main' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>Step 1 — Choose Product</Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={7}>
                  <Autocomplete
                    options={stockItems}
                    getOptionLabel={o => o.name || ''}
                    value={pfProduct}
                    onChange={(_e, v) => {
                      setPfProduct(v);
                      if (v) setPfCustomers(prev => prev.map(r => ({ ...r, price: r.price || (v.salePrice ?? '') })));
                    }}
                    renderInput={params => (
                      <TextField {...params} label="Product *" placeholder="Search product…" size="small" />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth size="small" type="date" label="Invoice Date"
                    value={pfDate} onChange={e => setPfDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid item xs={6} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={pfNoGST} onChange={e => setPfNoGST(e.target.checked)} />}
                    label={<Typography variant="body2">No GST</Typography>}
                    sx={{ m: 0 }}
                  />
                </Grid>
                {pfProduct && (
                  <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                        GST {pfNoGST ? '0' : (pfProduct.taxRate || 0)}% · Stock {pfProduct.stock ?? '—'}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Customers table */}
          <Card elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.02)' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Step 2 — Add Customers</Typography>
                <Typography variant="caption" color="text.secondary">Each row creates a separate invoice for that customer</Typography>
              </Box>
              <Chip label={`${pfCustomers.length} row${pfCustomers.length !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 700, pl: 3, width: 36 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Customer *</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">Rate (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Disc %</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }} align="right">Amount</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pfCustomers.map((row, idx) => {
                    const rowAmt = pfRowTotal(row);
                    return (
                      <TableRow key={row._key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ pl: 3, color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Autocomplete
                            options={parties}
                            getOptionLabel={o => o.name || ''}
                            value={row.party}
                            onChange={(_e, v) => updatePfCustomer(row._key, 'party', v)}
                            size="small"
                            renderInput={params => (
                              <TextField {...params} placeholder="Search customer…" variant="outlined" size="small" />
                            )}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          <TextField
                            type="number" size="small" variant="outlined"
                            value={row.qty} placeholder="1"
                            onChange={e => updatePfCustomer(row._key, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                            onFocus={e => e.target.select()}
                            slotProps={{ input: { min: 0, step: 1, style: { textAlign: 'center' } } }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <TextField
                            type="number" size="small" variant="outlined"
                            value={row.price} placeholder="0.00"
                            onChange={e => updatePfCustomer(row._key, 'price', e.target.value)}
                            onFocus={e => e.target.select()}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment>, min: 0, step: 0.01, style: { textAlign: 'right' } } }}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          <TextField
                            type="number" size="small" variant="outlined"
                            value={row.discountPercent} placeholder="0"
                            onChange={e => updatePfCustomer(row._key, 'discountPercent', e.target.value)}
                            onFocus={e => e.target.select()}
                            slotProps={{ input: { min: 0, max: 100, step: 0.5, style: { textAlign: 'center' } } }}
                            sx={{ width: 76 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: rowAmt > 0 ? 'primary.main' : 'text.disabled' }}>
                            {rowAmt > 0 ? `₹${rowAmt.toFixed(2)}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ pr: 1 }}>
                          <IconButton size="small" color="error" onClick={() => removePfCustomer(row._key)} title="Remove">
                            <Trash2 size={15} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ p: 2.5, pl: 3, display: 'flex', alignItems: 'center', gap: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button startIcon={<Plus size={16} />} variant="outlined" size="small" onClick={addPfCustomer}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Add Customer
              </Button>
              <Typography variant="caption" color="text.secondary">Each row = one invoice</Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {pfValidCount} valid invoice{pfValidCount !== 1 ? 's' : ''}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  ₹{pfTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Save bar */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {[{ key: 'Esc', label: 'Back' }].map(s => (
                <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box component="kbd" sx={{ px: 0.8, py: 0.25, borderRadius: 0.75, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>{s.key}</Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              ))}
            </Box>
            <Button variant="contained" size="large" startIcon={pfIsSaving ? null : <Save size={18} />}
              onClick={handlePfSave} disabled={pfIsSaving || !pfProduct || pfValidCount === 0}
              sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none', px: 4, py: 1.4, background: 'linear-gradient(45deg,#4f46e5 30%,#6366f1 90%)', boxShadow: '0 6px 14px rgba(79,70,229,0.25)', '&:hover': { background: 'linear-gradient(45deg,#4338ca 30%,#4f46e5 90%)' } }}>
              {pfIsSaving ? 'Saving…' : `Save ${pfValidCount || ''} Invoice${pfValidCount !== 1 ? 's' : ''}`}
            </Button>
          </Box>
        </Box>
        {quickAddDialogs}
        </>
      );
    }

    // ── CUSTOMER FIRST (default) view ────────────────────────────────────
    return (
      <>
      <Box sx={{ pb: 2 }}>
        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Tooltip title="Back to list (Esc)">
            <IconButton onClick={() => setView('list')} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ChevronLeft size={20} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {view === 'edit' ? 'Edit ' : 'New '}{isSale ? 'Sales Invoice' : 'Purchase Bill'}
            </Typography>
            {view === 'create' && (
              <Typography variant="caption" color="text.secondary">Fill in the details below and save</Typography>
            )}
          </Box>
          {isSale && view === 'create' && (
            <ToggleButtonGroup value={entryMode} exclusive onChange={(_e, v) => v && setEntryMode(v)} size="small">
              <ToggleButton value="customer" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
                <Users size={15} style={{ marginRight: 5 }} />Customer First
              </ToggleButton>
              <ToggleButton value="product" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
                <Package size={15} style={{ marginRight: 5 }} />Product First
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Card 1: Bill Details */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'primary.main' }}>
              <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1 }}>
                  {isSale ? 'Sales Invoice Details' : 'Purchase Bill Details'}
                </Typography>
              </Box>
              <CardContent sx={{ pt: 1, pb: 2, px: 2.5 }}>
                <Grid container spacing={2}>
                  {/* Customer — Invoice No — Date */}
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={parties}
                      getOptionLabel={option => option._addNew ? option._display : (option.name || '')}
                      value={selectedParty}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      filterOptions={(options, { inputValue }) => {
                        const lower = inputValue.toLowerCase();
                        const filtered = options.filter(o => !o._addNew && o.name.toLowerCase().includes(lower));
                        filtered.push({ _addNew: true, _display: inputValue ? `+ Create "${inputValue}"` : `+ New ${isSale ? 'Customer' : 'Vendor'}`, _inputValue: inputValue, id: '__add_new_party__', name: '' });
                        return filtered;
                      }}
                      onChange={(_e, v) => {
                        if (v?._addNew) { openQuickAddParty(v._inputValue, p => setSelectedParty(p)); return; }
                        setSelectedParty(v);
                      }}
                      renderOption={(props, option) => option._addNew ? (
                        <li {...props} key="__add_new_party__">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'primary.main', fontWeight: 700, fontSize: '0.875rem' }}>
                            <Plus size={14} />{option._display}
                          </Box>
                        </li>
                      ) : <li {...props}>{option.name}</li>}
                      renderInput={params => (
                        <TextField
                          {...params}
                          label={isSale ? 'Customer *' : 'Vendor *'}
                          placeholder={`Select ${isSale ? 'customer' : 'vendor'}…`}
                          size="small"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth size="small"
                      label={isSale ? 'Invoice No.' : 'Bill No.'}
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><Receipt size={15} /></InputAdornment> } }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth size="small" type="date" label="Date"
                      value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><Calendar size={15} /></InputAdornment> } }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth size="small" type="date" label="Due Date (optional)"
                      value={dueDate} onChange={e => setDueDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Tax Mode:</Typography>
                  <ToggleButtonGroup value={taxMode} exclusive onChange={(_, v) => v && setTaxMode(v)} size="small">
                    <ToggleButton value="exclusive" sx={{ textTransform: 'none', px: 2 }}>Exclusive (+ Tax)</ToggleButton>
                    <ToggleButton value="inclusive" sx={{ textTransform: 'none', px: 2 }}>Inclusive (Tax in price)</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </CardContent>
            </Card>

            {/* Card 2: Items */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>
                  Items & Quantities
                </Typography>
                <Chip label={`${items.length} item${items.length !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 700 }}>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                      <TableRow>
                        <TableCell sx={{ pl: 3, fontWeight: 700, minWidth: 280 }}>Item / Product</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Qty</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 150 }} align="right">Rate (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Disc %</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">GST %</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130, pr: 3 }} align="right">Amount</TableCell>
                        <TableCell sx={{ width: 44 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ pl: 3, py: 1.5 }}>
                            <Autocomplete
                              options={stockItems}
                              getOptionLabel={option => option._addNew ? option._display : (option.name || '')}
                              size="small"
                              value={stockItems.find(i => i.id === item.itemId) || null}
                              isOptionEqualToValue={(opt, val) => opt.id === val.id}
                              filterOptions={(options, { inputValue }) => {
                                const lower = inputValue.toLowerCase();
                                const filtered = options.filter(o => !o._addNew && o.name.toLowerCase().includes(lower));
                                filtered.push({ _addNew: true, _display: inputValue ? `+ Create "${inputValue}"` : '+ New Item', _inputValue: inputValue, id: '__add_new_item__', name: '' });
                                return filtered;
                              }}
                              onChange={(_e, v) => {
                                if (v?._addNew) { openQuickAddItem(v._inputValue, newItem => updateItemRow(index, 'itemId', newItem.id)); return; }
                                updateItemRow(index, 'itemId', v?.id);
                              }}
                              renderOption={(props, option) => option._addNew ? (
                                <li {...props} key="__add_new_item__">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'primary.main', fontWeight: 700, fontSize: '0.875rem' }}>
                                    <Plus size={14} />{option._display}
                                  </Box>
                                </li>
                              ) : <li {...props}>{option.name}</li>}
                              renderInput={params => (
                                <TextField
                                  {...params}
                                  placeholder="Search or select item…"
                                  variant="outlined"
                                  size="small"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              value={item.qty}
                              onChange={e => updateItemRow(index, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              slotProps={{ input: { style: { textAlign: 'center' }, min: 0, step: 1 } }}
                              sx={{ width: 74 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              value={item.price}
                              placeholder="0.00"
                              onChange={e => updateItemRow(index, 'price', e.target.value)}
                              onFocus={e => e.target.select()}
                              slotProps={{
                                input: {
                                  startAdornment: <InputAdornment position="start"><Typography variant="body2" color="text.secondary">₹</Typography></InputAdornment>,
                                  style: { textAlign: 'right' },
                                  min: 0,
                                  step: 0.01,
                                }
                              }}
                              sx={{ width: 130 }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              value={item.discountPercent ?? ''}
                              placeholder="0"
                              onChange={e => updateItemRow(index, 'discountPercent', e.target.value)}
                              onFocus={e => e.target.select()}
                              slotProps={{ input: { style: { textAlign: 'center' }, min: 0, max: 100, step: 0.5 } }}
                              sx={{ width: 84 }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.taxRate || 0}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3, py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              ₹{(item.total || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ pr: 1, py: 1.5 }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItemRow(index)}
                              title="Remove row"
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Button
                    startIcon={<Plus size={18} />}
                    onClick={addItemRow}
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      borderRadius: 2.5,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: alpha('#4f46e5', 0.05),
                        borderColor: 'primary.dark',
                      }
                    }}
                  >
                    Add Item
                  </Button>
                  {barcodeScanEnabled && (
                    <Button
                      startIcon={<ScanLine size={18} />}
                      onClick={() => setScannerOpen(true)}
                      variant="outlined"
                      color="secondary"
                      sx={{ fontWeight: 700, borderRadius: 2.5 }}
                    >
                      Scan Barcode
                    </Button>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Click a number field and start typing to replace the value
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth size="small"
                        label="Notes (optional)"
                        placeholder="Any remarks for this invoice…"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        multiline rows={2}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small" type="number"
                        label="Invoice Discount %"
                        value={discountPercent || ''}
                        placeholder="0"
                        onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment>, min: 0, max: 100, step: 0.5 } }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={<Switch size="small" checked={noGST} onChange={e => setNoGST(e.target.checked)} color="primary" />}
                        label={<Typography variant="body2">No GST</Typography>}
                        sx={{ m: 0 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
            <Card
              elevation={0}
              sx={{
                position: { lg: 'sticky' },
                top: { lg: 68 },
                border: '1px solid',
                borderColor: 'primary.main',
                bgcolor: 'rgba(79,70,229,0.03)',
                borderRadius: 2,
                overflow: 'hidden',
                borderTop: '3px solid',
                borderTopColor: 'primary.main',
              }}
            >
              <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1 }}>Summary</Typography>
              </Box>
              <CardContent sx={{ pt: 1, pb: 2, px: 2.5 }}>
                {/* Line items summary */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                  {[
                    { label: 'Subtotal', value: `₹${calculateSubtotal().toFixed(2)}` },
                    ...(discountPercent > 0 ? [{ label: `Discount (${discountPercent}%)`, value: `-₹${calculateDiscountAmount().toFixed(2)}`, color: 'error.main' }] : []),
                    { label: noGST ? 'GST (disabled)' : `GST (${taxMode === 'inclusive' ? 'Incl.' : 'Excl.'})`, value: `₹${calculateTax().toFixed(2)}` },
                  ].map(r => (
                    <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: r.color || 'text.primary' }}>{r.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Invoice Total</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    ₹{calculateTotal().toFixed(2)}
                  </Typography>
                </Box>

                {/* Advance field — sales only */}
                {isSale && (
                  <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid', borderColor: 'success.light' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Wallet size={16} color="#10b981" />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.dark', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Advance Received
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="0.00"
                      value={advance}
                      onChange={e => setAdvance(e.target.value)}
                      onFocus={e => e.target.select()}
                      disabled={view === 'edit'}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          min: 0,
                          step: 0.01,
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {view === 'edit'
                        ? `Advance of ₹${Number(advance) || 0} was recorded on creation`
                        : 'Will be auto-recorded as a payment in'}
                    </Typography>
                    {Number(advance) > 0 && view === 'create' && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'success.light' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>Balance Due</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                          ₹{Math.max(0, calculateTotal() - Number(advance)).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Save size={20} />}
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 14px rgba(79, 70, 229, 0.3)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSaving ? 'Saving…' : view === 'edit' ? 'Update Transaction' : 'Save Transaction'}
                </Button>
                {view === 'create' && (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<Plus size={20} />}
                    onClick={() => handleSave({ saveAndCreateNew: true })}
                    disabled={isSaving}
                    sx={{
                      mt: 1,
                      borderRadius: 2,
                      py: 1,
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': { borderColor: 'primary.dark', bgcolor: 'action.hover' },
                    }}
                  >
                    Save & Create New
                  </Button>
                )}
                {/* Keyboard shortcut hints */}
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                  {[
                    { key: 'Ctrl+S', label: view === 'edit' ? 'Update' : 'Save' },
                    ...(view === 'create' ? [{ key: 'Ctrl+↵', label: 'Save & New' }] : []),
                    { key: 'Esc', label: 'Back' },
                  ].map(s => (
                    <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Box component="kbd" sx={{ px: 0.7, py: 0.2, borderRadius: 0.75, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                        {s.key}
                      </Box>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
      {quickAddDialogs}
    </>
    );
  } // end create/edit

  // RENDER LIST VIEW
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            {isSale ? 'Sales Invoices' : 'Purchase Bills'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isSale
              ? 'Record sales and track customer receivables.'
              : 'Manage purchases and track vendor payables.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            sx={{ minWidth: 100 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="A5">A5</MenuItem>
            <MenuItem value="Letter">Letter</MenuItem>
            <MenuItem value="Legal">Legal</MenuItem>
          </TextField>
          {isSale && (
            <Button
              variant="outlined"
              startIcon={<Printer size={20} />}
              onClick={() => setBulkPrintOpen(true)}
              size="large"
              sx={{ borderRadius: 3 }}
            >
              Print bills by range
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={isSale ? <Receipt size={20} /> : <ShoppingBasket size={20} />}
            onClick={() => setView('create')}
            size="large"
            sx={{ borderRadius: 3 }}
            title={`Create new (Ctrl+N)`}
          >
            {isSale ? 'New Invoice' : 'New Bill'}
          </Button>
        </Box>
      </Box>

      {/* Filter Controls */}
      <Card sx={{ mb: 2, borderRadius: 1.5 }}>
        <CardContent>
          <TextField
            fullWidth
            size="small"
            placeholder={`Search by ${isSale ? 'customer' : 'vendor'} name or invoice number…`}
            value={filters.search || ''}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {(filters.dateFrom ||
              filters.dateTo ||
              filters.partyId ||
              filters.minAmount ||
              filters.maxAmount ||
              filters.status !== 'all' ||
              filters.search) && (
              <Button
                onClick={() =>
                  setFilters({
                    dateFrom: '',
                    dateTo: '',
                    partyId: '',
                    minAmount: '',
                    maxAmount: '',
                    status: 'all',
                    search: '',
                  })
                }
                variant="text"
                size="small"
                color="error"
              >
                Clear Filters
              </Button>
            )}
          </Box>

          {showFilters && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={e =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
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
                  onChange={e =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={parties}
                  getOptionLabel={option => option.name}
                  value={
                    parties.find(p => p.id === filters.partyId) || null
                  }
                  onChange={(e, value) =>
                    setFilters({
                      ...filters,
                      partyId: value?.id || '',
                    })
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={isSale ? 'Customer' : 'Vendor'}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={filters.status}
                  onChange={e =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  size="small"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min Amount"
                  type="number"
                  value={filters.minAmount}
                  onChange={e =>
                    setFilters({ ...filters, minAmount: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        ₹
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Amount"
                  type="number"
                  value={filters.maxAmount}
                  onChange={e =>
                    setFilters({ ...filters, maxAmount: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        ₹
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          overflowX: 'auto',
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Document #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                {isSale ? 'Customer' : 'Vendor'}
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(tx => (
                <TableRow key={tx.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tx.invoiceNumber}
                  </TableCell>
                  <TableCell>{tx.partyName}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {tx.dueDate ? (
                      <Typography variant="body2" sx={{ color: new Date(tx.dueDate + 'T00:00:00') < new Date() ? 'error.main' : 'text.primary', fontWeight: 600 }}>
                        {formatDate(tx.dueDate)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 700 }}>
                      ₹{tx.totalAmount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label="Completed"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => startEdit(tx)}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => triggerPrint(tx)}
                        title="Print"
                      >
                        <Printer size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: '#25D366' }}
                        onClick={() => handleShare(tx)}
                        title="Share on WhatsApp"
                      >
                        <Share2 size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(tx)}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={transactions.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={event => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />

      {/* Print bills by range dialog - Sales only */}
      {isSale && (
        <Dialog open={bulkPrintOpen} onClose={() => !isBulkPrinting && setBulkPrintOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Print bills by date range</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a date range, then choose which bills to print. You can uncheck any bill you don&apos;t need. Each selected invoice will print on its own page.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From date"
                  type="date"
                  value={bulkPrintDateFrom}
                  onChange={e => setBulkPrintDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To date"
                  type="date"
                  value={bulkPrintDateTo}
                  onChange={e => setBulkPrintDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Bills in range: {bulkPrintSelectedIds.size} of {bulkPrintAllBills.length} selected
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button size="small" onClick={selectAllBulkPrintBills} disabled={bulkPrintAllBills.length === 0}>
                      Select all
                    </Button>
                    <Button size="small" onClick={deselectAllBulkPrintBills} disabled={bulkPrintAllBills.length === 0}>
                      Deselect all
                    </Button>
                  </Box>
                </Box>
                {bulkPrintAllBills.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No bills in selected range.</Typography>
                ) : (
                  <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 280, overflow: 'auto' }}>
                    {bulkPrintQueue.map((group) => (
                      <React.Fragment key={group.partyId}>
                        <ListItem sx={{ py: 0.5, backgroundColor: 'action.hover' }}>
                          <ListItemText
                            primary={group.partyName || 'Unknown'}
                            primaryTypographyProps={{ fontWeight: 600, variant: 'subtitle2' }}
                          />
                        </ListItem>
                        {group.transactions.map((tx) => (
                          <ListItem
                            key={tx.id}
                            dense
                            secondaryAction={
                              <Checkbox
                                edge="end"
                                checked={bulkPrintSelectedIds.has(tx.id)}
                                onChange={() => toggleBulkPrintBill(tx.id)}
                              />
                            }
                            sx={{ pl: 3 }}
                          >
                            <ListItemText
                              primary={`# ${tx.invoiceNumber} · ${formatDate(tx.date)}`}
                              secondary={`₹${(tx.totalAmount || 0).toFixed(2)}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setBulkPrintOpen(false)} disabled={isBulkPrinting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Printer size={18} />}
              onClick={handleBulkPrintClick}
              disabled={bulkPrintMergedList.length === 0 || isBulkPrinting}
            >
              {isBulkPrinting ? 'Opening print...' : `Print ${bulkPrintMergedList.length} bill${bulkPrintMergedList.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <div style={{ display: 'none' }}>
        <InvoiceTemplate
          ref={printRef}
          transaction={printingTx}
          business={currentBusiness}
          paperSize={paperSize}
          partyBalance={printingTx ? (parties.find(p => p.id === printingTx.partyId)?.balance ?? 0) : undefined}
        />
      </div>

      {/* Bulk print: merged same-day bills per customer, one page per merged bill */}
      {isSale && bulkPrintOpen && bulkPrintMergedList.length > 0 && (
        <div
          ref={bulkPrintRef}
          className="bulk-print-content"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100%',
            maxWidth: '210mm',
            zIndex: -1,
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          {bulkPrintMergedList.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                pageBreakAfter: i < bulkPrintMergedList.length - 1 ? 'always' : 'auto',
                pageBreakInside: 'avoid'
              }}
            >
              <InvoiceTemplate
                transaction={{ ...tx, type: 'Sales' }}
                business={currentBusiness}
                paperSize={paperSize}
                partyBalance={parties.find(p => p.id === tx.partyId)?.balance}
              />
            </div>
          ))}
        </div>
      )}

      {/* Snackbar for product-first save confirmation */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          icon={<CheckCircle2 size={18} />}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      {barcodeScanEnabled && (
        <BarcodeScanner
          open={scannerOpen}
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </Box>
  );
};

export default SalesPage;
