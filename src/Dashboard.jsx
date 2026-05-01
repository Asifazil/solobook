import React, { useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  useTheme, Stack, Button, alpha, Divider, Menu, MenuItem,
  ToggleButtonGroup, ToggleButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip
} from '@mui/material';
import {
  ArrowUpRight, ArrowDownRight, LayoutDashboard,
  Plus, FileText, Wallet, ReceiptText, ShoppingBag, Download, Upload, DollarSign, TrendingUp,
  Bell, Eye, Clock
} from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const MetricCard = ({ title, value, trend, trendLabel, icon: Icon, colorKey = "primary" }) => {
  const theme = useTheme();
  const mainColor = theme.palette[colorKey]?.main || theme.palette.primary.main;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `3px solid ${mainColor}`,
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: '0 4px 16px rgba(15,23,42,0.08)' },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.375rem', sm: '1.5rem' }, fontWeight: 700, color: 'text.primary', mt: 0.5, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ₹{value?.toLocaleString('en-IN') || '0'}
            </Typography>
            {trend !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', p: 0.25, borderRadius: 0.75, bgcolor: trend >= 0 ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12), color: trend >= 0 ? 'success.main' : 'error.main' }}>
                  {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                </Box>
                <Typography variant="caption" sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                  {Math.abs(trend).toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.disabled">{trendLabel}</Typography>
              </Stack>
            )}
          </Box>
          <Box sx={{ bgcolor: alpha(mainColor, 0.1), color: mainColor, p: 1.25, borderRadius: 1.5, flexShrink: 0, ml: 1 }}>
            <Icon size={20} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const { currentBusiness } = useBusiness();
  const { getItems } = useData();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [period, setPeriod] = React.useState('week'); // 'day' | 'week' | 'month' | 'year'

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMenuItemClick = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const salesData = getItems('sales').filter(s => s.businessId === currentBusiness?.id);
  const purchasesData = getItems('purchases').filter(p => p.businessId === currentBusiness?.id);
  const transactions = [
    ...salesData.map(s => ({ ...s, type: 'Sales' })),
    ...purchasesData.map(p => ({ ...p, type: 'Purchases' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const expenses = getItems('expenses').filter(e => e.businessId === currentBusiness?.id);
  const parties = getItems('parties').filter(p => p.businessId === currentBusiness?.id);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const dayMs = 24 * 60 * 60 * 1000;

    let periodStart, periodEnd, prevPeriodStart, prevPeriodEnd;
    if (period === 'day') {
      periodStart = todayStart;
      periodEnd = todayEnd;
      prevPeriodStart = new Date(todayStart.getTime() - dayMs);
      prevPeriodEnd = new Date(todayEnd.getTime() - dayMs);
    } else if (period === 'week') {
      periodEnd = new Date(now);
      periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(periodEnd.getTime() - 6 * dayMs);
      periodStart.setHours(0, 0, 0, 0);
      prevPeriodEnd = new Date(periodStart.getTime() - 1);
      prevPeriodStart = new Date(prevPeriodEnd.getTime() - 6 * dayMs);
      prevPeriodStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      periodEnd = new Date(now);
      periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(periodEnd.getTime() - 29 * dayMs);
      periodStart.setHours(0, 0, 0, 0);
      prevPeriodEnd = new Date(periodStart.getTime() - 1);
      prevPeriodStart = new Date(prevPeriodEnd.getTime() - 29 * dayMs);
      prevPeriodStart.setHours(0, 0, 0, 0);
    } else {
      periodEnd = new Date(now);
      periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      prevPeriodEnd = new Date(periodStart.getTime() - 1);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    }

    const inPeriod = (d) => {
      const t = new Date(d + 'T12:00:00');
      return t >= periodStart && t <= periodEnd;
    };
    const inPrevPeriod = (d) => {
      const t = new Date(d + 'T12:00:00');
      return t >= prevPeriodStart && t <= prevPeriodEnd;
    };

    const getAmount = (txs) => txs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const sales = transactions.filter(t => t.type === 'Sales');
    const purchases = transactions.filter(t => t.type === 'Purchases');
    const currentSales = sales.filter(t => inPeriod(t.date));
    const prevSales = sales.filter(t => inPrevPeriod(t.date));
    const currentPurchases = purchases.filter(t => inPeriod(t.date));
    const prevPurchases = purchases.filter(t => inPrevPeriod(t.date));
    const calcTrend = (curr, prev) => {
      const c = getAmount(curr);
      const p = getAmount(prev);
      return p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;
    };
    const pendingDues = parties.reduce((sum, p) => sum + (p.balance || 0), 0);
    const customers = parties.filter(p => p.type === 'Customer');
    const vendors = parties.filter(p => p.type === 'Vendor');
    const toGet = customers.reduce((sum, p) => sum + Math.max(0, p.balance || 0), 0);
    const toGive = vendors.reduce((sum, p) => sum + (p.balance < 0 ? -p.balance : 0), 0);
    const vendorsWithBalance = vendors.filter(v => (v.balance || 0) < 0).sort((a, b) => (a.balance || 0) - (b.balance || 0));
    const currentExpenses = expenses.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d >= periodStart && d <= periodEnd;
    });
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);

    let chartData = [];
    if (period === 'day') {
      chartData = [{ label: 'Today', sales: getAmount(currentSales), purchases: getAmount(currentPurchases) }];
    } else if (period === 'week') {
      chartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          sales: sales.filter(t => t.date === dateStr).reduce((sum, t) => sum + t.totalAmount, 0),
          purchases: purchases.filter(t => t.date === dateStr).reduce((sum, t) => sum + t.totalAmount, 0),
        };
      });
    } else if (period === 'month') {
      chartData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
          label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          sales: sales.filter(t => t.date === dateStr).reduce((sum, t) => sum + t.totalAmount, 0),
          purchases: purchases.filter(t => t.date === dateStr).reduce((sum, t) => sum + t.totalAmount, 0),
        };
      });
    } else {
      chartData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthSales = sales.filter(t => {
          const txDate = new Date(t.date + 'T12:00:00');
          return txDate >= monthStart && txDate <= monthEnd;
        });
        const monthPurchases = purchases.filter(t => {
          const txDate = new Date(t.date + 'T12:00:00');
          return txDate >= monthStart && txDate <= monthEnd;
        });
        return {
          label: monthStart.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          sales: getAmount(monthSales),
          purchases: getAmount(monthPurchases),
        };
      });
    }

    return {
      totalSales: getAmount(currentSales),
      totalPurchases: getAmount(currentPurchases),
      salesTrend: calcTrend(currentSales, prevSales),
      purchaseTrend: calcTrend(currentPurchases, prevPurchases),
      pendingDues,
      toGet,
      toGive,
      vendorsWithBalance,
      totalExpenses,
      chartData,
      trendLabel: period === 'day' ? 'vs yesterday' : period === 'week' ? 'vs prev week' : period === 'month' ? 'vs prev 30d' : 'vs prev year',
    };
  }, [transactions, parties, expenses, period]);

  const recentTx = useMemo(() => {
    if (!period || period === 'year') return transactions.slice(0, 5);
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let periodStart;
    if (period === 'day') periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') periodStart = new Date(todayEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
    else periodStart = new Date(todayEnd.getTime() - 29 * 24 * 60 * 60 * 1000);
    return transactions
      .filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d >= periodStart && d <= todayEnd;
      })
      .slice(0, 5);
  }, [transactions, period]);

  const examReminders = useMemo(() => {
    const opticals = getItems('opticals').filter(o => o.businessId === currentBusiness?.id);
    const today = new Date();
    const REMINDER_DAYS = { '1month': 30, '6months': 182, '1year': 365 };
    return opticals.filter(o => {
      if (!o.examReminder || o.examReminder === 'off') return false;
      const examDate = new Date(o.date + 'T12:00:00');
      const days = REMINDER_DAYS[o.examReminder];
      if (!days) return false;
      const reminderDate = new Date(examDate.getTime() + days * 86400000);
      return today >= reminderDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [getItems, currentBusiness]);

  const dueDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allTx = [
      ...getItems('sales').filter(s => s.businessId === currentBusiness?.id && s.dueDate).map(s => ({ ...s, type: 'Sale' })),
      ...getItems('purchases').filter(p => p.businessId === currentBusiness?.id && p.dueDate).map(p => ({ ...p, type: 'Purchase' })),
    ];
    return allTx
      .filter(tx => {
        const dd = new Date(tx.dueDate + 'T00:00:00');
        return dd <= new Date(today.getTime() + 30 * 86400000);
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [getItems, currentBusiness]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 6 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 4, gap: 2 }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.375rem', sm: '1.625rem' }, letterSpacing: '-0.025em', color: 'text.primary', lineHeight: 1.2 }}>
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {currentBusiness?.name || 'Your business'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(e, v) => v != null && setPeriod(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 1.5, py: 0.75 } }}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
          </ToggleButtonGroup>
          <Button 
            variant="contained" 
            size="medium"
            startIcon={<Plus size={18} />} 
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700, 
              fontSize: '0.9375rem',
              borderRadius: 2,
              px: 2.5,
              boxShadow: 2,
            }}
            onClick={handleMenuOpen}
          >
            Add Entry
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { borderRadius: 2, mt: 1.5, minWidth: 220 } }}
          >
            <MenuItem dense onClick={() => handleMenuItemClick('/sales')}><ReceiptText size={16} style={{ marginRight: 10 }} /> New Sales Invoice</MenuItem>
            <MenuItem dense onClick={() => handleMenuItemClick('/purchases')}><ShoppingBag size={16} style={{ marginRight: 10 }} /> New Purchase Bill</MenuItem>
            <MenuItem dense onClick={() => handleMenuItemClick('/expenses')}><DollarSign size={16} style={{ marginRight: 10 }} /> Add Expense</MenuItem>
            <MenuItem dense onClick={() => handleMenuItemClick('/payment-in')}><Download size={16} style={{ marginRight: 10 }} /> Payment Received</MenuItem>
            <MenuItem dense onClick={() => handleMenuItemClick('/payment-out')}><Upload size={16} style={{ marginRight: 10 }} /> Payment Made</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* Metric cards: 5 cards - Sales, Purchases, To Get, To Give, Expenses */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Total Sales" value={stats.totalSales} trend={stats.salesTrend} trendLabel={stats.trendLabel} icon={TrendingUp} colorKey="primary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Total Purchases" value={stats.totalPurchases} trend={stats.purchaseTrend} trendLabel={stats.trendLabel} icon={FileText} colorKey="error" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="To Get" value={stats.toGet} icon={Download} colorKey="success" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="To Give" value={stats.toGive} icon={Upload} colorKey="warning" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Total Expenses" value={stats.totalExpenses} icon={DollarSign} colorKey="secondary" />
        </Grid>
      </Grid>

      {/* Chart + Recent */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              overflow: 'hidden',
              height: '100%',
            }}
          >
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp size={18} color={theme.palette.primary.main} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'Last 30 Days' : 'Last 12 Months'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Sales</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Purchases</Typography>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ p: 2.5, height: { xs: 260, sm: 300 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.error.main} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={theme.palette.error.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 13, boxShadow: theme.shadows[3] }}
                    formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name === 'sales' ? 'Sales' : 'Purchases']}
                  />
                  <Area type="monotone" dataKey="sales" stroke={theme.palette.primary.main} strokeWidth={2.5} fill="url(#chartGrad)" name="Sales" />
                  <Area type="monotone" dataKey="purchases" stroke={theme.palette.error.main} strokeWidth={2} fill="url(#chartGrad2)" name="Purchases" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider', 
              height: '100%',
              minHeight: { xs: 320, lg: 'auto' },
            }}
          >
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptText size={18} color={theme.palette.text.disabled} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Recent Transactions</Typography>
            </Box>
            <Stack spacing={0}>
              {recentTx.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <ReceiptText size={32} color={theme.palette.text.disabled} strokeWidth={1.5} style={{ marginBottom: 8 }} />
                  <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 500 }}>No transactions yet</Typography>
                </Box>
              ) : (
                recentTx.map((tx, idx) => (
                  <Box key={tx.id}>
                    <Stack 
                      direction="row" 
                      alignItems="center" 
                      spacing={2} 
                      sx={{ 
                        px: 2, 
                        py: 1.5, 
                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                        cursor: 'pointer',
                      }}
                    >
                      <Box sx={{ 
                        bgcolor: alpha(tx.type === 'Sales' ? theme.palette.success.main : theme.palette.error.main, 0.12), 
                        color: tx.type === 'Sales' ? 'success.main' : 'error.main', 
                        borderRadius: 1.5, 
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <FileText size={18} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>{tx.partyName}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>{tx.date}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: tx.type === 'Sales' ? 'success.main' : 'text.primary', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {tx.type === 'Sales' ? '+' : '-'}₹{tx.totalAmount?.toLocaleString() ?? '0'}
                      </Typography>
                    </Stack>
                    {idx < recentTx.length - 1 && <Divider sx={{ mx: 2 }} />}
                  </Box>
                ))
              )}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* To Give - Vendors balance table */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          mt: 2,
        }}
      >
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Upload size={20} color={theme.palette.warning.main} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>To Give – Vendor Balances</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Vendor</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Balance (₹ you owe)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.vendorsWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No vendor payables
                  </TableCell>
                </TableRow>
              ) : (
                stats.vendorsWithBalance.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{v.name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      ₹{((v.balance || 0) < 0 ? -v.balance : 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Exam Reminders */}
      {examReminders.length > 0 && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'warning.light', bgcolor: alpha(theme.palette.warning.main, 0.04), mt: 2 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bell size={20} color={theme.palette.warning.main} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.dark' }}>
              Exam Reminders ({examReminders.length})
            </Typography>
          </Box>
          <Stack spacing={0}>
            {examReminders.slice(0, 5).map((o, idx) => (
              <Box key={o.id}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2.5, py: 1.5 }}>
                  <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: 'warning.main', borderRadius: 1.5, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={18} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{o.patientName}</Typography>
                    <Typography variant="caption" color="text.secondary">Exam on {o.date} · Reminder: {o.examReminder}</Typography>
                  </Box>
                  <Chip label="Due for re-exam" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                </Stack>
                {idx < Math.min(examReminders.length, 5) - 1 && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))}
          </Stack>
        </Card>
      )}

      {/* Upcoming Due Dates */}
      {dueDates.length > 0 && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 2 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={20} color={theme.palette.text.secondary} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Upcoming Due Dates</Typography>
          </Box>
          <Stack spacing={0}>
            {dueDates.map((tx, idx) => {
              const isOverdue = new Date(tx.dueDate + 'T00:00:00') < new Date();
              return (
                <Box key={tx.id}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2.5, py: 1.5 }}>
                    <Box sx={{ bgcolor: alpha(isOverdue ? theme.palette.error.main : theme.palette.info.main, 0.12), color: isOverdue ? 'error.main' : 'info.main', borderRadius: 1.5, p: 1 }}>
                      <FileText size={18} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{tx.partyName}</Typography>
                      <Typography variant="caption" color="text.secondary">{tx.type} · Due {tx.dueDate}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{tx.totalAmount?.toLocaleString()}</Typography>
                      {isOverdue && <Chip label="Overdue" size="small" color="error" sx={{ fontWeight: 600, mt: 0.25 }} />}
                    </Box>
                  </Stack>
                  {idx < dueDates.length - 1 && <Divider sx={{ mx: 2 }} />}
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
