import React, { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { useData } from './DataContext';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem,
  Tooltip, useTheme, useMediaQuery, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, alpha, Popover
} from '@mui/material';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Users,
  Package,
  ReceiptText,
  ShoppingBag,
  FileText,
  Settings,
  Database,
  ChevronLeft,
  Store,
  Plus,
  Download,
  Eye,
  FileSearch,
  RotateCcw,
  CornerUpLeft,
  Truck,
  BookOpen,
  CalendarRange,
  ScanLine,
  LogOut,
  DollarSign,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBusiness } from './BusinessContext';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import { useFinancialYear } from './FinancialYearContext';
import SectionIcon from './SectionIcon';
import { useDialog } from './DialogContext';

const drawerWidth = 240;

// Ledger icon inline SVG for branding
const LedgerIcon = ({ size = 18, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" />
    <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223" />
    <path d="M9 7H15" />
    <path d="M9 11H15" />
  </svg>
);

const NavSectionLabel = ({ label }) => (
  <Typography
    variant="overline"
    sx={{
      display: 'block',
      px: 1.5,
      pt: 2,
      pb: 0.5,
      fontSize: '0.625rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      color: 'text.disabled',
      userSelect: 'none',
    }}
  >
    {label}
  </Typography>
);

const NavItem = ({ item, isActive, onClick }) => (
  <ListItem disablePadding sx={{ mb: 0.25 }}>
    <ListItemButton
      dense
      onClick={onClick}
      selected={isActive}
      sx={{
        borderRadius: 1.5,
        py: 0.75,
        px: 1.25,
        position: 'relative',
        '&.Mui-selected': {
          bgcolor: 'rgba(79,70,229,0.08)',
          color: 'primary.main',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0, top: '20%', bottom: '20%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            backgroundColor: 'currentColor',
          },
          '&:hover': { bgcolor: 'rgba(79,70,229,0.12)' },
          '& .MuiListItemIcon-root': { color: 'primary.main' },
        },
        '&:not(.Mui-selected)': {
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: isActive ? 'primary.main' : 'text.disabled' }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText
        primary={item.text}
        primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400 }}
      />
    </ListItemButton>
  </ListItem>
);

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [businessMenuAnchor, setBusinessMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [passwordDialog, setPasswordDialog] = useState({ open: false, business: null, password: '', error: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBusiness, businesses, switchBusiness } = useBusiness();
  const { logout, currentUser, isAdmin } = useAuth();
  const { config } = useConfig();
  const { confirm } = useDialog();
  const { getItems } = useData();
  const { activeFYLabel, availableFYs, setActiveFY, currentFY } = useFinancialYear();
  const [fyMenuAnchor, setFyMenuAnchor] = useState(null);
  const [globalScanOpen, setGlobalScanOpen] = useState(false);
  const barcodeScanEnabled = !!config.features?.barcode;

  const handleGlobalScan = (barcode) => {
    setGlobalScanOpen(false);
    const items = (getItems('items') || []).filter(i => i.businessId === currentBusiness?.id);
    const found = items.find(i => i.barcode === barcode || i.id === barcode);
    navigate('/sales', { state: { scannedBarcode: barcode, scannedItem: found || null } });
  };

  const handleDrawerToggle = () => setOpen(!open);

  // Navigation groups — all existing items preserved
  const navGroups = [
    {
      items: [
        ...(config.features?.dashboard ? [{ text: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' }] : []),
        ...(config.features?.parties ? [{ text: 'Parties', icon: <Users size={18} />, path: '/parties' }] : []),
        ...(config.features?.items ? [{ text: 'Items', icon: <Package size={18} />, path: '/items' }] : []),
      ],
    },
    {
      label: 'Transactions',
      items: [
        ...(config.features?.sales ? [{ text: 'Sales', icon: <ReceiptText size={18} />, path: '/sales' }] : []),
        ...(config.features?.purchases ? [{ text: 'Purchases', icon: <ShoppingBag size={18} />, path: '/purchases' }] : []),
        ...(config.features?.expenses ? [{ text: 'Expenses', icon: <DollarSign size={18} />, path: '/expenses' }] : []),
        ...(config.features?.payments ? [{ text: 'Payments', icon: <Download size={18} />, path: '/payment-in' }] : []),
      ],
    },
    {
      label: 'Documents',
      items: [
        ...(config.features?.estimates ? [{ text: 'Estimates', icon: <FileSearch size={18} />, path: '/estimates' }] : []),
        ...(config.features?.creditNotes ? [{ text: 'Credit Notes', icon: <RotateCcw size={18} />, path: '/credit-notes' }] : []),
        ...(config.features?.debitNotes ? [{ text: 'Debit Notes', icon: <CornerUpLeft size={18} />, path: '/debit-notes' }] : []),
        ...(config.features?.deliveryNotes ? [{ text: 'Delivery Notes', icon: <Truck size={18} />, path: '/delivery-notes' }] : []),
      ],
    },
    {
      label: 'Accounting',
      items: [
        ...(config.features?.journal ? [{ text: 'Journal', icon: <BookOpen size={18} />, path: '/journal' }] : []),
        ...(config.features?.opticals && config.businessType === 'opticals' ? [{ text: 'Opticals', icon: <Eye size={18} />, path: '/opticals' }] : []),
        ...(config.customSections || []).map(section => ({
          text: section.name,
          icon: <SectionIcon name={section.icon} size={18} />,
          path: `/section/${section.id}`,
        })),
      ],
    },
    {
      label: 'Analytics',
      items: [
        ...(config.features?.reports ? [{ text: 'Reports', icon: <FileText size={18} />, path: '/reports' }] : []),
      ],
    },
    {
      label: 'System',
      items: [
        { text: 'Backup / Restore', icon: <Database size={18} />, path: '/backup' },
        ...(config.features?.settings ? [{ text: 'Settings', icon: <Settings size={18} />, path: '/settings' }] : []),
        ...(currentUser && isAdmin ? [{ text: 'Admin', icon: <Settings size={18} />, path: '/admin' }] : []),
      ],
    },
  ];

  const visibleGroups = navGroups.filter(g => g.items.length > 0);

  // Flat list of all items for finding the current page title
  const allItems = navGroups.flatMap(g => g.items);

  const currentPageTitle =
    allItems.find(i => i.path === location.pathname)?.text ||
    config.customSections?.find(s => location.pathname === `/section/${s.id}`)?.name ||
    'Accounting';

  const userInitial =
    (currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase();

  const handlePasswordSubmit = () => {
    if (passwordDialog.business && passwordDialog.business.password === passwordDialog.password) {
      switchBusiness(passwordDialog.business.id);
      setPasswordDialog({ open: false, business: null, password: '', error: '' });
    } else {
      setPasswordDialog({ ...passwordDialog, error: 'Incorrect password' });
    }
  };

  const handlePasswordClose = () => {
    setPasswordDialog({ open: false, business: null, password: '', error: '' });
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo */}
      <Box
        sx={{
          px: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 52,
          flexShrink: 0,
          borderBottom: '1.5px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              bgcolor: 'primary.main',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LedgerIcon size={16} />
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.9375rem',
              letterSpacing: '-0.025em',
              color: 'text.primary',
              lineHeight: 1,
            }}
          >
            Solo Books
          </Typography>
        </Box>
        <Tooltip title="Collapse sidebar">
          <IconButton
            size="small"
            onClick={handleDrawerToggle}
            sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
          >
            <ChevronLeft size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 1 }}>
        {visibleGroups.map((group, groupIdx) => (
          <React.Fragment key={groupIdx}>
            {group.label && <NavSectionLabel label={group.label} />}
            <List dense disablePadding>
              {group.items.map((item) => (
                <NavItem
                  key={item.text}
                  item={item}
                  isActive={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setOpen(false);
                  }}
                />
              ))}
            </List>
          </React.Fragment>
        ))}
      </Box>

      {/* Business Switcher Footer */}
      {config.multiBusiness && (
        <Box sx={{ flexShrink: 0 }}>
          <Divider />
          <Box sx={{ p: 1.25 }}>
            <ListItemButton
              dense
              onClick={(e) => setBusinessMenuAnchor(e.currentTarget)}
              sx={{
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                py: 0.875,
                px: 1.25,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Store size={13} color="white" />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={currentBusiness?.name || 'Select Business'}
                secondary="Switch business"
                primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 700, noWrap: true, color: 'text.primary' }}
                secondaryTypographyProps={{ fontSize: '0.625rem', color: 'text.disabled' }}
              />
            </ListItemButton>
          </Box>
        </Box>
      )}

      {/* Business Menu */}
      <Menu
        anchorEl={businessMenuAnchor}
        open={Boolean(businessMenuAnchor)}
        onClose={() => setBusinessMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {businesses.map((biz) => (
          <MenuItem
            key={biz.id}
            selected={biz.id === currentBusiness?.id}
            onClick={() => {
              if (biz.id === currentBusiness?.id) {
                setBusinessMenuAnchor(null);
                return;
              }
              setPasswordDialog({ open: true, business: biz, password: '', error: '' });
              setBusinessMenuAnchor(null);
            }}
          >
            {biz.name}
          </MenuItem>
        ))}
        {config.multiBusiness && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => { navigate('/settings'); setBusinessMenuAnchor(null); }}>
              <ListItemIcon><Plus size={16} /></ListItemIcon>
              Add New Business
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { xs: '100%', md: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { xs: 0, md: `${open ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          color: 'text.primary',
        }}
      >
        <Toolbar disableGutters sx={{ px: { xs: 1.5, md: 2 } }}>
          {/* Menu toggle — visible when drawer is closed */}
          {!open && (
            <IconButton
              color="inherit"
              size="small"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1.5, color: 'text.secondary' }}
            >
              <MenuIcon size={20} />
            </IconButton>
          )}

          {/* Page title */}
          <Typography
            variant="subtitle1"
            noWrap
            component="div"
            sx={{ fontWeight: 600, flexGrow: 1, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}
          >
            {currentPageTitle}
          </Typography>

          {/* Business name pill (desktop only) */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              mr: 1.5,
              px: 1.25,
              py: 0.375,
              borderRadius: 100,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
              {currentBusiness?.name}
            </Typography>
          </Box>

          {/* Financial Year selector */}
          {(() => {
            const isAll = activeFYLabel === 'all';
            const isCurrentFY = !isAll && activeFYLabel === currentFY.label;
            return (
              <>
                <Box
                  onClick={(e) => setFyMenuAnchor(e.currentTarget)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mr: 1,
                    pl: 1.25,
                    pr: 1,
                    py: 0.5,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: '1.5px solid',
                    transition: 'all 0.15s ease',
                    ...(isAll ? {
                      bgcolor: 'action.hover',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.selected', borderColor: 'text.disabled' },
                    } : {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.14), borderColor: alpha(theme.palette.primary.main, 0.5) },
                    }),
                  }}
                >
                  <CalendarRange
                    size={13}
                    style={{ color: isAll ? theme.palette.text.secondary : theme.palette.primary.main, flexShrink: 0 }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      whiteSpace: 'nowrap',
                      color: isAll ? 'text.secondary' : 'primary.main',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {isAll ? 'All Time' : activeFYLabel}
                  </Typography>
                  <ChevronDown size={11} style={{ color: isAll ? theme.palette.text.disabled : theme.palette.primary.main, flexShrink: 0 }} />
                </Box>

                <Popover
                  anchorEl={fyMenuAnchor}
                  open={Boolean(fyMenuAnchor)}
                  onClose={() => setFyMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    elevation: 6,
                    sx: {
                      mt: 0.75,
                      minWidth: 220,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }
                  }}
                >
                  {/* Header */}
                  <Box sx={{ px: 2, pt: 1.75, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarRange size={14} style={{ color: theme.palette.primary.main }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase' }}>
                        Financial Year
                      </Typography>
                    </Box>
                  </Box>

                  {/* FY list */}
                  <Box sx={{ py: 0.5, maxHeight: 260, overflowY: 'auto' }}>
                    {availableFYs.map((fy) => {
                      const isActive = activeFYLabel === fy.label;
                      const isCurr = fy.label === currentFY.label;
                      return (
                        <Box
                          key={fy.label}
                          onClick={() => { setActiveFY(fy.label); setFyMenuAnchor(null); }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 0.875,
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                            '&:hover': {
                              bgcolor: isActive
                                ? alpha(theme.palette.primary.main, 0.12)
                                : alpha(theme.palette.text.primary, 0.04),
                            },
                          }}
                        >
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.8125rem',
                                color: isActive ? 'primary.main' : 'text.primary',
                                lineHeight: 1.3,
                              }}
                            >
                              {fy.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                              {fy.start} → {fy.end}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 1.5 }}>
                            {isCurr && (
                              <Box sx={{
                                px: 0.75, py: 0.2,
                                borderRadius: 0.75,
                                bgcolor: alpha(theme.palette.success.main, 0.12),
                                border: '1px solid',
                                borderColor: alpha(theme.palette.success.main, 0.3),
                              }}>
                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'success.main', lineHeight: 1 }}>
                                  Current
                                </Typography>
                              </Box>
                            )}
                            {isActive && <Check size={14} style={{ color: theme.palette.primary.main, flexShrink: 0 }} />}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* All Time */}
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 0.5 }}>
                    <Box
                      onClick={() => { setActiveFY('all'); setFyMenuAnchor(null); }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.875,
                        cursor: 'pointer',
                        bgcolor: isAll ? alpha(theme.palette.text.primary, 0.06) : 'transparent',
                        '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: isAll ? 700 : 500, fontSize: '0.8125rem', color: isAll ? 'text.primary' : 'text.secondary' }}
                        >
                          All Time
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                          No date filter applied
                        </Typography>
                      </Box>
                      {isAll && <Check size={14} style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />}
                    </Box>
                  </Box>
                </Popover>
              </>
            );
          })()}

          {/* Barcode scan button */}
          {barcodeScanEnabled && (
            <Tooltip title="Scan barcode → Sales">
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setGlobalScanOpen(true)}
                sx={{
                  mr: 0.75,
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <ScanLine size={18} />
              </IconButton>
            </Tooltip>
          )}

          {/* User avatar + menu */}
          <Tooltip title={currentUser?.email || 'Account'}>
            <IconButton
              size="small"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: 'primary.main',
                  color: '#fff',
                }}
              >
                {userInitial}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { minWidth: 220, mt: 0.75 } }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" noWrap sx={{ color: 'text.primary' }}>
                {currentUser?.displayName || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {currentUser?.email}
              </Typography>
            </Box>
            <MenuItem
              onClick={async () => {
                setUserMenuAnchor(null);
                const ok = await confirm({
                  title: 'Sign Out',
                  message: 'Are you sure you want to sign out? Any unsaved changes will be lost.',
                  confirmLabel: 'Sign Out',
                  variant: 'warning',
                });
                if (ok) logout();
              }}
              sx={{ mt: 0.5, color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
            >
              <ListItemIcon><LogOut size={16} /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, md: open ? drawerWidth : 0 },
          flexShrink: { md: 0 },
          transition: 'width 0.25s ease',
        }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={open}
          onClose={handleDrawerToggle}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 2.5 },
          width: { xs: '100%', md: `calc(100% - ${open ? drawerWidth : 0}px)` },
          mt: '52px',
          minWidth: 0,
          transition: 'margin 0.2s ease',
        }}
      >
        {children}
      </Box>

      {/* Business Switch Password Dialog */}
      <Dialog open={passwordDialog.open} onClose={handlePasswordClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          Switch to {passwordDialog.business?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
            Enter the password for this business to switch to it.
          </Typography>
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={passwordDialog.password}
            onChange={(e) => setPasswordDialog({ ...passwordDialog, password: e.target.value, error: '' })}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
            error={!!passwordDialog.error}
            helperText={passwordDialog.error}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordClose} variant="outlined">Cancel</Button>
          <Button onClick={handlePasswordSubmit} variant="contained">
            Switch Business
          </Button>
        </DialogActions>
      </Dialog>

      {barcodeScanEnabled && (
        <BarcodeScanner
          open={globalScanOpen}
          onScan={handleGlobalScan}
          onClose={() => setGlobalScanOpen(false)}
        />
      )}
    </Box>
  );
};

export default Layout;
