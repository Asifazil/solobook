import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
  Divider,
  Autocomplete,
  InputAdornment,
  Chip,
  TablePagination,
  FormControlLabel,
  Switch,
  alpha,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Snackbar,
  Alert,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  ChevronLeft,
  Receipt,
  ShoppingBasket,
  Edit,
  Share2,
  Calendar,
  User,
  Package,
  Users,
  Wallet,
  CheckCircle2,
  ScanLine,
  Search,
  TrendingUp,
  FileText,
  Filter,
  X,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { useBusiness } from "./BusinessContext";
import { useData } from "./DataContext";
import { useConfig } from "./ConfigContext";
import { useReactToPrint } from "react-to-print";
import { useLocation } from "react-router-dom";
import InvoiceTemplate from "./InvoiceTemplate";
import BarcodeScanner from "./BarcodeScanner";

/* ─── Design tokens (derived from global MUI theme) ─── */
const getThemeTokens = (theme) => {
  const primary = theme.palette.primary.main;
  const primaryLight = theme.palette.primary.light || primary;
  const primaryDark = theme.palette.primary.dark || primary;
  const success = theme.palette.success.main;
  const baseRadius = Number(theme.shape?.borderRadius) || 8;

  return {
    primary,
    primaryLight,
    primaryDark,
    primarySoft: alpha(primary, 0.08),
    primaryBorder: alpha(primary, 0.18),
    success,
    successSoft: alpha(success, 0.08),
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    radius: {
      sm: `${baseRadius}px`,
      md: `${baseRadius + 4}px`,
      lg: `${baseRadius + 8}px`,
      xl: `${baseRadius + 12}px`,
    },
    shadow: {
      card: theme.shadows[1],
      cardHover: theme.shadows[4],
      btn: `0 4px 12px ${alpha(primary, 0.28)}`,
      btnHover: `0 6px 20px ${alpha(primary, 0.38)}`,
    },
  };
};

/* ─── Reusable styled helpers ─── */
const SectionLabel = ({ children, icon: Icon, tokens }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0 }}>
    {Icon && <Icon size={13} color={tokens.primary} />}
    <Typography
      variant="overline"
      sx={{
        fontWeight: 800,
        color: tokens.primary,
        letterSpacing: "0.08em",
        fontSize: "0.65rem",
        lineHeight: 1,
      }}
    >
      {children}
    </Typography>
  </Box>
);

const StatPill = ({ label, value, color = "primary", tokens }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.5,
      py: 0.6,
      borderRadius: "100px",
      bgcolor: color === "primary" ? tokens.primarySoft : tokens.successSoft,
      border: "1px solid",
      borderColor:
        color === "primary" ? tokens.primaryBorder : "rgba(16,185,129,0.18)",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        fontWeight: 800,
        color: color === "primary" ? tokens.primary : tokens.success,
      }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", fontWeight: 500 }}
    >
      {label}
    </Typography>
  </Box>
);

const EnhancedCard = ({ children, accent = false, sx = {}, tokens }) => (
  <Card
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: accent ? tokens.primaryBorder : "rgba(0,0,0,0.07)",
      borderRadius: tokens.radius.lg,
      overflow: "hidden",
      boxShadow: tokens.shadow.card,
      transition: "box-shadow 0.2s ease",
      ...(accent && {
        borderTopWidth: "3px",
        borderTopColor: tokens.primary,
      }),
      "&:hover": {
        boxShadow: tokens.shadow.cardHover,
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const GradientButton = ({
  children,
  fullWidth = false,
  size = "large",
  disabled = false,
  onClick,
  startIcon,
  tokens,
  sx = {},
}) => (
  <Button
    variant="contained"
    fullWidth={fullWidth}
    size={size}
    disabled={disabled}
    onClick={onClick}
    startIcon={startIcon}
    sx={{
      background: disabled
        ? undefined
        : `linear-gradient(135deg, ${tokens.primaryDark} 0%, ${tokens.primaryLight} 100%)`,
      boxShadow: tokens.shadow.btn,
      borderRadius: tokens.radius.md,
      fontWeight: 800,
      textTransform: "none",
      letterSpacing: "0.01em",
      transition: "all 0.2s ease",
      "&:hover": {
        background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.primaryDark} 100%)`,
        boxShadow: tokens.shadow.btnHover,
        transform: "translateY(-1px)",
      },
      "&:active": { transform: "translateY(0)" },
      ...sx,
    }}
  >
    {children}
  </Button>
);

/* ─── Main Component ─── */
const SalesPage = ({ mode = "sales" }) => {
  const theme = useTheme();
  const tokens = React.useMemo(() => getThemeTokens(theme), [theme]);
  const isSale = mode === "sales";
  const { currentBusiness } = useBusiness();
  const { data, addItem, updateItem, deleteItem, getItems } = useData();
  const { config } = useConfig();
  const location = useLocation();
  const barcodeScanEnabled = !!config.features?.barcode;

  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState([
    {
      itemId: "",
      name: "",
      qty: 1,
      price: 0,
      taxRate: 0,
      discountPercent: 0,
      total: 0,
    },
  ]);
  const [description, setDescription] = useState("");
  const [noGST, setNoGST] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [printingTx, setPrintingTx] = useState(null);
  const [printTrigger, setPrintTrigger] = useState(0);
  const [paperSize, setPaperSize] = useState("A4");
  const printRef = useRef();
  const bulkPrintRef = useRef();

  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [bulkPrintDateFrom, setBulkPrintDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [bulkPrintDateTo, setBulkPrintDateTo] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [bulkPrintSelectedIds, setBulkPrintSelectedIds] = useState(
    () => new Set(),
  );
  const [advance, setAdvance] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [taxMode, setTaxMode] = useState("exclusive");

  const [pfProduct, setPfProduct] = useState(null);
  const [pfDate, setPfDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [pfNoGST, setPfNoGST] = useState(false);
  const [pfCustomers, setPfCustomers] = useState([
    { _key: 1, party: null, qty: 1, price: "", discountPercent: "" },
  ]);
  const [pfIsSaving, setPfIsSaving] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [quickAddParty, setQuickAddParty] = useState({
    open: false,
    name: "",
    phone: "",
    balance: "",
  });
  const [quickAddPartyLoading, setQuickAddPartyLoading] = useState(false);
  const quickAddPartyCallbackRef = useRef(null);
  const [quickAddItem, setQuickAddItem] = useState({
    open: false,
    name: "",
    salePrice: "",
    purchasePrice: "",
    taxRate: 18,
    stock: "",
    unit: "NOS",
  });
  const [quickAddItemLoading, setQuickAddItemLoading] = useState(false);
  const quickAddItemCallbackRef = useRef(null);
  const savingRef = useRef(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    partyId: "",
    minAmount: "",
    maxAmount: "",
    status: "all",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [entryMode, setEntryMode] = useState("customer");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePrint = useReactToPrint({ contentRef: printRef });
  const handleBulkPrint = useReactToPrint({
    contentRef: bulkPrintRef,
    copyStyles: true,
  });

  const parties = getItems("parties").filter(
    (p) =>
      p.businessId === currentBusiness?.id &&
      p.type === (isSale ? "Customer" : "Vendor"),
  );
  const stockItems = getItems("items").filter(
    (item) => item.businessId === currentBusiness?.id,
  );

  useEffect(() => {
    if (!location.state?.scannedBarcode) return;
    const { scannedBarcode, scannedItem } = location.state;
    window.history.replaceState({}, document.title);
    const found =
      scannedItem ||
      (() => {
        const allItems = getItems("items").filter(
          (i) => i.businessId === currentBusiness?.id,
        );
        return allItems.find(
          (i) => i.barcode === scannedBarcode || i.id === scannedBarcode,
        );
      })();
    if (found) {
      const price = Number(isSale ? found.salePrice : found.purchasePrice) || 0;
      const taxRate = Number(found.taxRate) || 0;
      setView("create");
      setEditId(null);
      setSelectedParty(null);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setItems([
        {
          itemId: found.id,
          name: found.name,
          qty: 1,
          price,
          taxRate,
          discountPercent: 0,
          total: price * (1 + taxRate / 100),
        },
      ]);
      setSnack({
        open: true,
        message: `${found.name} added from scan`,
        severity: "success",
      });
    } else {
      setSnack({
        open: true,
        message: `No item found for barcode: ${scannedBarcode}`,
        severity: "warning",
      });
    }
  }, [location.state]);

  const handleBarcodeScan = (barcode) => {
    const stockItems = getItems("items").filter(
      (i) => i.businessId === currentBusiness?.id,
    );
    const foundItem = stockItems.find(
      (i) => i.barcode === barcode || i.id === barcode,
    );
    if (!foundItem) {
      setSnack({
        open: true,
        message: `No item found for barcode: ${barcode}`,
        severity: "warning",
      });
      return;
    }
    const emptyIdx = items.findIndex((i) => !i.itemId);
    if (emptyIdx >= 0) {
      updateItemRow(emptyIdx, "itemId", foundItem.id);
    } else {
      const price =
        Number(foundItem[isSale ? "salePrice" : "purchasePrice"]) || 0;
      const taxRate = Number(foundItem.taxRate) || 0;
      setItems((prev) => [
        ...prev,
        {
          itemId: foundItem.id,
          name: foundItem.name,
          qty: 1,
          price,
          taxRate,
          discountPercent: 0,
          total: price * (1 + taxRate / 100),
        },
      ]);
    }
    setSnack({
      open: true,
      message: `Added: ${foundItem.name}`,
      severity: "success",
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const generateInvoiceNumber = (date, isSaleMode) => {
    const d = date ? new Date(date + "T12:00:00") : new Date();
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = monthNames[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    const prefix = isSaleMode
      ? `INVSB${month}${year}-`
      : `BILL${month}${year}-`;
    const existing = getItems(isSaleMode ? "sales" : "purchases").filter(
      (tx) =>
        tx.businessId === currentBusiness?.id &&
        tx.invoiceNumber?.startsWith(prefix),
    );
    let maxSerial = 0;
    existing.forEach((tx) => {
      const parts = tx.invoiceNumber.split("-");
      const serial = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
    });
    return `${prefix}${String(maxSerial + 1).padStart(4, "0")}`;
  };

  const tableName = isSale ? "sales" : "purchases";
  const transactions = getItems(tableName)
    .filter((tx) => tx.businessId === currentBusiness?.id)
    .filter((tx) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (
          !tx.partyName?.toLowerCase().includes(s) &&
          !tx.invoiceNumber?.toLowerCase().includes(s)
        )
          return false;
      }
      if (filters.dateFrom && new Date(tx.date) < new Date(filters.dateFrom))
        return false;
      if (filters.dateTo && new Date(tx.date) > new Date(filters.dateTo))
        return false;
      if (filters.partyId && tx.partyId !== filters.partyId) return false;
      if (filters.minAmount && tx.totalAmount < parseFloat(filters.minAmount))
        return false;
      if (filters.maxAmount && tx.totalAmount > parseFloat(filters.maxAmount))
        return false;
      if (filters.status !== "all" && tx.status !== filters.status)
        return false;
      return true;
    })
    .reverse();

  const totalRevenue = transactions.reduce(
    (s, t) => s + (t.totalAmount || 0),
    0,
  );

  const bulkPrintQueue = React.useMemo(() => {
    if (!isSale || !currentBusiness?.id) return [];
    const from = bulkPrintDateFrom
      ? new Date(bulkPrintDateFrom + "T00:00:00")
      : null;
    const to = bulkPrintDateTo
      ? new Date(bulkPrintDateTo + "T23:59:59.999")
      : null;
    const allSales = getItems("sales")
      .filter((tx) => tx.businessId === currentBusiness.id)
      .filter((tx) => {
        if (!from && !to) return true;
        const d = new Date(tx.date + "T12:00:00");
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    const byParty = {};
    allSales.forEach((tx) => {
      const key = tx.partyId;
      if (!byParty[key])
        byParty[key] = {
          partyId: tx.partyId,
          partyName: tx.partyName,
          transactions: [],
        };
      byParty[key].transactions.push(tx);
    });
    return Object.values(byParty).sort((a, b) =>
      (a.partyName || "").localeCompare(b.partyName || ""),
    );
  }, [
    isSale,
    currentBusiness?.id,
    bulkPrintDateFrom,
    bulkPrintDateTo,
    getItems,
  ]);

  const bulkPrintAllBills = React.useMemo(() => {
    const list = [];
    bulkPrintQueue.forEach((group) => {
      group.transactions.forEach((tx) => list.push(tx));
    });
    return list;
  }, [bulkPrintQueue]);

  useEffect(() => {
    if (!bulkPrintOpen) return;
    setBulkPrintSelectedIds(new Set(bulkPrintAllBills.map((tx) => tx.id)));
  }, [bulkPrintOpen, bulkPrintDateFrom, bulkPrintDateTo, bulkPrintAllBills]);

  const handleBulkPrintClick = () => {
    if (bulkPrintMergedList.length === 0) return;
    setIsBulkPrinting(true);
    setTimeout(() => {
      handleBulkPrint();
      setIsBulkPrinting(false);
    }, 300);
  };

  const toggleBulkPrintBill = (id) => {
    setBulkPrintSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllBulkPrintBills = () =>
    setBulkPrintSelectedIds(new Set(bulkPrintAllBills.map((tx) => tx.id)));
  const deselectAllBulkPrintBills = () => setBulkPrintSelectedIds(new Set());

  const bulkPrintFlatList = React.useMemo(
    () => bulkPrintAllBills.filter((tx) => bulkPrintSelectedIds.has(tx.id)),
    [bulkPrintAllBills, bulkPrintSelectedIds],
  );

  const bulkPrintMergedList = React.useMemo(() => {
    const groupKey = (tx) => `${tx.partyId}|${tx.date}`;
    const groups = {};
    bulkPrintFlatList.forEach((tx) => {
      const key = groupKey(tx);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.values(groups)
      .map((txs) => {
        const first = txs[0];
        if (txs.length === 1) return { ...first, type: "Sales", id: first.id };
        const mergedItems = txs.flatMap((t) =>
          (t.items || []).map((it) => ({ ...it })),
        );
        const subtotal = txs.reduce((s, t) => s + (t.subtotal ?? 0), 0);
        const taxAmount = txs.reduce((s, t) => s + (t.taxAmount ?? 0), 0);
        const discountAmount = txs.reduce(
          (s, t) => s + (t.discountAmount ?? 0),
          0,
        );
        const totalAmount = txs.reduce((s, t) => s + (t.totalAmount ?? 0), 0);
        const invoiceLabel =
          txs.length > 1
            ? `${first.invoiceNumber} (+${txs.length - 1} more on same day)`
            : first.invoiceNumber;
        return {
          ...first,
          id: `merged-${first.partyId}-${first.date}`,
          type: "Sales",
          invoiceNumber: invoiceLabel,
          items: mergedItems,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          discountPercent: first.discountPercent ?? 0,
        };
      })
      .sort((a, b) => {
        const nameCmp = (a.partyName || "").localeCompare(b.partyName || "");
        if (nameCmp !== 0) return nameCmp;
        return (a.date || "").localeCompare(b.date || "");
      });
  }, [bulkPrintFlatList]);

  useEffect(() => {
    if (view === "create" && !savingRef.current && !isSaving) {
      const today = new Date().toISOString().split("T")[0];
      setInvoiceNumber(generateInvoiceNumber(today, isSale));
      setItems([
        {
          itemId: "",
          name: "",
          qty: 1,
          price: "",
          taxRate: 0,
          discountPercent: "",
          total: 0,
        },
      ]);
      setSelectedParty(null);
      setInvoiceDate(today);
      setDescription("");
      setNoGST(false);
      setDiscountPercent(0);
      setAdvance("");
      setDueDate("");
      setTaxMode("inclusive");
      setEditId(null);
    }
  }, [view, isSale, isSaving]); // eslint-disable-line

  useEffect(() => {
    if (view === "create" && !savingRef.current && !isSaving)
      setInvoiceNumber(generateInvoiceNumber(invoiceDate, isSale));
  }, [invoiceDate, isSale]); // eslint-disable-line

  useEffect(() => {
    setPage(0);
  }, [filters]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "s" &&
        (view === "create" || view === "edit")
      ) {
        e.preventDefault();
        if (!savingRef.current) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && view === "create") {
        e.preventDefault();
        if (!savingRef.current) handleSave({ saveAndCreateNew: true });
      }
      if (
        e.key === "Escape" &&
        !isTyping &&
        (view === "create" || view === "edit")
      )
        setView("list");
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && view === "list") {
        e.preventDefault();
        setView("create");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]); // eslint-disable-line

  const addItemRow = () =>
    setItems([
      ...items,
      {
        itemId: "",
        name: "",
        qty: 1,
        price: "",
        taxRate: 0,
        discountPercent: "",
        total: 0,
      },
    ]);
  const removeItemRow = (index) => {
    const n = items.filter((_, i) => i !== index);
    setItems(
      n.length
        ? n
        : [
            {
              itemId: "",
              name: "",
              qty: 1,
              price: "",
              taxRate: 0,
              discountPercent: "",
              total: 0,
            },
          ],
    );
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === "itemId") {
      const selected = stockItems.find((i) => i.id === value);
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
    if (taxMode === "inclusive") {
      item.total = qty * price * (1 - discountPercent / 100);
    } else {
      item.total =
        qty * price * (1 - discountPercent / 100) * (1 + taxRate / 100);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const getBasePrice = (item) => {
    const price = Number(item.price) || 0;
    const taxRate = Number(item.taxRate) || 0;
    return taxMode === "inclusive" ? price / (1 + taxRate / 100) : price;
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
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
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
      const currentAdvance =
        currentIsSale && !editId ? Number(advance) || 0 : 0;
      const currentDueDate = dueDate;
      const currentTaxMode = taxMode;
      if (!currentBusinessId) {
        alert("Business not selected.");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
      if (!currentSelectedParty?.id) {
        alert("Please select a party");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
      if (!currentInvoiceNumber?.trim()) {
        alert("Please enter an invoice/bill number");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
      if (!currentInvoiceDate) {
        alert("Please select a date");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      const getBasePriceFinal = (item) => {
        const price = Number(item.price) || 0;
        const taxRate = Number(item.taxRate) || 0;
        return currentTaxMode === "inclusive"
          ? price / (1 + taxRate / 100)
          : price;
      };
      const finalSubtotal = currentItems.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const discPct = Number(item.discountPercent) || 0;
        return sum + qty * getBasePriceFinal(item) * (1 - discPct / 100);
      }, 0);
      const finalDiscountAmount =
        finalSubtotal * (currentDiscountPercent / 100);
      const finalTaxAmount = currentNoGST
        ? 0
        : currentItems.reduce((sum, item) => {
            const qty = Number(item.qty) || 0;
            const discPct = Number(item.discountPercent) || 0;
            const taxRate = Number(item.taxRate) || 0;
            const base = getBasePriceFinal(item);
            return sum + qty * base * (1 - discPct / 100) * (taxRate / 100);
          }, 0);
      const finalTotalAmount =
        finalSubtotal - finalDiscountAmount + finalTaxAmount;
      const cleanedItems = currentItems
        .filter((i) => i.itemId && Number(i.qty) > 0 && Number(i.price) >= 0)
        .map((item) => ({
          ...item,
          taxRate: currentNoGST ? 0 : item.taxRate,
          discountPercent: item.discountPercent ?? 0,
        }));
      if (!cleanedItems.length) {
        alert("Please add at least one item with valid quantity and price");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
      if (finalTotalAmount <= 0) {
        alert("Total amount must be greater than zero");
        savingRef.current = false;
        setIsSaving(false);
        return;
      }

      const transactionData = {
        businessId: currentBusinessId,
        partyId: currentSelectedParty.id,
        partyName: currentSelectedParty.name || "Unknown",
        type: currentIsSale ? "Sales" : "Purchases",
        date: currentInvoiceDate,
        invoiceNumber: currentInvoiceNumber.trim(),
        items: cleanedItems,
        description: currentDescription || "",
        noGST: currentNoGST,
        discountPercent: currentDiscountPercent,
        discountAmount: finalDiscountAmount,
        subtotal: finalSubtotal,
        taxAmount: finalTaxAmount,
        totalAmount: finalTotalAmount,
        advance: currentAdvance,
        dueDate: currentDueDate || "",
        taxMode: currentTaxMode,
      };

      const currentData = data;
      const currentParties = getItems("parties");
      const currentStockItems = getItems("items");
      let editedOldTx = null;
      let editedOldParty = null;
      let editedOldBalanceRollback = null;

      if (currentEditId) {
        const tName = currentIsSale ? "sales" : "purchases";
        const oldTx = currentData[tName]?.find((t) => t.id === currentEditId);
        if (oldTx) {
          editedOldTx = oldTx;
          const oldBalanceRollback = currentIsSale
            ? -oldTx.totalAmount
            : oldTx.totalAmount;
          editedOldBalanceRollback = oldBalanceRollback;
          const oldParty = currentParties.find((p) => p.id === oldTx.partyId);
          editedOldParty = oldParty;
          if (oldParty)
            await updateItem("parties", oldTx.partyId, {
              balance: oldParty.balance + oldBalanceRollback,
            });
          for (const item of oldTx.items) {
            if (item.itemId) {
              const stockItem = currentStockItems.find(
                (i) => i.id === item.itemId,
              );
              if (stockItem)
                await updateItem("items", item.itemId, {
                  stock:
                    stockItem.stock + (currentIsSale ? item.qty : -item.qty),
                });
            }
          }
        }
      }

      const tName = currentIsSale ? "sales" : "purchases";
      let saved = currentEditId
        ? await updateItem(tName, currentEditId, transactionData)
        : await addItem(tName, transactionData);
      if (!saved) {
        const savedItem = getItems(tName).find(
          (t) =>
            t.invoiceNumber === transactionData.invoiceNumber &&
            t.partyId === transactionData.partyId,
        );
        if (!savedItem) {
          alert("Failed to save transaction.");
          savingRef.current = false;
          setIsSaving(false);
          return;
        }
      }

      const balanceChange = currentIsSale
        ? transactionData.totalAmount
        : -transactionData.totalAmount;
      const newParty = currentParties.find(
        (p) => p.id === currentSelectedParty.id,
      );
      if (newParty) {
        const isEditSameParty =
          currentEditId &&
          editedOldTx &&
          editedOldParty &&
          editedOldParty.id === currentSelectedParty.id;
        const newBalance = isEditSameParty
          ? editedOldParty.balance +
            editedOldBalanceRollback +
            balanceChange -
            currentAdvance
          : newParty.balance + balanceChange - currentAdvance;
        await updateItem("parties", currentSelectedParty.id, {
          balance: newBalance,
        });
      }

      if (currentIsSale && !currentEditId && currentAdvance > 0) {
        await addItem("payments", {
          businessId: currentBusinessId,
          partyId: currentSelectedParty.id,
          partyName: currentSelectedParty.name || "Unknown",
          type: "PaymentIn",
          totalAmount: currentAdvance,
          date: currentInvoiceDate,
          paymentMode: "Cash",
          referenceNo: `ADV-${currentInvoiceNumber.trim()}`,
          notes: `Advance received for invoice ${currentInvoiceNumber.trim()}`,
        });
      }

      for (const item of transactionData.items) {
        if (item.itemId) {
          const stockItem = currentStockItems.find((i) => i.id === item.itemId);
          if (stockItem)
            await updateItem("items", item.itemId, {
              stock: stockItem.stock + (currentIsSale ? -item.qty : item.qty),
            });
        }
      }

      if (saveAndCreateNew) {
        const today = new Date().toISOString().split("T")[0];
        setInvoiceNumber(generateInvoiceNumber(today, currentIsSale));
        setItems([
          {
            itemId: "",
            name: "",
            qty: 1,
            price: "",
            taxRate: 0,
            discountPercent: "",
            total: 0,
          },
        ]);
        setSelectedParty(null);
        setInvoiceDate(today);
        setDescription("");
        setNoGST(false);
        setDiscountPercent(0);
        setAdvance("");
        setDueDate("");
        setTaxMode("inclusive");
        setEditId(null);
        setView("create");
      } else {
        setAdvance("");
        setView("list");
        setEditId(null);
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("An error occurred while saving. Please try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (tx) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${isSale ? "invoice" : "bill"}?`,
      )
    )
      return;
    try {
      const party = getItems("parties").find((p) => p.id === tx.partyId);
      if (party)
        updateItem("parties", tx.partyId, {
          balance: party.balance + (isSale ? -tx.totalAmount : tx.totalAmount),
        });
      for (const item of tx.items) {
        if (item.itemId) {
          const stockItem = getItems("items").find((i) => i.id === item.itemId);
          if (stockItem)
            updateItem("items", item.itemId, {
              stock: stockItem.stock + (isSale ? item.qty : -item.qty),
            });
        }
      }
      deleteItem(isSale ? "sales" : "purchases", tx.id);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Error deleting record: " + error.message);
    }
  };

  const startEdit = (tx) => {
    setEditId(tx.id);
    setSelectedParty(
      parties.find((p) => p.id === tx.partyId) || {
        id: tx.partyId,
        name: tx.partyName,
      },
    );
    setInvoiceDate(tx.date);
    setInvoiceNumber(tx.invoiceNumber);
    setItems(
      tx.items.map((i) => ({ ...i, discountPercent: i.discountPercent ?? 0 })),
    );
    setDescription(tx.description || "");
    setNoGST(tx.noGST || false);
    setDiscountPercent(tx.discountPercent ?? 0);
    setAdvance(tx.advance ? String(tx.advance) : "");
    setDueDate(tx.dueDate || "");
    setTaxMode(tx.taxMode || "inclusive");
    setView("edit");
  };

  useEffect(() => {
    if (!printTrigger) return;
    handlePrint();
  }, [printTrigger]); // eslint-disable-line

  const triggerPrint = (tx) => {
    setPrintingTx(tx);
    setPrintTrigger((t) => t + 1);
  };

  const handleShare = (tx) => {
    const text = `*Invoice from ${currentBusiness?.name || "Solo Books"}*\n\nInvoice #: ${tx.invoiceNumber}\nDate: ${tx.date}\nParty: ${tx.partyName}\nTotal: ₹${tx.totalAmount.toFixed(2)}\n\nShared via Solo Books`;
    if (navigator.share)
      navigator
        .share({ title: `Invoice ${tx.invoiceNumber}`, text })
        .catch((e) => console.error(e));
    else
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const addPfCustomer = () =>
    setPfCustomers((prev) => [
      ...prev,
      {
        _key: Date.now(),
        party: null,
        qty: 1,
        price: pfProduct ? (pfProduct.salePrice ?? "") : "",
        discountPercent: "",
      },
    ]);
  const removePfCustomer = (key) => {
    setPfCustomers((prev) => {
      const next = prev.filter((r) => r._key !== key);
      return next.length
        ? next
        : [
            {
              _key: Date.now(),
              party: null,
              qty: 1,
              price: pfProduct ? (pfProduct.salePrice ?? "") : "",
              discountPercent: "",
            },
          ];
    });
  };
  const updatePfCustomer = (key, field, value) =>
    setPfCustomers((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  const pfRowTotal = (row) => {
    if (!pfProduct) return 0;
    const qty = Number(row.qty) || 0;
    const price = Number(row.price) || 0;
    const discPct = Number(row.discountPercent) || 0;
    const taxRate = pfNoGST ? 0 : Number(pfProduct.taxRate) || 0;
    return qty * price * (1 - discPct / 100) * (1 + taxRate / 100);
  };

  const handlePfSave = async () => {
    if (!currentBusiness?.id) {
      alert("Business not selected.");
      return;
    }
    if (!pfProduct) {
      alert("Please select a product first.");
      return;
    }
    const validRows = pfCustomers.filter((r) => r.party && Number(r.qty) > 0);
    if (!validRows.length) {
      alert("Please add at least one customer with a quantity.");
      return;
    }
    setPfIsSaving(true);
    try {
      const baseTime = Date.now();
      const rowData = validRows.map((row, idx) => {
        const qty = Number(row.qty);
        const price = Number(row.price) || 0;
        const discPct = Number(row.discountPercent) || 0;
        const taxRate = pfNoGST ? 0 : Number(pfProduct.taxRate) || 0;
        const subtotal = qty * price * (1 - discPct / 100);
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        return {
          ...row,
          qty,
          price,
          discPct,
          taxRate,
          subtotal,
          taxAmount,
          totalAmount,
          invoiceNumber: `INV-${String(baseTime + idx).slice(-8)}`,
        };
      });
      const balanceDelta = {};
      rowData.forEach((rd) => {
        const key = rd.party.id;
        if (!balanceDelta[key])
          balanceDelta[key] = { party: rd.party, delta: 0 };
        balanceDelta[key].delta += rd.totalAmount;
      });
      for (const rd of rowData) {
        await addItem("sales", {
          businessId: currentBusiness.id,
          partyId: rd.party.id,
          partyName: rd.party.name || "Unknown",
          type: "Sales",
          date: pfDate,
          invoiceNumber: rd.invoiceNumber,
          items: [
            {
              itemId: pfProduct.id,
              name: pfProduct.name,
              qty: rd.qty,
              price: rd.price,
              taxRate: rd.taxRate,
              discountPercent: rd.discPct,
              total: rd.totalAmount,
            },
          ],
          noGST: pfNoGST,
          discountPercent: 0,
          discountAmount: 0,
          subtotal: rd.subtotal,
          taxAmount: rd.taxAmount,
          totalAmount: rd.totalAmount,
          advance: 0,
        });
      }
      const currentParties = getItems("parties");
      for (const { party, delta } of Object.values(balanceDelta)) {
        const p = currentParties.find((x) => x.id === party.id);
        if (p)
          await updateItem("parties", party.id, {
            balance: (p.balance || 0) + delta,
          });
      }
      const totalQty = rowData.reduce((s, r) => s + r.qty, 0);
      const stockItem = getItems("items").find((i) => i.id === pfProduct.id);
      if (stockItem)
        await updateItem("items", pfProduct.id, {
          stock: (stockItem.stock || 0) - totalQty,
        });
      setSnack({
        open: true,
        message: `${rowData.length} invoice${rowData.length > 1 ? "s" : ""} saved successfully!`,
        severity: "success",
      });
      setPfProduct(null);
      setPfDate(new Date().toISOString().split("T")[0]);
      setPfNoGST(false);
      setPfCustomers([
        {
          _key: Date.now(),
          party: null,
          qty: 1,
          price: "",
          discountPercent: "",
        },
      ]);
      setView("list");
    } catch (err) {
      console.error("Product-first save error:", err);
      alert("Error saving invoices: " + err.message);
    } finally {
      setPfIsSaving(false);
    }
  };

  const openQuickAddParty = (inputValue, callback) => {
    quickAddPartyCallbackRef.current = callback;
    setQuickAddParty({
      open: true,
      name: inputValue || "",
      phone: "",
      balance: "",
    });
  };
  const handleQuickSaveParty = async () => {
    const name = quickAddParty.name.trim();
    if (!name) return;
    setQuickAddPartyLoading(true);
    try {
      const newParty = {
        id: Date.now(),
        businessId: currentBusiness.id,
        name,
        type: isSale ? "Customer" : "Vendor",
        phone: quickAddParty.phone || "",
        gstNumber: "",
        address: "",
        balance: Number(quickAddParty.balance) || 0,
      };
      await addItem("parties", newParty);
      if (quickAddPartyCallbackRef.current)
        quickAddPartyCallbackRef.current(newParty);
      setQuickAddParty({ open: false, name: "", phone: "", balance: "" });
    } finally {
      setQuickAddPartyLoading(false);
    }
  };

  const openQuickAddItem = (inputValue, callback) => {
    quickAddItemCallbackRef.current = callback;
    setQuickAddItem({
      open: true,
      name: inputValue || "",
      salePrice: "",
      purchasePrice: "",
      taxRate: 18,
      stock: "",
      unit: "NOS",
    });
  };
  const handleQuickSaveItem = async () => {
    const name = quickAddItem.name.trim();
    if (!name) return;
    setQuickAddItemLoading(true);
    try {
      const newStockItem = {
        id: Date.now(),
        businessId: currentBusiness.id,
        name,
        unit: quickAddItem.unit || "NOS",
        salePrice: Number(quickAddItem.salePrice) || 0,
        purchasePrice: Number(quickAddItem.purchasePrice) || 0,
        taxRate: Number(quickAddItem.taxRate) || 18,
        stock: Number(quickAddItem.stock) || 0,
        hsnCode: "",
      };
      await addItem("items", newStockItem);
      if (quickAddItemCallbackRef.current)
        quickAddItemCallbackRef.current(newStockItem);
      setQuickAddItem({
        open: false,
        name: "",
        salePrice: "",
        purchasePrice: "",
        taxRate: 18,
        stock: "",
        unit: "NOS",
      });
    } finally {
      setQuickAddItemLoading(false);
    }
  };

  /* ── Quick-add dialogs ── */
  const quickAddDialogs = (
    <>
      <Dialog
        open={quickAddParty.open}
        onClose={() =>
          !quickAddPartyLoading &&
          setQuickAddParty((s) => ({ ...s, open: false }))
        }
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: tokens.radius.xl,
            boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, pb: 0.5, pt: 2.5, fontSize: "1.1rem" }}
        >
          Add New {isSale ? "Customer" : "Vendor"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}
          >
            <TextField
              label="Name *"
              value={quickAddParty.name}
              autoFocus
              fullWidth
              size="small"
              onChange={(e) =>
                setQuickAddParty((s) => ({ ...s, name: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleQuickSaveParty()}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.sm },
              }}
            />
            <TextField
              label="Phone"
              value={quickAddParty.phone}
              fullWidth
              size="small"
              onChange={(e) =>
                setQuickAddParty((s) => ({ ...s, phone: e.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.sm },
              }}
            />
            <TextField
              label="Opening Balance (₹)"
              type="number"
              value={quickAddParty.balance}
              fullWidth
              size="small"
              placeholder="0"
              onChange={(e) =>
                setQuickAddParty((s) => ({ ...s, balance: e.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.sm },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setQuickAddParty((s) => ({ ...s, open: false }))}
            disabled={quickAddPartyLoading}
            sx={{ borderRadius: tokens.radius.sm }}
          >
            Cancel
          </Button>
          <GradientButton
            tokens={tokens}
            onClick={handleQuickSaveParty}
            disabled={quickAddPartyLoading || !quickAddParty.name.trim()}
            size="medium"
          >
            {quickAddPartyLoading ? "Creating…" : "Create & Select"}
          </GradientButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={quickAddItem.open}
        onClose={() =>
          !quickAddItemLoading &&
          setQuickAddItem((s) => ({ ...s, open: false }))
        }
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: tokens.radius.xl,
            boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, pb: 0.5, pt: 2.5, fontSize: "1.1rem" }}
        >
          Add New Item
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}
          >
            <TextField
              label="Item Name *"
              value={quickAddItem.name}
              autoFocus
              fullWidth
              size="small"
              onChange={(e) =>
                setQuickAddItem((s) => ({ ...s, name: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleQuickSaveItem()}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.sm },
              }}
            />
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField
                  label="Sale Price (₹)"
                  type="number"
                  value={quickAddItem.salePrice}
                  size="small"
                  fullWidth
                  placeholder="0"
                  onChange={(e) =>
                    setQuickAddItem((s) => ({
                      ...s,
                      salePrice: e.target.value,
                    }))
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Purchase Price (₹)"
                  type="number"
                  value={quickAddItem.purchasePrice}
                  size="small"
                  fullWidth
                  placeholder="0"
                  onChange={(e) =>
                    setQuickAddItem((s) => ({
                      ...s,
                      purchasePrice: e.target.value,
                    }))
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Tax Rate"
                  value={quickAddItem.taxRate}
                  size="small"
                  fullWidth
                  onChange={(e) =>
                    setQuickAddItem((s) => ({ ...s, taxRate: e.target.value }))
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                >
                  {[0, 5, 12, 18, 28].map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}%
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Unit"
                  value={quickAddItem.unit}
                  size="small"
                  fullWidth
                  onChange={(e) =>
                    setQuickAddItem((s) => ({ ...s, unit: e.target.value }))
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                >
                  {["NOS", "BAGS", "BOX", "KGS", "Ltr", "Mtr", "Pcs"].map(
                    (u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Opening Stock"
                  type="number"
                  value={quickAddItem.stock}
                  size="small"
                  fullWidth
                  placeholder="0"
                  onChange={(e) =>
                    setQuickAddItem((s) => ({ ...s, stock: e.target.value }))
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setQuickAddItem((s) => ({ ...s, open: false }))}
            disabled={quickAddItemLoading}
            sx={{ borderRadius: tokens.radius.sm }}
          >
            Cancel
          </Button>
          <GradientButton
            tokens={tokens}
            onClick={handleQuickSaveItem}
            disabled={quickAddItemLoading || !quickAddItem.name.trim()}
            size="medium"
          >
            {quickAddItemLoading ? "Creating…" : "Create & Select"}
          </GradientButton>
        </DialogActions>
      </Dialog>
    </>
  );

  /* ── Shared input field styles ── */
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: tokens.radius.sm,
      transition: "box-shadow 0.15s",
      "&.Mui-focused": {
        boxShadow: `0 0 0 3px ${alpha(tokens.primary, 0.12)}`,
      },
    },
  };

  /* ════════════════════════════════════════════════════════════════
     CREATE / EDIT VIEWS
  ════════════════════════════════════════════════════════════════ */
  if (view === "create" || view === "edit") {
    /* ── PRODUCT FIRST ── */
    if (isSale && entryMode === "product" && view === "create") {
      const pfTotal = pfCustomers.reduce((s, r) => s + pfRowTotal(r), 0);
      const pfValidCount = pfCustomers.filter(
        (r) => r.party && Number(r.qty) > 0,
      ).length;
      return (
        <>
          <Box sx={{ maxWidth: 1050, mx: "auto", pb: 4 }}>
            {/* Header */}
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
            >
              <Tooltip title="Back to list (Esc)">
                <IconButton
                  onClick={() => setView("list")}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: tokens.radius.sm,
                    "&:hover": {
                      bgcolor: tokens.primarySoft,
                      borderColor: tokens.primaryBorder,
                    },
                  }}
                >
                  <ChevronLeft size={20} />
                </IconButton>
              </Tooltip>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}
                >
                  Product First — Bulk Sales
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Select a product, then assign customers with their quantities
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={entryMode}
                exclusive
                onChange={(_e, v) => v && setEntryMode(v)}
                size="small"
                sx={{
                  bgcolor: "rgba(0,0,0,0.04)",
                  p: "3px",
                  borderRadius: tokens.radius.sm,
                  border: "none",
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    borderRadius: `${tokens.radius.sm} !important`,
                    mx: 0.25,
                  },
                }}
              >
                <ToggleButton
                  value="customer"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                    py: 0.75,
                    fontSize: "0.8rem",
                    "&.Mui-selected": {
                      bgcolor: "white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      color: tokens.primary,
                    },
                  }}
                >
                  <Users size={14} style={{ marginRight: 5 }} />
                  Customer First
                </ToggleButton>
                <ToggleButton
                  value="product"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                    py: 0.75,
                    fontSize: "0.8rem",
                    "&.Mui-selected": {
                      bgcolor: "white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      color: tokens.primary,
                    },
                  }}
                >
                  <Package size={14} style={{ marginRight: 5 }} />
                  Product First
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Step 1 */}
            <EnhancedCard accent sx={{ mb: 2 }} tokens={tokens}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionLabel icon={Package} tokens={tokens}>
                  Step 1 — Choose Product
                </SectionLabel>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={7}>
                    <Autocomplete
                      options={stockItems}
                      getOptionLabel={(o) => o.name || ""}
                      value={pfProduct}
                      onChange={(_e, v) => {
                        setPfProduct(v);
                        if (v)
                          setPfCustomers((prev) =>
                            prev.map((r) => ({
                              ...r,
                              price: r.price || (v.salePrice ?? ""),
                            })),
                          );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Product *"
                          placeholder="Search product…"
                          size="small"
                          sx={inputSx}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Invoice Date"
                      value={pfDate}
                      onChange={(e) => setPfDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={6}
                    sm={2}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={pfNoGST}
                          onChange={(e) => setPfNoGST(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          No GST
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </Grid>
                  {pfProduct && (
                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                        <StatPill
                          tokens={tokens}
                          label="GST"
                          value={`${pfNoGST ? "0" : pfProduct.taxRate || 0}%`}
                        />
                        <StatPill
                          tokens={tokens}
                          label="In Stock"
                          value={pfProduct.stock ?? "—"}
                          color="success"
                        />
                        <StatPill
                          tokens={tokens}
                          label="Sale Price"
                          value={`₹${pfProduct.salePrice || 0}`}
                        />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </EnhancedCard>

            {/* Step 2 */}
            <EnhancedCard sx={{ mb: 2 }} tokens={tokens}>
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(0,0,0,0.015)",
                }}
              >
                <Box>
                  <SectionLabel icon={Users} tokens={tokens}>
                    Step 2 — Add Customers
                  </SectionLabel>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.25, display: "block" }}
                  >
                    Each row creates a separate invoice
                  </Typography>
                </Box>
                <Chip
                  label={`${pfCustomers.length} row${pfCustomers.length !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: tokens.primarySoft,
                    color: tokens.primary,
                    border: `1px solid ${tokens.primaryBorder}`,
                  }}
                />
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0,0,0,0.018)" }}>
                      {[
                        "#",
                        "Customer *",
                        "Qty",
                        "Rate (₹)",
                        "Disc %",
                        "Amount",
                        "",
                      ].map((h, i) => (
                        <TableCell
                          key={i}
                          align={
                            i >= 2 && i <= 4
                              ? "center"
                              : i === 5
                                ? "right"
                                : "left"
                          }
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "text.secondary",
                            pl: i === 0 ? 3 : undefined,
                            pr: i === 6 ? 1 : undefined,
                            width: [36, undefined, 100, 140, 90, 130, 44][i],
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pfCustomers.map((row, idx) => {
                      const rowAmt = pfRowTotal(row);
                      return (
                        <TableRow
                          key={row._key}
                          sx={{ "&:hover": { bgcolor: tokens.primarySoft } }}
                        >
                          <TableCell
                            sx={{
                              pl: 3,
                              color: "text.secondary",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                            }}
                          >
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={{ py: 1.25 }}>
                            <Autocomplete
                              options={parties}
                              getOptionLabel={(o) => o.name || ""}
                              value={row.party}
                              onChange={(_e, v) =>
                                updatePfCustomer(row._key, "party", v)
                              }
                              size="small"
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="Search customer…"
                                  size="small"
                                  sx={inputSx}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.25 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={row.qty}
                              placeholder="1"
                              onChange={(e) =>
                                updatePfCustomer(
                                  row._key,
                                  "qty",
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: {
                                  min: 0,
                                  step: 1,
                                  style: { textAlign: "center" },
                                },
                              }}
                              sx={{ width: 80, ...inputSx }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.25 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={row.price}
                              placeholder="0.00"
                              onChange={(e) =>
                                updatePfCustomer(
                                  row._key,
                                  "price",
                                  e.target.value,
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: {
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      ₹
                                    </InputAdornment>
                                  ),
                                  min: 0,
                                  step: 0.01,
                                  style: { textAlign: "right" },
                                },
                              }}
                              sx={{ width: 120, ...inputSx }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.25 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={row.discountPercent}
                              placeholder="0"
                              onChange={(e) =>
                                updatePfCustomer(
                                  row._key,
                                  "discountPercent",
                                  e.target.value,
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: {
                                  min: 0,
                                  max: 100,
                                  step: 0.5,
                                  style: { textAlign: "center" },
                                },
                              }}
                              sx={{ width: 76, ...inputSx }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.25 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 800,
                                color:
                                  rowAmt > 0 ? tokens.primary : "text.disabled",
                              }}
                            >
                              {rowAmt > 0 ? `₹${rowAmt.toFixed(2)}` : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ pr: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => removePfCustomer(row._key)}
                              sx={{
                                color: "text.disabled",
                                "&:hover": {
                                  color: tokens.error,
                                  bgcolor: `${tokens.error}12`,
                                },
                                borderRadius: tokens.radius.sm,
                              }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box
                sx={{
                  p: 2.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(0,0,0,0.012)",
                }}
              >
                <Button
                  startIcon={<Plus size={15} />}
                  variant="outlined"
                  size="small"
                  onClick={addPfCustomer}
                  sx={{
                    fontWeight: 700,
                    borderRadius: tokens.radius.sm,
                    textTransform: "none",
                    borderColor: tokens.primaryBorder,
                    color: tokens.primary,
                    "&:hover": { bgcolor: tokens.primarySoft },
                  }}
                >
                  Add Customer
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Each row = one invoice
                </Typography>
                <Box
                  sx={{
                    ml: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {pfValidCount} valid invoice{pfValidCount !== 1 ? "s" : ""}
                  </Typography>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.75,
                      bgcolor: tokens.primarySoft,
                      borderRadius: tokens.radius.sm,
                      border: `1px solid ${tokens.primaryBorder}`,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 800, color: tokens.primary }}
                    >
                      ₹{pfTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </EnhancedCard>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Box sx={{ display: "flex", gap: 1 }}>
                {[{ key: "Esc", label: "Back" }].map((s) => (
                  <Box
                    key={s.key}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box
                      component="kbd"
                      sx={{
                        px: 0.9,
                        py: 0.3,
                        borderRadius: "6px",
                        bgcolor: "rgba(0,0,0,0.06)",
                        border: "1px solid rgba(0,0,0,0.12)",
                        fontSize: "0.65rem",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "text.secondary",
                      }}
                    >
                      {s.key}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <GradientButton
                tokens={tokens}
                startIcon={pfIsSaving ? null : <Save size={17} />}
                onClick={handlePfSave}
                disabled={pfIsSaving || !pfProduct || pfValidCount === 0}
                sx={{ px: 4, py: 1.2, fontSize: "0.95rem" }}
              >
                {pfIsSaving
                  ? "Saving…"
                  : `Save ${pfValidCount || ""} Invoice${pfValidCount !== 1 ? "s" : ""}`}
              </GradientButton>
            </Box>
          </Box>
          {quickAddDialogs}
        </>
      );
    }

    /* ── CUSTOMER FIRST (default) ── */
    return (
      <>
        <Box sx={{ pb: 2 }}>
          {/* Page header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Tooltip title="Back to list (Esc)">
              <IconButton
                onClick={() => setView("list")}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: tokens.radius.sm,
                  "&:hover": {
                    bgcolor: tokens.primarySoft,
                    borderColor: tokens.primaryBorder,
                  },
                }}
              >
                <ChevronLeft size={20} />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}
              >
                {view === "edit"
                  ? `Edit ${isSale ? "Invoice" : "Bill"}`
                  : `New ${isSale ? "Sales Invoice" : "Purchase Bill"}`}
              </Typography>
              {view === "create" && (
                <Typography variant="caption" color="text.secondary">
                  Fill in the details and save
                </Typography>
              )}
            </Box>
            {isSale && view === "create" && (
              <ToggleButtonGroup
                value={entryMode}
                exclusive
                onChange={(_e, v) => v && setEntryMode(v)}
                size="small"
                sx={{
                  bgcolor: "rgba(0,0,0,0.04)",
                  p: "3px",
                  borderRadius: tokens.radius.sm,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    borderRadius: `${tokens.radius.sm} !important`,
                    mx: 0.25,
                  },
                }}
              >
                <ToggleButton
                  value="customer"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                    py: 0.75,
                    fontSize: "0.8rem",
                    "&.Mui-selected": {
                      bgcolor: "white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      color: tokens.primary,
                    },
                  }}
                >
                  <Users size={14} style={{ marginRight: 5 }} />
                  Customer First
                </ToggleButton>
                <ToggleButton
                  value="product"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                    py: 0.75,
                    fontSize: "0.8rem",
                    "&.Mui-selected": {
                      bgcolor: "white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      color: tokens.primary,
                    },
                  }}
                >
                  <Package size={14} style={{ marginRight: 5 }} />
                  Product First
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              {/* Card 1: Invoice Details */}
              <EnhancedCard accent tokens={tokens}>
                <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                  <SectionLabel icon={FileText} tokens={tokens}>
                    {isSale ? "Sales Invoice Details" : "Purchase Bill Details"}
                  </SectionLabel>
                </Box>
                <CardContent sx={{ pt: 1, pb: 2, px: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={parties}
                        getOptionLabel={(option) =>
                          option._addNew ? option._display : option.name || ""
                        }
                        value={selectedParty}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        filterOptions={(options, { inputValue }) => {
                          const lower = inputValue.toLowerCase();
                          const filtered = options.filter(
                            (o) =>
                              !o._addNew &&
                              o.name.toLowerCase().includes(lower),
                          );
                          filtered.push({
                            _addNew: true,
                            _display: inputValue
                              ? `+ Create "${inputValue}"`
                              : `+ New ${isSale ? "Customer" : "Vendor"}`,
                            _inputValue: inputValue,
                            id: "__add_new_party__",
                            name: "",
                          });
                          return filtered;
                        }}
                        onChange={(_e, v) => {
                          if (v?._addNew) {
                            openQuickAddParty(v._inputValue, (p) =>
                              setSelectedParty(p),
                            );
                            return;
                          }
                          setSelectedParty(v);
                        }}
                        renderOption={(props, option) =>
                          option._addNew ? (
                            <li {...props} key="__add_new_party__">
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  color: tokens.primary,
                                  fontWeight: 700,
                                  fontSize: "0.875rem",
                                }}
                              >
                                <Plus size={14} />
                                {option._display}
                              </Box>
                            </li>
                          ) : (
                            <li {...props}>{option.name}</li>
                          )
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={isSale ? "Customer *" : "Vendor *"}
                            placeholder={`Select ${isSale ? "customer" : "vendor"}…`}
                            size="small"
                            sx={inputSx}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label={isSale ? "Invoice No." : "Bill No."}
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Receipt size={14} color={tokens.primary} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Calendar size={14} color={tokens.primary} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Due Date (optional)"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sm={9}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: "text.secondary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Tax Mode:
                      </Typography>
                      <ToggleButtonGroup
                        value={taxMode}
                        exclusive
                        onChange={(_, v) => v && setTaxMode(v)}
                        size="small"
                        sx={{
                          bgcolor: "rgba(0,0,0,0.04)",
                          p: "3px",
                          borderRadius: tokens.radius.sm,
                          "& .MuiToggleButtonGroup-grouped": {
                            border: 0,
                            borderRadius: `${tokens.radius.sm} !important`,
                            mx: 0.25,
                          },
                        }}
                      >
                        <ToggleButton
                          value="exclusive"
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.6,
                            fontSize: "0.78rem",
                            "&.Mui-selected": {
                              bgcolor: "white",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                              color: tokens.primary,
                            },
                          }}
                        >
                          + Tax (Excl.)
                        </ToggleButton>
                        <ToggleButton
                          value="inclusive"
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.6,
                            fontSize: "0.78rem",
                            "&.Mui-selected": {
                              bgcolor: "white",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                              color: tokens.primary,
                            },
                          }}
                        >
                          Tax in price (Incl.)
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Grid>
                  </Grid>
                </CardContent>
              </EnhancedCard>

              {/* Card 2: Items */}
              <EnhancedCard tokens={tokens}>
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.75,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    bgcolor: "rgba(0,0,0,0.015)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <SectionLabel icon={Package} tokens={tokens}>
                    Items & Quantities
                  </SectionLabel>
                  <Chip
                    label={`${items.length} item${items.length !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: tokens.primarySoft,
                      color: tokens.primary,
                      border: `1px solid ${tokens.primaryBorder}`,
                      fontSize: "0.72rem",
                    }}
                  />
                </Box>
                <CardContent sx={{ p: 0 }}>
                  <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 700 }}>
                      <TableHead sx={{ bgcolor: "rgba(0,0,0,0.018)" }}>
                        <TableRow>
                          {[
                            ["Item / Product", { pl: 3, minWidth: 280 }],
                            ["Qty", { width: 90, align: "center" }],
                            ["Rate (₹)", { width: 150, align: "right" }],
                            ["Disc %", { width: 100, align: "center" }],
                            ["GST %", { width: 90, align: "center" }],
                            ["Amount", { width: 130, pr: 3, align: "right" }],
                            ["", { width: 44 }],
                          ].map(([label, style], i) => (
                            <TableCell
                              key={i}
                              align={style.align}
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "text.secondary",
                                ...style,
                              }}
                            >
                              {label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              "&:hover": { bgcolor: "rgba(79,70,229,0.025)" },
                              transition: "background 0.12s",
                            }}
                          >
                            <TableCell sx={{ pl: 3, py: 1.25 }}>
                              <Autocomplete
                                options={stockItems}
                                getOptionLabel={(option) =>
                                  option._addNew
                                    ? option._display
                                    : option.name || ""
                                }
                                size="small"
                                value={
                                  stockItems.find(
                                    (i) => i.id === item.itemId,
                                  ) || null
                                }
                                isOptionEqualToValue={(opt, val) =>
                                  opt.id === val.id
                                }
                                filterOptions={(options, { inputValue }) => {
                                  const lower = inputValue.toLowerCase();
                                  const filtered = options.filter(
                                    (o) =>
                                      !o._addNew &&
                                      o.name.toLowerCase().includes(lower),
                                  );
                                  filtered.push({
                                    _addNew: true,
                                    _display: inputValue
                                      ? `+ Create "${inputValue}"`
                                      : "+ New Item",
                                    _inputValue: inputValue,
                                    id: "__add_new_item__",
                                    name: "",
                                  });
                                  return filtered;
                                }}
                                onChange={(_e, v) => {
                                  if (v?._addNew) {
                                    openQuickAddItem(v._inputValue, (newItem) =>
                                      updateItemRow(
                                        index,
                                        "itemId",
                                        newItem.id,
                                      ),
                                    );
                                    return;
                                  }
                                  updateItemRow(index, "itemId", v?.id);
                                }}
                                renderOption={(props, option) =>
                                  option._addNew ? (
                                    <li {...props} key="__add_new_item__">
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.75,
                                          color: tokens.primary,
                                          fontWeight: 700,
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        <Plus size={14} />
                                        {option._display}
                                      </Box>
                                    </li>
                                  ) : (
                                    <li {...props}>{option.name}</li>
                                  )
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Search or select item…"
                                    variant="outlined"
                                    size="small"
                                    sx={inputSx}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.25 }}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.qty}
                                onChange={(e) =>
                                  updateItemRow(
                                    index,
                                    "qty",
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                slotProps={{
                                  input: {
                                    style: { textAlign: "center" },
                                    min: 0,
                                    step: 1,
                                  },
                                }}
                                sx={{ width: 74, ...inputSx }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.25 }}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.price}
                                placeholder="0.00"
                                onChange={(e) =>
                                  updateItemRow(index, "price", e.target.value)
                                }
                                onFocus={(e) => e.target.select()}
                                slotProps={{
                                  input: {
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            color: "text.secondary",
                                            fontWeight: 600,
                                          }}
                                        >
                                          ₹
                                        </Typography>
                                      </InputAdornment>
                                    ),
                                    style: { textAlign: "right" },
                                    min: 0,
                                    step: 0.01,
                                  },
                                }}
                                sx={{ width: 130, ...inputSx }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.25 }}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.discountPercent ?? ""}
                                placeholder="0"
                                onChange={(e) =>
                                  updateItemRow(
                                    index,
                                    "discountPercent",
                                    e.target.value,
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                slotProps={{
                                  input: {
                                    style: { textAlign: "center" },
                                    min: 0,
                                    max: 100,
                                    step: 0.5,
                                  },
                                }}
                                sx={{ width: 84, ...inputSx }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.25 }}>
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: "100px",
                                  bgcolor:
                                    item.taxRate > 0
                                      ? tokens.primarySoft
                                      : "rgba(0,0,0,0.04)",
                                  border: "1px solid",
                                  borderColor:
                                    item.taxRate > 0
                                      ? tokens.primaryBorder
                                      : "transparent",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color:
                                      item.taxRate > 0
                                        ? tokens.primary
                                        : "text.secondary",
                                  }}
                                >
                                  {item.taxRate || 0}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ pr: 3, py: 1.25 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 800, color: tokens.primary }}
                              >
                                ₹{(item.total || 0).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ pr: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => removeItemRow(index)}
                                sx={{
                                  color: "text.disabled",
                                  "&:hover": {
                                    color: tokens.error,
                                    bgcolor: `${tokens.error}12`,
                                  },
                                  borderRadius: tokens.radius.sm,
                                }}
                              >
                                <Trash2 size={15} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexWrap: "wrap",
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                      bgcolor: "rgba(0,0,0,0.012)",
                    }}
                  >
                    <Button
                      startIcon={<Plus size={16} />}
                      onClick={addItemRow}
                      variant="outlined"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        borderRadius: tokens.radius.sm,
                        borderColor: tokens.primaryBorder,
                        color: tokens.primary,
                        textTransform: "none",
                        "&:hover": {
                          bgcolor: tokens.primarySoft,
                          borderColor: tokens.primary,
                        },
                      }}
                    >
                      Add Item
                    </Button>
                    {barcodeScanEnabled && (
                      <Button
                        startIcon={<ScanLine size={15} />}
                        onClick={() => setScannerOpen(true)}
                        variant="outlined"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          borderRadius: tokens.radius.sm,
                          textTransform: "none",
                        }}
                      >
                        Scan Barcode
                      </Button>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.5 }}
                    >
                      Click a field and type to replace
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.75,
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Notes (optional)"
                          placeholder="Any remarks for this invoice…"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          multiline
                          rows={2}
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Invoice Discount %"
                          value={discountPercent || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setDiscountPercent(parseFloat(e.target.value) || 0)
                          }
                          onFocus={(e) => e.target.select()}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  %
                                </InputAdornment>
                              ),
                              min: 0,
                              max: 100,
                              step: 0.5,
                            },
                          }}
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid
                        item
                        xs={6}
                        sm={3}
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={noGST}
                              onChange={(e) => setNoGST(e.target.checked)}
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              No GST
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </EnhancedCard>
            </Box>

            {/* ── Summary Sidebar ── */}
            <Box sx={{ width: { xs: "100%", lg: 296 }, flexShrink: 0 }}>
              <Box sx={{ position: { lg: "sticky" }, top: { lg: 68 } }}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1.5px solid ${tokens.primaryBorder}`,
                    bgcolor: "rgba(79,70,229,0.025)",
                    borderRadius: tokens.radius.lg,
                    overflow: "hidden",
                    borderTop: `3px solid ${tokens.primary}`,
                    boxShadow: `0 4px 20px ${alpha(tokens.primary, 0.08)}`,
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      pt: 2,
                      pb: 1,
                      borderBottom: "1px solid rgba(79,70,229,0.1)",
                    }}
                  >
                    <SectionLabel icon={TrendingUp} tokens={tokens}>
                      Summary
                    </SectionLabel>
                  </Box>
                  <CardContent sx={{ pt: 1.75, pb: 2, px: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.6,
                        mb: 1.5,
                      }}
                    >
                      {[
                        {
                          label: "Subtotal",
                          value: `₹${calculateSubtotal().toFixed(2)}`,
                        },
                        ...(discountPercent > 0
                          ? [
                              {
                                label: `Discount (${discountPercent}%)`,
                                value: `-₹${calculateDiscountAmount().toFixed(2)}`,
                                color: tokens.error,
                              },
                            ]
                          : []),
                        {
                          label: noGST
                            ? "GST (disabled)"
                            : `GST (${taxMode === "inclusive" ? "Incl." : "Excl."})`,
                          value: `₹${calculateTax().toFixed(2)}`,
                        },
                      ].map((r) => (
                        <Box
                          key={r.label}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {r.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: r.color || "text.primary",
                            }}
                          >
                            {r.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: tokens.radius.md,
                        background: `linear-gradient(135deg, ${alpha(tokens.primary, 0.08)} 0%, ${alpha(tokens.primaryLight, 0.06)} 100%)`,
                        border: `1px solid ${tokens.primaryBorder}`,
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "text.secondary" }}
                        >
                          Invoice Total
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 900,
                            color: tokens.primary,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          ₹{calculateTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Advance — sales only */}
                    {isSale && (
                      <Box
                        sx={{
                          mb: 1.5,
                          p: 1.5,
                          borderRadius: tokens.radius.md,
                          bgcolor: tokens.successSoft,
                          border: `1px solid rgba(16,185,129,0.2)`,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            mb: 1,
                          }}
                        >
                          <Wallet size={14} color={tokens.success} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color: "success.dark",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontSize: "0.65rem",
                            }}
                          >
                            Advance Received
                          </Typography>
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          placeholder="0.00"
                          value={advance}
                          onChange={(e) => setAdvance(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          disabled={view === "edit"}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  ₹
                                </InputAdornment>
                              ),
                              min: 0,
                              step: 0.01,
                            },
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              bgcolor: "white",
                              borderRadius: tokens.radius.sm,
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {view === "edit"
                            ? `Advance of ₹${Number(advance) || 0} was recorded on creation`
                            : "Auto-recorded as payment in"}
                        </Typography>
                        {Number(advance) > 0 && view === "create" && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mt: 1.25,
                              pt: 1.25,
                              borderTop: "1px dashed rgba(16,185,129,0.3)",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: tokens.error }}
                            >
                              Balance Due
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800, color: tokens.error }}
                            >
                              ₹
                              {Math.max(
                                0,
                                calculateTotal() - Number(advance),
                              ).toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    <GradientButton
                      tokens={tokens}
                      fullWidth
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      startIcon={<Save size={18} />}
                      sx={{ py: 1.3, fontSize: "0.95rem", mb: 1 }}
                    >
                      {isSaving
                        ? "Saving…"
                        : view === "edit"
                          ? "Update Transaction"
                          : "Save Transaction"}
                    </GradientButton>

                    {view === "create" && (
                      <Button
                        variant="outlined"
                        fullWidth
                        size="large"
                        startIcon={<Plus size={17} />}
                        onClick={() => handleSave({ saveAndCreateNew: true })}
                        disabled={isSaving}
                        sx={{
                          borderRadius: tokens.radius.md,
                          py: 1,
                          fontWeight: 700,
                          textTransform: "none",
                          fontSize: "0.88rem",
                          borderColor: tokens.primaryBorder,
                          color: tokens.primary,
                          "&:hover": {
                            borderColor: tokens.primary,
                            bgcolor: tokens.primarySoft,
                          },
                        }}
                      >
                        Save & Create New
                      </Button>
                    )}

                    <Box
                      sx={{
                        mt: 1.25,
                        pt: 1.25,
                        borderTop: "1px solid rgba(0,0,0,0.07)",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                        justifyContent: "center",
                      }}
                    >
                      {[
                        {
                          key: "Ctrl+S",
                          label: view === "edit" ? "Update" : "Save",
                        },
                        ...(view === "create"
                          ? [{ key: "Ctrl+↵", label: "Save & New" }]
                          : []),
                        { key: "Esc", label: "Back" },
                      ].map((s) => (
                        <Box
                          key={s.key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.4,
                          }}
                        >
                          <Box
                            component="kbd"
                            sx={{
                              px: 0.8,
                              py: 0.25,
                              borderRadius: "5px",
                              bgcolor: "rgba(0,0,0,0.06)",
                              border: "1px solid rgba(0,0,0,0.12)",
                              fontSize: "0.6rem",
                              fontFamily: "monospace",
                              fontWeight: 800,
                              color: "text.secondary",
                            }}
                          >
                            {s.key}
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.68rem" }}
                          >
                            {s.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>
        {quickAddDialogs}
      </>
    );
  } // end create/edit

  /* ════════════════════════════════════════════════════════════════
     LIST VIEW
  ════════════════════════════════════════════════════════════════ */

  const activeFilterCount =
    [
      filters.dateFrom,
      filters.dateTo,
      filters.partyId,
      filters.minAmount,
      filters.maxAmount,
    ].filter(Boolean).length + (filters.status !== "all" ? 1 : 0);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "flex-end" },
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: tokens.radius.md,
                background: `linear-gradient(135deg, ${tokens.primaryDark}, ${tokens.primaryLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${alpha(tokens.primary, 0.3)}`,
              }}
            >
              {isSale ? (
                <Receipt size={20} color="white" />
              ) : (
                <ShoppingBasket size={20} color="white" />
              )}
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}
            >
              {isSale ? "Sales Invoices" : "Purchase Bills"}
            </Typography>
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, pl: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {isSale
                ? "Track customer receivables & revenue"
                : "Manage purchases & vendor payables"}
            </Typography>
            {transactions.length > 0 && (
              <>
                <Box
                  sx={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    bgcolor: "text.disabled",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: tokens.primary }}
                >
                  {transactions.length} records · ₹
                  {totalRevenue.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            select
            size="small"
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            sx={{
              minWidth: 90,
              "& .MuiOutlinedInput-root": {
                borderRadius: tokens.radius.sm,
                bgcolor: "white",
              },
            }}
          >
            {["A4", "A5", "Letter", "Legal"].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          {isSale && (
            <Button
              variant="outlined"
              startIcon={<Printer size={17} />}
              onClick={() => setBulkPrintOpen(true)}
              size="medium"
              sx={{
                borderRadius: tokens.radius.md,
                fontWeight: 700,
                textTransform: "none",
                borderColor: "divider",
                color: "text.secondary",
                "&:hover": {
                  borderColor: tokens.primaryBorder,
                  color: tokens.primary,
                  bgcolor: tokens.primarySoft,
                },
              }}
            >
              Bulk Print
            </Button>
          )}
          <GradientButton
            tokens={tokens}
            startIcon={
              isSale ? <Receipt size={17} /> : <ShoppingBasket size={17} />
            }
            onClick={() => setView("create")}
            size="medium"
            sx={{ px: 2.5, py: 1 }}
          >
            {isSale ? "New Invoice" : "New Bill"}
          </GradientButton>
        </Box>
      </Box>

      {/* ── Search & Filters ── */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: tokens.radius.lg,
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: tokens.shadow.card,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "center",
              mb: showFilters ? 2 : 0,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder={`Search by ${isSale ? "customer" : "vendor"} or invoice number…`}
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#9ca3af" />
                    </InputAdornment>
                  ),
                  ...(filters.search && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setFilters({ ...filters, search: "" })}
                          sx={{ p: 0.25 }}
                        >
                          <X size={14} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: tokens.radius.md,
                  bgcolor: "rgba(0,0,0,0.02)",
                  "&:hover": { bgcolor: "white" },
                  "&.Mui-focused": {
                    bgcolor: "white",
                    boxShadow: `0 0 0 3px ${alpha(tokens.primary, 0.1)}`,
                  },
                },
              }}
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={
                showFilters || activeFilterCount > 0 ? "contained" : "outlined"
              }
              size="small"
              startIcon={<Filter size={15} />}
              sx={{
                whiteSpace: "nowrap",
                borderRadius: tokens.radius.md,
                fontWeight: 700,
                textTransform: "none",
                px: 2,
                flexShrink: 0,
                ...(showFilters || activeFilterCount > 0
                  ? {
                      bgcolor: tokens.primary,
                      "&:hover": { bgcolor: tokens.primaryDark },
                    }
                  : {
                      borderColor: "divider",
                      color: "text.secondary",
                      "&:hover": {
                        borderColor: tokens.primaryBorder,
                        color: tokens.primary,
                        bgcolor: tokens.primarySoft,
                      },
                    }),
              }}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                onClick={() =>
                  setFilters({
                    dateFrom: "",
                    dateTo: "",
                    partyId: "",
                    minAmount: "",
                    maxAmount: "",
                    status: "all",
                    search: "",
                  })
                }
                variant="text"
                size="small"
                color="error"
                sx={{
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                  textTransform: "none",
                  flexShrink: 0,
                }}
              >
                Clear all
              </Button>
            )}
          </Box>

          {showFilters && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={parties}
                  getOptionLabel={(option) => option.name}
                  value={parties.find((p) => p.id === filters.partyId) || null}
                  onChange={(e, value) =>
                    setFilters({ ...filters, partyId: value?.id || "" })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={isSale ? "Customer" : "Vendor"}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: tokens.radius.sm,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={6} md={1.5}>
                <TextField
                  fullWidth
                  label="Min ₹"
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) =>
                    setFilters({ ...filters, minAmount: e.target.value })
                  }
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={6} md={1.5}>
                <TextField
                  fullWidth
                  label="Max ₹"
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAmount: e.target.value })
                  }
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}
        </Box>
      </Card>

      {/* ── Transactions table ── */}
      <Card
        elevation={0}
        sx={{
          borderRadius: tokens.radius.lg,
          border: "1px solid rgba(0,0,0,0.07)",
          overflow: "hidden",
          boxShadow: tokens.shadow.card,
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "rgba(0,0,0,0.018)",
                  borderBottom: "2px solid rgba(0,0,0,0.06)",
                }}
              >
                {[
                  ["Date", {}],
                  ["Document #", {}],
                  [isSale ? "Customer" : "Vendor", {}],
                  ["Due Date", {}],
                  ["Amount", { align: "right" }],
                  ["Status", { align: "center" }],
                  ["Actions", { align: "right" }],
                ].map(([label, sx]) => (
                  <TableCell
                    key={label}
                    align={sx.align}
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "text.secondary",
                      py: 1.5,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((tx, i) => (
                  <TableRow
                    key={tx.id}
                    hover
                    sx={{
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": { bgcolor: "rgba(79,70,229,0.025)" },
                      transition: "background 0.1s",
                      cursor: "default",
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "text.secondary",
                          fontSize: "0.82rem",
                        }}
                      >
                        {formatDate(tx.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: tokens.primary,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.83rem",
                            fontFamily: "monospace",
                            color: "text.primary",
                          }}
                        >
                          {tx.invoiceNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {tx.partyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {tx.dueDate ? (
                        <Box
                          sx={{
                            display: "inline-flex",
                            px: 1,
                            py: 0.25,
                            borderRadius: "100px",
                            bgcolor:
                              new Date(tx.dueDate + "T00:00:00") < new Date()
                                ? `${tokens.error}12`
                                : "rgba(0,0,0,0.04)",
                            border: "1px solid",
                            borderColor:
                              new Date(tx.dueDate + "T00:00:00") < new Date()
                                ? `${tokens.error}30`
                                : "transparent",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color:
                                new Date(tx.dueDate + "T00:00:00") < new Date()
                                  ? tokens.error
                                  : "text.secondary",
                            }}
                          >
                            {formatDate(tx.dueDate)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: tokens.primary,
                          fontSize: "0.92rem",
                        }}
                      >
                        ₹{tx.totalAmount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "inline-flex",
                          px: 1.25,
                          py: 0.3,
                          borderRadius: "100px",
                          bgcolor: tokens.successSoft,
                          border: `1px solid rgba(16,185,129,0.2)`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: tokens.success,
                            fontSize: "0.7rem",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Completed
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.25,
                          justifyContent: "flex-end",
                        }}
                      >
                        {[
                          {
                            icon: <Edit size={16} />,
                            title: "Edit",
                            onClick: () => startEdit(tx),
                            color: tokens.primary,
                          },
                          {
                            icon: <Printer size={16} />,
                            title: "Print",
                            onClick: () => triggerPrint(tx),
                            color: tokens.primary,
                          },
                          {
                            icon: <Share2 size={16} />,
                            title: "Share on WhatsApp",
                            onClick: () => handleShare(tx),
                            color: "#25D366",
                          },
                          {
                            icon: <Trash2 size={16} />,
                            title: "Delete",
                            onClick: () => handleDelete(tx),
                            color: tokens.error,
                          },
                        ].map(({ icon, title, onClick, color }) => (
                          <Tooltip key={title} title={title} placement="top">
                            <IconButton
                              size="small"
                              onClick={onClick}
                              sx={{
                                borderRadius: tokens.radius.sm,
                                color: "text.disabled",
                                "&:hover": { color, bgcolor: `${color}12` },
                                transition: "all 0.15s",
                                p: 0.75,
                              }}
                            >
                              {icon}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "50%",
                          bgcolor: tokens.primarySoft,
                        }}
                      >
                        {isSale ? (
                          <Receipt size={28} color={tokens.primary} />
                        ) : (
                          <ShoppingBasket size={28} color={tokens.primary} />
                        )}
                      </Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, color: "text.secondary" }}
                      >
                        No transactions yet
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Create your first {isSale ? "invoice" : "bill"} to get
                        started
                      </Typography>
                      <GradientButton
                        tokens={tokens}
                        onClick={() => setView("create")}
                        size="small"
                        sx={{ mt: 0.5, px: 3 }}
                      >
                        {isSale ? "New Invoice" : "New Bill"}
                      </GradientButton>
                    </Box>
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
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            borderTop: "1px solid rgba(0,0,0,0.06)",
            "& .MuiTablePagination-select": { borderRadius: tokens.radius.sm },
          }}
        />
      </Card>

      {/* ── Bulk print dialog ── */}
      {isSale && (
        <Dialog
          open={bulkPrintOpen}
          onClose={() => !isBulkPrinting && setBulkPrintOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: tokens.radius.xl,
              boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
            },
          }}
        >
          <DialogTitle
            sx={{ fontWeight: 800, pt: 2.5, pb: 0.5, fontSize: "1.05rem" }}
          >
            Print Bills by Date Range
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a date range, then choose which bills to print. Bills from
              the same customer on the same day are merged.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From date"
                  type="date"
                  value={bulkPrintDateFrom}
                  onChange={(e) => setBulkPrintDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To date"
                  type="date"
                  value={bulkPrintDateTo}
                  onChange={(e) => setBulkPrintDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: tokens.radius.sm,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {bulkPrintSelectedIds.size} of {bulkPrintAllBills.length}{" "}
                    bills selected
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button
                      size="small"
                      onClick={selectAllBulkPrintBills}
                      disabled={bulkPrintAllBills.length === 0}
                      sx={{ fontWeight: 700, textTransform: "none" }}
                    >
                      Select all
                    </Button>
                    <Button
                      size="small"
                      onClick={deselectAllBulkPrintBills}
                      disabled={bulkPrintAllBills.length === 0}
                      sx={{ fontWeight: 700, textTransform: "none" }}
                    >
                      Deselect all
                    </Button>
                  </Box>
                </Box>
                {bulkPrintAllBills.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No bills in selected range.
                    </Typography>
                  </Box>
                ) : (
                  <List
                    dense
                    sx={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: tokens.radius.md,
                      maxHeight: 280,
                      overflow: "auto",
                    }}
                  >
                    {bulkPrintQueue.map((group) => (
                      <React.Fragment key={group.partyId}>
                        <ListItem
                          sx={{ py: 0.75, bgcolor: tokens.primarySoft }}
                        >
                          <ListItemText
                            primary={group.partyName || "Unknown"}
                            primaryTypographyProps={{
                              fontWeight: 700,
                              variant: "body2",
                              color: tokens.primary,
                            }}
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
                                size="small"
                              />
                            }
                            sx={{ pl: 3 }}
                          >
                            <ListItemText
                              primary={`#${tx.invoiceNumber} · ${formatDate(tx.date)}`}
                              secondary={`₹${(tx.totalAmount || 0).toFixed(2)}`}
                              primaryTypographyProps={{
                                variant: "body2",
                                fontWeight: 600,
                              }}
                              secondaryTypographyProps={{ variant: "caption" }}
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
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button
              onClick={() => setBulkPrintOpen(false)}
              disabled={isBulkPrinting}
              sx={{ borderRadius: tokens.radius.sm }}
            >
              Cancel
            </Button>
            <GradientButton
              tokens={tokens}
              startIcon={<Printer size={16} />}
              onClick={handleBulkPrintClick}
              disabled={bulkPrintMergedList.length === 0 || isBulkPrinting}
              size="medium"
            >
              {isBulkPrinting
                ? "Opening…"
                : `Print ${bulkPrintMergedList.length} bill${bulkPrintMergedList.length !== 1 ? "s" : ""}`}
            </GradientButton>
          </DialogActions>
        </Dialog>
      )}

      {/* Print hidden refs */}
      <div style={{ display: "none" }}>
        <InvoiceTemplate
          ref={printRef}
          transaction={printingTx}
          business={currentBusiness}
          paperSize={paperSize}
          partyBalance={
            printingTx
              ? (parties.find((p) => p.id === printingTx.partyId)?.balance ?? 0)
              : undefined
          }
        />
      </div>
      {isSale && bulkPrintOpen && bulkPrintMergedList.length > 0 && (
        <div
          ref={bulkPrintRef}
          className="bulk-print-content"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            maxWidth: "210mm",
            zIndex: -1,
            opacity: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {bulkPrintMergedList.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                pageBreakAfter:
                  i < bulkPrintMergedList.length - 1 ? "always" : "auto",
                pageBreakInside: "avoid",
              }}
            >
              <InvoiceTemplate
                transaction={{ ...tx, type: "Sales" }}
                business={currentBusiness}
                paperSize={paperSize}
                partyBalance={parties.find((p) => p.id === tx.partyId)?.balance}
              />
            </div>
          ))}
        </div>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          icon={<CheckCircle2 size={18} />}
          sx={{
            width: "100%",
            fontWeight: 700,
            borderRadius: tokens.radius.md,
          }}
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
