import React, { useState, useMemo, useRef } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, MenuItem, Button, Stack, Tabs, Tab,
  Autocomplete, alpha, useTheme
} from '@mui/material';
import { 
  FileText, Filter, Printer, Download, Search, Share2, 
  ArrowUpRight, ArrowDownRight, TrendingUp, Receipt, Wallet
} from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import { useReactToPrint } from 'react-to-print';
import ReportTemplate from './ReportTemplate';

const ReportsPage = () => {
  const theme = useTheme();
  const { currentBusiness } = useBusiness();
  const { getItems } = useData();
  const reportRef = useRef();
  const [paperSize, setPaperSize] = useState('A4');
  
  // States
  const [reportType, setReportType] = useState('sales'); // sales, purchases, ..., net-balance
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    partyId: '',
    itemId: ''
  });

  // Data
  const sales = getItems('sales').filter(s => s.businessId === currentBusiness?.id);
  const purchases = getItems('purchases').filter(p => p.businessId === currentBusiness?.id);
  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id);
  const items = getItems('items').filter(i => i.businessId === currentBusiness?.id);
  const payments = getItems('payments').filter(p => p.businessId === currentBusiness?.id);
  const journalEntries = getItems('journalEntries').filter(j => j.businessId === currentBusiness?.id);

  const filteredData = useMemo(() => {
    let data = [];
    if (reportType === 'sales' || reportType === 'items-sales') data = sales;
    if (reportType === 'purchases' || reportType === 'items-purchase') data = purchases;
    
    return data.filter(tx => {
      const matchesDate = tx.date >= filters.dateFrom && tx.date <= filters.dateTo;
      const matchesParty = !filters.partyId || tx.partyId === filters.partyId;
      const matchesItem = !filters.itemId || tx.items.some(i => i.itemId === filters.itemId);
      return matchesDate && matchesParty && matchesItem;
    });
  }, [reportType, sales, purchases, filters]);

  // Specific Report Generation Logic
  const reportConfig = useMemo(() => {
    const config = {
      title: '',
      columns: [],
      rows: [],
      totals: {}
    };

    if (reportType === 'sales' || reportType === 'purchases') {
      config.title = reportType === 'sales' ? 'Sales Detail Report' : 'Purchase Detail Report';
      config.columns = [
        { key: 'date', header: 'Date' },
        { key: 'invoiceNumber', header: 'Invoice #' },
        { key: 'partyName', header: reportType === 'sales' ? 'Customer' : 'Vendor' },
        { key: 'subtotal', header: 'Subtotal', align: 'right', isTotal: true },
        { key: 'taxAmount', header: 'Tax', align: 'right', isTotal: true },
        { key: 'totalAmount', header: 'Total', align: 'right', isTotal: true }
      ];
      config.rows = filteredData.map(tx => ({
        ...tx,
        subtotal: `₹${tx.subtotal.toFixed(2)}`,
        taxAmount: `₹${tx.taxAmount.toFixed(2)}`,
        totalAmount: `₹${tx.totalAmount.toFixed(2)}`
      }));
      config.totals = {
        subtotal: filteredData.reduce((s, tx) => s + tx.subtotal, 0),
        taxAmount: filteredData.reduce((s, tx) => s + tx.taxAmount, 0),
        totalAmount: filteredData.reduce((s, tx) => s + tx.totalAmount, 0)
      };
    } else if (reportType === 'items-sales' || reportType === 'items-purchase') {
      config.title = reportType === 'items-sales' ? 'Item-wise Sales Report' : 'Item-wise Purchase Report';
      config.columns = [
        { key: 'itemName', header: 'Item Name' },
        { key: 'qty', header: 'Qty Sold', align: 'right', isTotal: true },
        { key: 'avgPrice', header: 'Avg Price', align: 'right' },
        { key: 'totalAmount', header: 'Total Value', align: 'right', isTotal: true }
      ];
      
      const itemStats = {};
      filteredData.forEach(tx => {
        tx.items.forEach(item => {
          if (filters.itemId && item.itemId !== filters.itemId) return;
          if (!itemStats[item.itemId]) {
            itemStats[item.itemId] = { itemName: item.name, qty: 0, totalAmount: 0 };
          }
          itemStats[item.itemId].qty += item.qty;
          itemStats[item.itemId].totalAmount += (item.qty * item.price);
        });
      });

      config.rows = Object.values(itemStats).map(stat => ({
        ...stat,
        avgPrice: `₹${(stat.totalAmount / stat.qty).toFixed(2)}`,
        qty: stat.qty.toString(),
        totalAmount: `₹${stat.totalAmount.toFixed(2)}`
      }));

      config.totals = {
        qty: Object.values(itemStats).reduce((s, i) => s + i.qty, 0),
        totalAmount: Object.values(itemStats).reduce((s, i) => s + i.totalAmount, 0)
      };
    } else if (reportType === 'gst') {
      config.title = 'GST Summary (Sales)';
      config.columns = [
        { key: 'taxRate', header: 'Tax Rate (%)' },
        { key: 'taxableValue', header: 'Taxable Value', align: 'right', isTotal: true },
        { key: 'cgst', header: 'CGST (2.5% / 6% / 9%)', align: 'right', isTotal: true },
        { key: 'sgst', header: 'SGST (2.5% / 6% / 9%)', align: 'right', isTotal: true },
        { key: 'taxAmount', header: 'Total GST', align: 'right', isTotal: true }
      ];

      const gstStats = {};
      sales.filter(tx => tx.date >= filters.dateFrom && tx.date <= filters.dateTo).forEach(tx => {
        tx.items.forEach(item => {
          const rate = item.taxRate || 0;
          if (!gstStats[rate]) gstStats[rate] = { taxRate: `${rate}%`, taxableValue: 0, taxAmount: 0 };
          const taxable = item.qty * item.price;
          const tax = taxable * (rate / 100);
          gstStats[rate].taxableValue += taxable;
          gstStats[rate].taxAmount += tax;
        });
      });

      config.rows = Object.values(gstStats).map(stat => ({
        ...stat,
        taxableValue: `₹${stat.taxableValue.toFixed(2)}`,
        cgst: `₹${(stat.taxAmount / 2).toFixed(2)}`,
        sgst: `₹${(stat.taxAmount / 2).toFixed(2)}`,
        taxAmount: `₹${stat.taxAmount.toFixed(2)}`
      }));

      config.totals = {
        taxableValue: Object.values(gstStats).reduce((s, i) => s + i.taxableValue, 0),
        cgst: Object.values(gstStats).reduce((s, i) => s + i.taxAmount / 2, 0),
        sgst: Object.values(gstStats).reduce((s, i) => s + i.taxAmount / 2, 0),
        taxAmount: Object.values(gstStats).reduce((s, i) => s + i.taxAmount, 0)
      };
    } else if (reportType === 'trial-balance') {
      config.title = 'Trial Balance';
      config.columns = [
        { key: 'account', header: 'Account' },
        { key: 'debit', header: 'Debit', align: 'right', isTotal: true },
        { key: 'credit', header: 'Credit', align: 'right', isTotal: true }
      ];
      const accountBalances = {};
      const addToAccount = (name, debit, credit) => {
        if (!accountBalances[name]) accountBalances[name] = { account: name, debit: 0, credit: 0 };
        accountBalances[name].debit += debit || 0;
        accountBalances[name].credit += credit || 0;
      };
      journalEntries.filter(j => j.date >= filters.dateFrom && j.date <= filters.dateTo).forEach(j => {
        j.lines?.forEach(l => {
          addToAccount(l.account, l.debit || 0, l.credit || 0);
        });
      });
      config.rows = Object.values(accountBalances).map(r => ({
        account: r.account,
        debit: `₹${r.debit.toFixed(2)}`,
        credit: `₹${r.credit.toFixed(2)}`
      }));
      config.totals = {
        debit: Object.values(accountBalances).reduce((s, i) => s + i.debit, 0),
        credit: Object.values(accountBalances).reduce((s, i) => s + i.credit, 0)
      };
    } else if (reportType === 'aged-receivables') {
      config.title = 'Aged Receivables';
      config.columns = [
        { key: 'partyName', header: 'Customer' },
        { key: 'current', header: 'Current', align: 'right', isTotal: true },
        { key: 'days30', header: '1-30 Days', align: 'right', isTotal: true },
        { key: 'days60', header: '31-60 Days', align: 'right', isTotal: true },
        { key: 'days90', header: '61-90 Days', align: 'right', isTotal: true },
        { key: 'over90', header: 'Over 90 Days', align: 'right', isTotal: true },
        { key: 'total', header: 'Total', align: 'right', isTotal: true }
      ];
      const asOf = new Date(filters.dateTo || new Date().toISOString().split('T')[0]);
      const customers = parties.filter(p => p.type === 'Customer');
      const totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
      const aged = customers.map(c => {
        const partySales = sales.filter(s => s.partyId === c.id && s.date <= asOf).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const partyPayments = payments.filter(p => p.partyId === c.id && p.date <= asOf && (p.type === 'PaymentIn' || p.mode === 'payment-in' || !p.mode)).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const outstanding = (c.balance || 0) + partySales - partyPayments;
        if (outstanding <= 0) return null;
        const lastSale = sales.filter(s => s.partyId === c.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const days = lastSale ? Math.floor((asOf - new Date(lastSale.date)) / (24 * 60 * 60 * 1000)) : 0;
        let current = 0, d30 = 0, d60 = 0, d90 = 0, over90 = 0;
        if (days <= 0) current = outstanding;
        else if (days <= 30) d30 = outstanding;
        else if (days <= 60) d60 = outstanding;
        else if (days <= 90) d90 = outstanding;
        else over90 = outstanding;
        totals.current += current;
        totals.days30 += d30;
        totals.days60 += d60;
        totals.days90 += d90;
        totals.over90 += over90;
        totals.total += outstanding;
        return {
          partyName: c.name,
          current: `₹${current.toFixed(2)}`,
          days30: `₹${d30.toFixed(2)}`,
          days60: `₹${d60.toFixed(2)}`,
          days90: `₹${d90.toFixed(2)}`,
          over90: `₹${over90.toFixed(2)}`,
          total: `₹${outstanding.toFixed(2)}`
        };
      }).filter(Boolean);
      config.rows = aged;
      config.totals = totals;
    } else if (reportType === 'aged-payables') {
      config.title = 'Aged Payables';
      config.columns = [
        { key: 'partyName', header: 'Vendor' },
        { key: 'current', header: 'Current', align: 'right', isTotal: true },
        { key: 'days30', header: '1-30 Days', align: 'right', isTotal: true },
        { key: 'days60', header: '31-60 Days', align: 'right', isTotal: true },
        { key: 'days90', header: '61-90 Days', align: 'right', isTotal: true },
        { key: 'over90', header: 'Over 90 Days', align: 'right', isTotal: true },
        { key: 'total', header: 'Total', align: 'right', isTotal: true }
      ];
      const asOf = new Date(filters.dateTo || new Date().toISOString().split('T')[0]);
      const vendors = parties.filter(p => p.type === 'Vendor');
      const totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
      const aged = vendors.map(c => {
        const partyPurchases = purchases.filter(p => p.partyId === c.id && p.date <= asOf).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const partyPayments = payments.filter(p => p.partyId === c.id && p.date <= asOf && (p.mode === 'payment-out' || p.type === 'PaymentOut')).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const outstanding = (c.balance || 0) + partyPurchases - partyPayments;
        if (outstanding >= 0) return null;
        const lastPurch = purchases.filter(p => p.partyId === c.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const days = lastPurch ? Math.floor((asOf - new Date(lastPurch.date)) / (24 * 60 * 60 * 1000)) : 0;
        const absOut = Math.abs(outstanding);
        let current = 0, d30 = 0, d60 = 0, d90 = 0, over90 = 0;
        if (days <= 0) current = absOut;
        else if (days <= 30) d30 = absOut;
        else if (days <= 60) d60 = absOut;
        else if (days <= 90) d90 = absOut;
        else over90 = absOut;
        totals.current += current;
        totals.days30 += d30;
        totals.days60 += d60;
        totals.days90 += d90;
        totals.over90 += over90;
        totals.total += absOut;
        return {
          partyName: c.name,
          current: `₹${current.toFixed(2)}`,
          days30: `₹${d30.toFixed(2)}`,
          days60: `₹${d60.toFixed(2)}`,
          days90: `₹${d90.toFixed(2)}`,
          over90: `₹${over90.toFixed(2)}`,
          total: `₹${absOut.toFixed(2)}`
        };
      }).filter(Boolean);
      config.rows = aged;
      config.totals = totals;
    } else if (reportType === 'net-balance') {
      config.title = 'Net Balance – Customers to Receive';
      config.columns = [
        { key: 'partyName', header: 'Customer' },
        { key: 'lastBill', header: 'Last bill' },
        { key: 'totalBalance', header: 'Total balance', align: 'right', isTotal: true }
      ];
      const customers = parties.filter(p => p.type === 'Customer');
      const withBalance = customers
        .filter(c => (c.balance || 0) > 0)
        .map(c => {
          const customerSales = sales.filter(s => s.partyId === c.id);
          const lastSale = customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          const lastDate = lastSale?.date;
          const dayTotal = lastDate
            ? customerSales.filter(s => s.date === lastDate).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
            : 0;
          return {
            partyName: c.name,
            lastBill: lastDate ? `${lastDate} · ₹${dayTotal.toFixed(2)}` : '—',
            totalBalance: `₹${(c.balance || 0).toFixed(2)}`,
            _numericBalance: c.balance || 0
          };
        })
        .sort((a, b) => (a.partyName || '').localeCompare(b.partyName || ''));
      config.rows = withBalance.map(({ _numericBalance, ...r }) => r);
      config.totals = {
        totalBalance: withBalance.reduce((s, r) => s + r._numericBalance, 0)
      };
    }

    return config;
  }, [reportType, filteredData, filters, sales, purchases, parties, payments, journalEntries]);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
  });

  const handleShare = () => {
    const periodText = reportType === 'net-balance' ? 'From start to till date' : `${filters.dateFrom} to ${filters.dateTo}`;
    const text = `*Report from ${currentBusiness?.name || 'Solo Books'}*\n\n` +
      `Report: ${reportConfig.title}\n` +
      `Period: ${periodText}\n\n` +
      `Shared via Solo Books`;
    
    if (navigator.share) {
      navigator.share({ title: reportConfig.title, text }).catch(e => console.error(e));
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 3 }}>
      <Box sx={{ display: 'none' }}>
        <ReportTemplate 
          ref={reportRef}
          title={reportConfig.title}
          business={currentBusiness}
          filters={{
            ...filters,
            partyName: parties.find(p => p.id === filters.partyId)?.name,
            itemName: items.find(i => i.id === filters.itemId)?.name,
            ...(reportType === 'net-balance' && { periodLabel: 'From start to till date' })
          }}
          reportData={reportConfig}
          paperSize={paperSize}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Reports</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Generate financial reports</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            sx={{ minWidth: 90 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="A5">A5</MenuItem>
            <MenuItem value="Letter">Letter</MenuItem>
            <MenuItem value="Legal">Legal</MenuItem>
          </TextField>
          <Button variant="contained" size="small" startIcon={<Printer size={16} />} onClick={handlePrint}>
            Print
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<Share2 size={16} />}
            onClick={handleShare}
            sx={{ color: '#25D366', borderColor: '#25D366', '&:hover': { borderColor: '#128C7E', bgcolor: 'rgba(37, 211, 102, 0.04)' } }}
          >
            Share
          </Button>
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 2, px: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Filter size={18} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Filters</Typography>
          </Stack>
          
          {reportType === 'net-balance' ? (
            <Typography variant="body2" color="text.secondary">Net Balance shows all customers with outstanding balance — from start to till date. No date filter applied.</Typography>
          ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField 
                fullWidth label="From Date" type="date" value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField 
                fullWidth label="To Date" type="date" value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={parties}
                getOptionLabel={(option) => option.name}
                value={parties.find(p => p.id === filters.partyId) || null}
                onChange={(e, v) => setFilters({...filters, partyId: v?.id || ''})}
                renderInput={(params) => <TextField {...params} label="Filter by Party" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={items}
                getOptionLabel={(option) => option.name}
                value={items.find(i => i.id === filters.itemId) || null}
                onChange={(e, v) => setFilters({...filters, itemId: v?.id || ''})}
                renderInput={(params) => <TextField {...params} label="Filter by Item" />}
              />
            </Grid>
          </Grid>
          )}
        </CardContent>
      </Card>

      <Box sx={{ width: '100%', mb: 2 }}>
        <Tabs 
          value={reportType} 
          onChange={(e, v) => setReportType(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
        >
          <Tab value="sales" label="Sales" icon={<TrendingUp size={16} />} iconPosition="start" />
          <Tab value="purchases" label="Purchases" icon={<Receipt size={16} />} iconPosition="start" />
          <Tab value="items-sales" label="Item Sales" icon={<TrendingUp size={16} />} iconPosition="start" />
          <Tab value="items-purchase" label="Item Purchases" icon={<Receipt size={16} />} iconPosition="start" />
          <Tab value="gst" label="GST" icon={<FileText size={16} />} iconPosition="start" />
          <Tab value="trial-balance" label="Trial Balance" icon={<FileText size={16} />} iconPosition="start" />
          <Tab value="aged-receivables" label="Aged Rec." icon={<ArrowUpRight size={16} />} iconPosition="start" />
          <Tab value="aged-payables" label="Aged Pay." icon={<ArrowDownRight size={16} />} iconPosition="start" />
          <Tab value="net-balance" label="Net Balance" icon={<Wallet size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Report View */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small" sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {reportConfig.columns.map((col, idx) => (
                <TableCell key={idx} align={col.align || 'left'} sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {reportConfig.rows.map((row, rowIdx) => (
              <TableRow key={rowIdx} hover>
                {reportConfig.columns.map((col, colIdx) => (
                  <TableCell key={colIdx} align={col.align || 'left'}>
                    {row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {reportConfig.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={reportConfig.columns.length} align="center" sx={{ py: 6 }}>
                  <Stack alignItems="center" spacing={1} sx={{ opacity: 0.6 }}>
                    <Search size={32} />
                    <Typography variant="body2">No records for the selected criteria</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {reportConfig.rows.length > 0 && (
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                {reportConfig.columns.map((col, idx) => (
                  <TableCell key={idx} align={col.align || 'left'} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {col.isTotal && reportConfig.totals[col.key] != null ? `₹${Number(reportConfig.totals[col.key]).toFixed(2)}` : idx === 0 ? 'TOTAL' : ''}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReportsPage;

