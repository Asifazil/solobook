import React, { useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  useTheme, Stack, Button, alpha, Divider, Menu, MenuItem,
  Chip, Avatar,
} from '@mui/material';
import {
  ArrowUpRight, ArrowDownRight,
  Plus, FileText, ReceiptText, ShoppingBag, Download, Upload, DollarSign, TrendingUp,
  Bell, Clock,
} from 'lucide-react';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// ─── Card definitions ────────────────────────────────────────────────────────
const CARD_DEFS = [
  { key: 'totalSales',     trendKey: 'salesTrend',    title: 'Total Sales',     icon: TrendingUp,  color: '#4f46e5', gradient: 'linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)' },
  { key: 'totalPurchases', trendKey: 'purchaseTrend', title: 'Total Purchases', icon: ShoppingBag, color: '#e11d48', gradient: 'linear-gradient(135deg,#e11d48 0%,#fb7185 100%)' },
  { key: 'toGet',          trendKey: null,            title: 'Receivables',     icon: Download,    color: '#059669', gradient: 'linear-gradient(135deg,#059669 0%,#34d399 100%)' },
  { key: 'toGive',         trendKey: null,            title: 'Payables',        icon: Upload,      color: '#d97706', gradient: 'linear-gradient(135deg,#d97706 0%,#fbbf24 100%)' },
  { key: 'totalExpenses',  trendKey: null,            title: 'Expenses',        icon: DollarSign,  color: '#7c3aed', gradient: 'linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)' },
];

// ─── Metric card ─────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, trend, trendLabel, icon: Icon, color, gradient }) => (
  <Card elevation={0} sx={{
    height: '100%', borderRadius: 2.5, overflow: 'hidden',
    border: '1px solid', borderColor: alpha(color, 0.14),
    bgcolor: 'background.paper',
    transition: 'all 0.22s ease',
    '&:hover': { boxShadow: `0 8px 32px ${alpha(color, 0.2)}`, transform: 'translateY(-2px)' },
  }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 0 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: alpha(color, 0.8), textTransform: 'uppercase', letterSpacing: '0.08em', mt: 0.25 }}>
          {title}
        </Typography>
        <Box sx={{ p: 1.25, borderRadius: 1.75, background: gradient, display: 'flex', flexShrink: 0, boxShadow: `0 4px 12px ${alpha(color, 0.35)}` }}>
          <Icon size={17} color="white" />
        </Box>
      </Stack>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em', lineHeight: 1 }}>
        ₹{(value ?? 0).toLocaleString('en-IN')}
      </Typography>
      <Box sx={{ mt: 1.5, minHeight: 22 }}>
        {trend !== undefined && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.25,
              px: 0.75, py: 0.2, borderRadius: 0.875,
              bgcolor: trend >= 0 ? alpha('#16a34a', 0.1) : alpha('#dc2626', 0.1),
              color: trend >= 0 ? '#16a34a' : '#dc2626',
            }}>
              {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, lineHeight: 1 }}>{Math.abs(trend).toFixed(1)}%</Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>{trendLabel}</Typography>
          </Stack>
        )}
      </Box>
    </CardContent>
    <Box sx={{ height: 3, background: gradient }} />
  </Card>
);

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'white', border: '1px solid', borderColor: alpha('#000', 0.08), borderRadius: 2, p: 1.75, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 170 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>{label}</Typography>
      {payload.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: i < payload.length - 1 ? 0.5 : 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>₹{Number(entry.value).toLocaleString('en-IN')}</Typography>
          <Typography variant="caption" color="text.secondary">{entry.name}</Typography>
        </Box>
      ))}
    </Box>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const theme = useTheme();
  const { currentBusiness } = useBusiness();
  const { getItems } = useData();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [period, setPeriod] = React.useState('week');

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMenuItemClick = (path) => { navigate(path); handleMenuClose(); };

  const salesRaw     = getItems('sales').filter(s => s.businessId === currentBusiness?.id);
  const purchasesRaw = getItems('purchases').filter(p => p.businessId === currentBusiness?.id);
  const transactions = [
    ...salesRaw.map(s => ({ ...s, type: 'Sales' })),
    ...purchasesRaw.map(p => ({ ...p, type: 'Purchases' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const expenses = getItems('expenses').filter(e => e.businessId === currentBusiness?.id);
  const parties  = getItems('parties').filter(p => p.businessId === currentBusiness?.id);

  // ── Stats computation ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const dayMs = 86400000;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let periodStart, periodEnd, prevStart, prevEnd;
    if (period === 'day') {
      periodStart = todayStart; periodEnd = todayEnd;
      prevStart = new Date(todayStart - dayMs); prevEnd = new Date(todayEnd - dayMs);
    } else if (period === 'week') {
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(+periodEnd - 6 * dayMs); periodStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(+periodStart - 1);
      prevStart = new Date(+prevEnd - 6 * dayMs); prevStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(+periodEnd - 29 * dayMs); periodStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(+periodStart - 1);
      prevStart = new Date(+prevEnd - 29 * dayMs); prevStart.setHours(0, 0, 0, 0);
    } else {
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      prevEnd = new Date(+periodStart - 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    }

    const inRange = (d, s, e) => { const t = new Date(d + 'T12:00:00'); return t >= s && t <= e; };
    const sum = (arr) => arr.reduce((a, t) => a + (t.totalAmount || 0), 0);

    const sales = transactions.filter(t => t.type === 'Sales');
    const purchases = transactions.filter(t => t.type === 'Purchases');
    const curSales  = sales.filter(t => inRange(t.date, periodStart, periodEnd));
    const prevSales = sales.filter(t => inRange(t.date, prevStart, prevEnd));
    const curPurch  = purchases.filter(t => inRange(t.date, periodStart, periodEnd));
    const prevPurch = purchases.filter(t => inRange(t.date, prevStart, prevEnd));
    const trend = (cur, prev) => { const c = sum(cur), p = sum(prev); return p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100; };

    const customers = parties.filter(p => p.type === 'Customer');
    const vendors   = parties.filter(p => p.type === 'Vendor');
    const toGet  = customers.reduce((a, p) => a + Math.max(0, p.balance || 0), 0);
    const toGive = vendors.reduce((a, p) => a + (p.balance < 0 ? -p.balance : 0), 0);
    const vendorsWithBalance = vendors.filter(v => (v.balance || 0) < 0).sort((a, b) => (a.balance || 0) - (b.balance || 0));

    const totalExpenses = expenses
      .filter(e => inRange(e.date, periodStart, periodEnd))
      .reduce((a, e) => a + e.amount, 0);

    // Chart data
    let chartData = [];
    if (period === 'day') {
      chartData = [{ label: 'Today', sales: sum(curSales), purchases: sum(curPurch) }];
    } else if (period === 'week') {
      chartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), sales: sales.filter(t => t.date === ds).reduce((a, t) => a + t.totalAmount, 0), purchases: purchases.filter(t => t.date === ds).reduce((a, t) => a + t.totalAmount, 0) };
      });
    } else if (period === 'month') {
      chartData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const ds = d.toISOString().split('T')[0];
        return { label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), sales: sales.filter(t => t.date === ds).reduce((a, t) => a + t.totalAmount, 0), purchases: purchases.filter(t => t.date === ds).reduce((a, t) => a + t.totalAmount, 0) };
      });
    } else {
      chartData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const ms = new Date(d.getFullYear(), d.getMonth(), 1);
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        return {
          label: ms.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          sales:     sales.filter(t => { const x = new Date(t.date + 'T12:00:00'); return x >= ms && x <= me; }).reduce((a, t) => a + t.totalAmount, 0),
          purchases: purchases.filter(t => { const x = new Date(t.date + 'T12:00:00'); return x >= ms && x <= me; }).reduce((a, t) => a + t.totalAmount, 0),
        };
      });
    }

    return {
      totalSales: sum(curSales), totalPurchases: sum(curPurch),
      salesTrend: trend(curSales, prevSales), purchaseTrend: trend(curPurch, prevPurch),
      toGet, toGive, vendorsWithBalance, totalExpenses, chartData,
      trendLabel: period === 'day' ? 'vs yesterday' : period === 'week' ? 'vs prev week' : period === 'month' ? 'vs prev 30d' : 'vs prev year',
    };
  }, [transactions, parties, expenses, period]);

  const recentTx = useMemo(() => transactions.slice(0, 8), [transactions]);

  const examReminders = useMemo(() => {
    const DAYS = { '1month': 30, '6months': 182, '1year': 365 };
    const today = new Date();
    return getItems('opticals')
      .filter(o => o.businessId === currentBusiness?.id && o.examReminder && o.examReminder !== 'off')
      .filter(o => { const d = DAYS[o.examReminder]; return d && today >= new Date(new Date(o.date + 'T12:00:00').getTime() + d * 86400000); })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [getItems, currentBusiness]);

  const dueDates = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cutoff = new Date(+today + 30 * 86400000);
    return [
      ...getItems('sales').filter(s => s.businessId === currentBusiness?.id && s.dueDate).map(s => ({ ...s, txType: 'Sale' })),
      ...getItems('purchases').filter(p => p.businessId === currentBusiness?.id && p.dueDate).map(p => ({ ...p, txType: 'Purchase' })),
    ].filter(tx => new Date(tx.dueDate + 'T00:00:00') <= cutoff)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
  }, [getItems, currentBusiness]);

  const PERIOD_LABELS = { day: 'Today', week: 'This Week', month: 'Last 30 Days', year: 'Last 12 Months' };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 6 }}>

      {/* ── Hero header ── */}
      <Box sx={{
        mb: 3.5, p: { xs: 2.5, sm: 3.5 }, borderRadius: 3,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f2040 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', bgcolor: alpha('#6366f1', 0.14) }} />
        <Box sx={{ position: 'absolute', bottom: -70, right: 130, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha('#10b981', 0.06) }} />
        <Box sx={{ position: 'absolute', top: 15, right: 230, width: 90, height: 90, borderRadius: '50%', bgcolor: alpha('#f43f5e', 0.09) }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2.5} sx={{ position: 'relative', zIndex: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' }, letterSpacing: '-0.025em', color: 'white', lineHeight: 1.2 }}>
              {currentBusiness?.name || 'Your Business'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.42)', mt: 0.5, fontSize: '0.8125rem' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Period pills */}
            <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 2, p: 0.5, gap: 0.25, border: '1px solid rgba(255,255,255,0.1)' }}>
              {['day', 'week', 'month', 'year'].map(p => (
                <Box key={p} onClick={() => setPeriod(p)} sx={{
                  px: 1.5, py: 0.625, borderRadius: 1.5, cursor: 'pointer', userSelect: 'none',
                  bgcolor: period === p ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: period === p ? 'white' : 'rgba(255,255,255,0.42)',
                  fontWeight: period === p ? 700 : 500, fontSize: '0.78rem',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' },
                }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Box>
              ))}
            </Box>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleMenuOpen}
              sx={{ bgcolor: 'white', color: '#0f172a', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' } }}>
              New Entry
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' } }}>
        <MenuItem dense onClick={() => handleMenuItemClick('/sales')}><ReceiptText size={16} style={{ marginRight: 10, color: '#4f46e5' }} />New Sales Invoice</MenuItem>
        <MenuItem dense onClick={() => handleMenuItemClick('/purchases')}><ShoppingBag size={16} style={{ marginRight: 10, color: '#e11d48' }} />New Purchase Bill</MenuItem>
        <MenuItem dense onClick={() => handleMenuItemClick('/expenses')}><DollarSign size={16} style={{ marginRight: 10, color: '#7c3aed' }} />Add Expense</MenuItem>
        <MenuItem dense onClick={() => handleMenuItemClick('/payment-in')}><Download size={16} style={{ marginRight: 10, color: '#059669' }} />Payment Received</MenuItem>
        <MenuItem dense onClick={() => handleMenuItemClick('/payment-out')}><Upload size={16} style={{ marginRight: 10, color: '#d97706' }} />Payment Made</MenuItem>
      </Menu>

      {/* ── Metric cards (CSS grid: 2 → 3 → 5 cols) ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        {CARD_DEFS.map(({ key, trendKey, ...card }) => (
          <MetricCard key={key} {...card}
            value={stats[key]}
            trend={trendKey ? stats[trendKey] : undefined}
            trendLabel={stats.trendLabel}
          />
        ))}
      </Box>

      {/* ── Chart + Recent Transactions ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden', height: '100%' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#4f46e5', 0.1), display: 'flex' }}>
                  <TrendingUp size={16} color="#4f46e5" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>{PERIOD_LABELS[period]}</Typography>
                  <Typography variant="caption" color="text.secondary">Sales vs Purchases</Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={2.5}>
                {[{ color: '#6366f1', label: 'Sales' }, { color: '#f43f5e', label: 'Purchases' }].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: color }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, height: { xs: 240, sm: 290 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPurch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.06)} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.disabled, fontSize: 11, fontWeight: 500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.disabled, fontSize: 11 }} tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                  <ReTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#gSales)" name="Sales" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="purchases" stroke="#f43f5e" strokeWidth={2} fill="url(#gPurch)" name="Purchases" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#0891b2', 0.1), display: 'flex' }}>
                <ReceiptText size={16} color="#0891b2" />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>Recent Transactions</Typography>
                <Typography variant="caption" color="text.secondary">{recentTx.length} latest entries</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {recentTx.length === 0 ? (
                <Box sx={{ py: 7, textAlign: 'center' }}>
                  <ReceiptText size={34} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 500 }}>No transactions yet</Typography>
                </Box>
              ) : (
                recentTx.map((tx, idx) => {
                  const isSale = tx.type === 'Sales';
                  const clr = isSale ? '#4f46e5' : '#e11d48';
                  return (
                    <Box key={tx.id}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: '0.78rem', fontWeight: 800, flexShrink: 0, bgcolor: alpha(clr, 0.1), color: clr }}>
                          {(tx.partyName || '?')[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>
                            {tx.partyName || (isSale ? 'Cash & Carry' : 'Cash Purchase')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>{tx.date}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: clr, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                            {isSale ? '+' : '-'}₹{tx.totalAmount?.toLocaleString('en-IN') ?? '0'}
                          </Typography>
                          <Box sx={{ px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: alpha(clr, 0.08), display: 'inline-block', mt: 0.25 }}>
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: clr, lineHeight: 1.4 }}>{tx.type}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                      {idx < recentTx.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </Box>
                  );
                })
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Vendor Payables + Due Dates ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>

        {/* Vendor Payables */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#d97706', 0.1), display: 'flex' }}>
                <Upload size={16} color="#d97706" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>Vendor Payables</Typography>
                <Typography variant="caption" color="text.secondary">Amounts you owe to vendors</Typography>
              </Box>
              {stats.toGive > 0 && (
                <Chip label={`₹${stats.toGive.toLocaleString('en-IN')}`} size="small"
                  sx={{ fontWeight: 800, bgcolor: alpha('#d97706', 0.1), color: '#d97706', border: 'none', fontSize: '0.75rem' }} />
              )}
            </Box>
            {stats.vendorsWithBalance.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center', opacity: 0.45 }}>
                <Upload size={28} strokeWidth={1.5} style={{ marginBottom: 8 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>No vendor payables</Typography>
              </Box>
            ) : (
              <Stack spacing={0}>
                {stats.vendorsWithBalance.map((v, idx) => {
                  const owed = (v.balance || 0) < 0 ? -v.balance : 0;
                  return (
                    <Box key={v.id}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.25, '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.4) } }}>
                        <Avatar sx={{ width: 34, height: 34, fontSize: '0.78rem', fontWeight: 800, bgcolor: alpha('#d97706', 0.1), color: '#d97706', flexShrink: 0 }}>
                          {v.name?.[0]?.toUpperCase() || 'V'}
                        </Avatar>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, fontSize: '0.8125rem' }} noWrap>{v.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#d97706', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                          ₹{owed.toLocaleString('en-IN')}
                        </Typography>
                      </Stack>
                      {idx < stats.vendorsWithBalance.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid>

        {/* Due Dates */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#0891b2', 0.1), display: 'flex' }}>
                <Clock size={16} color="#0891b2" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>Upcoming Due Dates</Typography>
                <Typography variant="caption" color="text.secondary">Next 30 days</Typography>
              </Box>
              {dueDates.length > 0 && (
                <Chip label={dueDates.length} size="small" sx={{ fontWeight: 800, bgcolor: alpha('#0891b2', 0.1), color: '#0891b2', border: 'none' }} />
              )}
            </Box>
            {dueDates.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center', opacity: 0.45 }}>
                <Clock size={28} strokeWidth={1.5} style={{ marginBottom: 8 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>No upcoming due dates</Typography>
              </Box>
            ) : (
              <Stack spacing={0}>
                {dueDates.map((tx, idx) => {
                  const isOverdue = new Date(tx.dueDate + 'T00:00:00') < new Date();
                  const clr = isOverdue ? '#dc2626' : '#0891b2';
                  return (
                    <Box key={tx.id}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.25, '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.4) } }}>
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(clr, 0.1), flexShrink: 0, display: 'flex' }}>
                          <FileText size={16} color={clr} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>{tx.partyName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{tx.txType} · Due {tx.dueDate}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                            ₹{tx.totalAmount?.toLocaleString('en-IN')}
                          </Typography>
                          {isOverdue && (
                            <Chip label="Overdue" size="small" color="error"
                              sx={{ fontWeight: 700, fontSize: '0.62rem', height: 18, mt: 0.25 }} />
                          )}
                        </Box>
                      </Stack>
                      {idx < dueDates.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* ── Exam Reminders (conditional) ── */}
      {examReminders.length > 0 && (
        <Card elevation={0} sx={{
          borderRadius: 2.5,
          border: '1px solid', borderColor: alpha('#d97706', 0.22),
          bgcolor: alpha('#d97706', 0.03),
          overflow: 'hidden',
        }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: alpha('#d97706', 0.15), display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha('#d97706', 0.15), display: 'flex' }}>
              <Bell size={16} color="#d97706" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#b45309' }}>Exam Reminders</Typography>
            <Chip label={examReminders.length} size="small" color="warning" sx={{ fontWeight: 800, height: 20 }} />
          </Box>
          <Stack spacing={0}>
            {examReminders.slice(0, 5).map((o, idx) => (
              <Box key={o.id}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 1.25 }}>
                  <Avatar sx={{ width: 34, height: 34, fontSize: '0.78rem', fontWeight: 800, bgcolor: alpha('#d97706', 0.12), color: '#d97706', flexShrink: 0 }}>
                    {(o.patientName || '?')[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>{o.patientName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Exam on {o.date} · Reminder: {o.examReminder}</Typography>
                  </Box>
                  <Chip label="Re-exam due" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                </Stack>
                {idx < Math.min(examReminders.length, 5) - 1 && <Divider sx={{ mx: 2.5 }} />}
              </Box>
            ))}
          </Stack>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
