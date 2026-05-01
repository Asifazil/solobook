import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid,
  Switch, FormControlLabel, Chip, IconButton, Tooltip, Divider, Alert,
  Tabs, Tab, Stack, Paper, MenuItem, alpha, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import {
  Plus, Save, Trash2, ShieldCheck, ChevronUp, ChevronDown, X,
  Ruler, Scissors, Heart, Star, Wrench, Briefcase,
  Home, Zap, Leaf, Music, Camera, Globe, Activity,
  ShoppingBag, Truck, FileText, Package, Car, Coffee, Layers, Eye
} from 'lucide-react';
import { firestore } from './db';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

// --- Constants ---
const featureKeys = [
  'dashboard', 'parties', 'items', 'sales', 'purchases', 'expenses',
  'opticals', 'payments', 'reports', 'settings', 'barcode',
  'backupExportFile', 'backupRestoreFile', 'backupOnline', 'backupRestoreOnline'
];

const featureLabels = {
  dashboard: 'Dashboard', parties: 'Parties', items: 'Items', sales: 'Sales',
  purchases: 'Purchases', expenses: 'Expenses', opticals: 'Opticals',
  payments: 'Payments', reports: 'Reports', settings: 'Settings', barcode: 'Barcode',
  backupExportFile: 'Export to File', backupRestoreFile: 'Restore from File',
  backupOnline: 'Backup to Online', backupRestoreOnline: 'Restore from Online',
};

const PRESET_COLORS = [
  '#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2',
  '#c62828', '#0097a7', '#5d4037', '#455a64', '#1a1c1e'
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Long Text' }
];

const SECTION_ICON_LIST = [
  { name: 'Ruler', Icon: Ruler },
  { name: 'Scissors', Icon: Scissors },
  { name: 'Heart', Icon: Heart },
  { name: 'Star', Icon: Star },
  { name: 'Wrench', Icon: Wrench },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Home', Icon: Home },
  { name: 'Zap', Icon: Zap },
  { name: 'Leaf', Icon: Leaf },
  { name: 'Music', Icon: Music },
  { name: 'Camera', Icon: Camera },
  { name: 'Globe', Icon: Globe },
  { name: 'Activity', Icon: Activity },
  { name: 'ShoppingBag', Icon: ShoppingBag },
  { name: 'Truck', Icon: Truck },
  { name: 'FileText', Icon: FileText },
  { name: 'Package', Icon: Package },
  { name: 'Car', Icon: Car },
  { name: 'Coffee', Icon: Coffee },
  { name: 'Layers', Icon: Layers },
  { name: 'Eye', Icon: Eye },
];

const defaultUserForm = () => ({
  email: '',
  allowed: true,
  isAdmin: false,
  businessType: 'general',
  multiBusiness: true,
  useIndexedDB: true,
  themePrimary: '#1976d2',
  themeSecondary: '#dc004e',
  features: featureKeys.reduce((acc, key) => ({ ...acc, [key]: key !== 'barcode' }), {}),
  assignedSectionIds: []
});

const normalizeSectionTabs = (section) => {
  if (section?.tabs?.length > 0) {
    return section.tabs.map(tab => ({
      ...tab,
      fields: (tab.fields || []).map(f => ({
        ...f,
        options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || '')
      }))
    }));
  }
  // legacy: section has fields at root
  if (section?.fields?.length > 0) {
    return [{ id: 'tab_legacy', name: 'Details', fields: section.fields.map(f => ({
      ...f,
      options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || '')
    })) }];
  }
  return [{ id: `tab_${Date.now()}`, name: 'Details', fields: [] }];
};

const defaultSectionForm = () => ({
  name: '',
  description: '',
  icon: 'FileText',
  color: '#1976d2',
  tabs: [{ id: `tab_${Date.now()}`, name: 'Details', fields: [] }]
});

// --- Inline icon renderer (avoids importing SectionIcon to keep Admin self-contained) ---
const ICON_MAP = { Ruler, Scissors, Heart, Star, Wrench, Briefcase, Home, Zap, Leaf, Music, Camera, Globe, Activity, ShoppingBag, Truck, FileText, Package, Car, Coffee, Layers, Eye };
const AdminIcon = ({ name, size = 18, ...props }) => {
  const Icon = ICON_MAP[name] || FileText;
  return <Icon size={size} {...props} />;
};

// --- Main Component ---
const Admin = () => {
  const { currentUser, isAdmin } = useAuth();
  const [adminTab, setAdminTab] = useState('users');

  // Users state
  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [form, setForm] = useState(defaultUserForm());
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sections state
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm());
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sectionId: null, sectionName: '' });

  // Orphaned sections: in user's config but no longer in adminSections
  const [orphanedSections, setOrphanedSections] = useState([]);

  // Load users
  useEffect(() => {
    const ref = collection(firestore, 'userConfig');
    return onSnapshot(ref, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Error loading userConfig:', err));
  }, []);

  // Load sections
  useEffect(() => {
    const ref = collection(firestore, 'adminSections');
    return onSnapshot(ref, snap => setSections(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Error loading adminSections:', err));
  }, []);

  // --- User Handlers ---
  const resetUserForm = () => {
    setSelectedEmail('');
    setForm(defaultUserForm());
    setOrphanedSections([]);
  };

  const loadUser = (user) => {
    const cfg = user.config || {};
    const userSections = cfg.customSections || [];
    // Detect sections in user's config that no longer exist in adminSections
    const orphaned = userSections.filter(s => !sections.some(as => as.id === s.id));
    setOrphanedSections(orphaned);
    setSelectedEmail(user.email || user.id);
    setForm({
      email: user.email || user.id,
      allowed: user.allowed !== false,
      isAdmin: !!user.isAdmin,
      businessType: cfg.businessType || 'general',
      multiBusiness: cfg.multiBusiness !== false,
      useIndexedDB: cfg.useIndexedDB !== false,
      themePrimary: cfg.theme?.primaryColor || '#1976d2',
      themeSecondary: cfg.theme?.secondaryColor || '#dc004e',
      features: {
        ...featureKeys.reduce((acc, key) => ({ ...acc, [key]: key !== 'barcode' }), {}),
        ...(cfg.features || {})
      },
      assignedSectionIds: userSections
        .filter(s => sections.some(as => as.id === s.id))
        .map(s => s.id)
    });
  };

  const handleSaveUser = async () => {
    if (!form.email) { setMessage({ type: 'error', text: 'Email is required.' }); return; }
    try {
      const assignedSections = sections
        .filter(s => form.assignedSectionIds.includes(s.id))
        .map(s => {
          const tabs = normalizeSectionTabs(s).map(tab => ({
            id: tab.id,
            name: tab.name,
            fields: tab.fields.map(f => ({
              ...f,
              options: typeof f.options === 'string'
                ? f.options.split(',').map(o => o.trim()).filter(Boolean)
                : (f.options || [])
            }))
          }));
          return {
            id: s.id,
            name: s.name,
            icon: s.icon || 'FileText',
            color: s.color || '#1976d2',
            description: s.description || '',
            tabs,
            fields: tabs.flatMap(t => t.fields)
          };
        });

      await setDoc(doc(firestore, 'userConfig', form.email), {
        email: form.email,
        allowed: form.allowed,
        isAdmin: form.isAdmin,
        config: {
          businessType: form.businessType,
          multiBusiness: form.multiBusiness,
          useIndexedDB: form.useIndexedDB,
          theme: { primaryColor: form.themePrimary, secondaryColor: form.themeSecondary },
          features: form.features,
          customSections: assignedSections
        }
      }, { merge: true });
      setMessage({ type: 'success', text: 'User configuration saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Remove access for ${email}?`)) return;
    try {
      await deleteDoc(doc(firestore, 'userConfig', email));
      if (selectedEmail === email) resetUserForm();
      setMessage({ type: 'success', text: 'User removed.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete: ' + (err.message || 'Unknown error') });
    }
  };

  // --- Section Handlers ---
  const resetSectionForm = () => {
    setSelectedSection(null);
    setSectionForm(defaultSectionForm());
    setActiveTabIdx(0);
  };

  const loadSection = (section) => {
    setSelectedSection(section);
    setSectionForm({
      name: section.name || '',
      description: section.description || '',
      icon: section.icon || 'FileText',
      color: section.color || '#1976d2',
      tabs: normalizeSectionTabs(section)
    });
    setActiveTabIdx(0);
  };

  // Tab handlers
  const addTab = () => {
    setSectionForm(f => {
      const newTabs = [...f.tabs, { id: `tab_${Date.now()}`, name: 'New Tab', fields: [] }];
      setActiveTabIdx(newTabs.length - 1);
      return { ...f, tabs: newTabs };
    });
  };

  const removeTab = (tabIdx) => {
    setSectionForm(f => {
      if (f.tabs.length <= 1) return f;
      const newTabs = f.tabs.filter((_, i) => i !== tabIdx);
      setActiveTabIdx(prev => Math.min(prev, newTabs.length - 1));
      return { ...f, tabs: newTabs };
    });
  };

  const updateTabName = (tabIdx, name) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      tabs[tabIdx] = { ...tabs[tabIdx], name };
      return { ...f, tabs };
    });
  };

  const moveTab = (tabIdx, dir) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      const newIdx = tabIdx + dir;
      if (newIdx < 0 || newIdx >= tabs.length) return f;
      [tabs[tabIdx], tabs[newIdx]] = [tabs[newIdx], tabs[tabIdx]];
      return { ...f, tabs };
    });
  };

  // Field handlers (tab-aware)
  const addField = (tabIdx) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      tabs[tabIdx] = {
        ...tabs[tabIdx],
        fields: [...tabs[tabIdx].fields, { id: Date.now().toString(), name: '', type: 'text', unit: '', required: false, options: '' }]
      };
      return { ...f, tabs };
    });
  };

  const removeField = (tabIdx, fieldId) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      tabs[tabIdx] = { ...tabs[tabIdx], fields: tabs[tabIdx].fields.filter(field => field.id !== fieldId) };
      return { ...f, tabs };
    });
  };

  const updateField = (tabIdx, fieldIdx, key, value) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      const fields = [...tabs[tabIdx].fields];
      fields[fieldIdx] = { ...fields[fieldIdx], [key]: value };
      tabs[tabIdx] = { ...tabs[tabIdx], fields };
      return { ...f, tabs };
    });
  };

  const moveField = (tabIdx, fieldIdx, dir) => {
    setSectionForm(f => {
      const tabs = [...f.tabs];
      const fields = [...tabs[tabIdx].fields];
      const newIdx = fieldIdx + dir;
      if (newIdx < 0 || newIdx >= fields.length) return f;
      [fields[fieldIdx], fields[newIdx]] = [fields[newIdx], fields[fieldIdx]];
      tabs[tabIdx] = { ...tabs[tabIdx], fields };
      return { ...f, tabs };
    });
  };

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) { setMessage({ type: 'error', text: 'Section name is required.' }); return; }
    try {
      const normalizeField = (f) => ({
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        unit: f.unit || '',
        required: !!f.required,
        options: f.type === 'select'
          ? (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : (f.options || []))
          : []
      });

      const saveTabs = sectionForm.tabs.map(tab => ({
        id: tab.id,
        name: tab.name || 'Tab',
        fields: (tab.fields || []).filter(f => f.name.trim()).map(normalizeField)
      }));

      // Flat fields list for legacy compatibility
      const flatFields = saveTabs.flatMap(t => t.fields);

      const sectionData = {
        name: sectionForm.name.trim(),
        description: sectionForm.description.trim(),
        icon: sectionForm.icon,
        color: sectionForm.color,
        tabs: saveTabs,
        fields: flatFields
      };

      let savedId;
      if (selectedSection) {
        savedId = selectedSection.id;
        await setDoc(doc(firestore, 'adminSections', savedId), sectionData, { merge: true });
      } else {
        savedId = `section_${Date.now()}`;
        await setDoc(doc(firestore, 'adminSections', savedId), { ...sectionData, id: savedId });
      }
      // Keep the section selected after save so Delete button remains accessible
      setSelectedSection({ id: savedId, ...sectionData });
      setMessage({ type: 'success', text: 'Section saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save section: ' + err.message });
    }
  };

  const confirmDeleteSection = (sectionId, sectionName) => {
    setDeleteConfirm({ open: true, sectionId, sectionName });
  };

  const handleDeleteSection = async () => {
    const { sectionId } = deleteConfirm;
    setDeleteConfirm({ open: false, sectionId: null, sectionName: '' });
    try {
      // Delete from adminSections
      await deleteDoc(doc(firestore, 'adminSections', sectionId));

      // Cascade: remove from every user who has this section in their config
      const affectedUsers = users.filter(u =>
        (u.config?.customSections || []).some(s => s.id === sectionId)
      );
      await Promise.all(affectedUsers.map(u => {
        const updatedSections = (u.config?.customSections || []).filter(s => s.id !== sectionId);
        return setDoc(doc(firestore, 'userConfig', u.email || u.id), {
          config: { customSections: updatedSections }
        }, { merge: true });
      }));

      if (selectedSection?.id === sectionId) resetSectionForm();
      const msg = affectedUsers.length > 0
        ? `Section deleted and removed from ${affectedUsers.length} user(s).`
        : 'Section deleted.';
      setMessage({ type: 'success', text: msg });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete: ' + err.message });
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Admin Access Required</Typography>
        <Typography variant="body1" color="text.secondary">
          Only administrators can access this panel.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Admin Panel</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user access, configuration, and custom sections.
          </Typography>
        </Box>
        <Chip icon={<ShieldCheck size={16} />} label={currentUser?.email || 'Admin'} color="primary" variant="outlined" />
      </Stack>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs value={adminTab} onChange={(_, v) => setAdminTab(v)} sx={{ '& .MuiTabs-indicator': { height: 3 } }}>
          <Tab value="users" label="Users" sx={{ fontWeight: 600, minHeight: 52 }} />
          <Tab value="sections" label="Section Builder" sx={{ fontWeight: 600, minHeight: 52 }} />
        </Tabs>
      </Paper>

      {/* ===================== USERS TAB ===================== */}
      {adminTab === 'users' && (
        <Grid container spacing={3}>
          {/* Left: User list */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Allowed Users</Typography>
                  <Button size="small" startIcon={<Plus size={16} />} onClick={resetUserForm}>New</Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
                  {users.map(u => (
                    <Box key={u.id} sx={{
                      mb: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', cursor: 'pointer',
                      borderColor: selectedEmail === (u.email || u.id) ? 'primary.main' : 'divider',
                      bgcolor: selectedEmail === (u.email || u.id) ? alpha('#1976d2', 0.06) : 'background.paper',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1
                    }}
                      onClick={() => loadUser(u)}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                          {u.email || u.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.allowed === false ? 'Blocked' : 'Allowed'}
                          {u.isAdmin ? ' • Admin' : ''}
                        </Typography>
                      </Box>
                      <Tooltip title="Remove user">
                        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDeleteUser(u.email || u.id); }}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                  {users.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No users configured yet.</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: User config form */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>User Configuration</Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField label="Email" fullWidth value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.allowed} onChange={e => setForm(f => ({ ...f, allowed: e.target.checked }))} />}
                      label="Allowed to Access App" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} />}
                      label="Admin" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Business Type" fullWidth value={form.businessType}
                      onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.multiBusiness} onChange={e => setForm(f => ({ ...f, multiBusiness: e.target.checked }))} />}
                      label="Allow Multiple Businesses" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.useIndexedDB} onChange={e => setForm(f => ({ ...f, useIndexedDB: e.target.checked }))} />}
                      label="Use IndexedDB Storage" />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField label="Primary Color" fullWidth value={form.themePrimary}
                      onChange={e => setForm(f => ({ ...f, themePrimary: e.target.value }))}
                      InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: form.themePrimary, mr: 1, border: '1px solid rgba(0,0,0,.15)', flexShrink: 0 }} /> }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField label="Secondary Color" fullWidth value={form.themeSecondary}
                      onChange={e => setForm(f => ({ ...f, themeSecondary: e.target.value }))}
                      InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: form.themeSecondary, mr: 1, border: '1px solid rgba(0,0,0,.15)', flexShrink: 0 }} /> }} />
                  </Grid>

                  {/* Feature Flags */}
                  <Grid item xs={12}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Enabled Features</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {featureKeys.map(key => (
                        <Chip key={key} label={featureLabels[key] || key} clickable
                          color={form.features[key] ? 'primary' : 'default'}
                          variant={form.features[key] ? 'filled' : 'outlined'}
                          onClick={() => setForm(f => ({ ...f, features: { ...f.features, [key]: !f.features[key] } }))}
                        />
                      ))}
                    </Box>
                  </Grid>

                  {/* Assigned Sections */}
                  {sections.length > 0 && (
                    <Grid item xs={12}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Custom Sections</Typography>

                      {/* Currently assigned — with × remove button */}
                      {form.assignedSectionIds.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Assigned — click × to remove
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {sections
                              .filter(sec => form.assignedSectionIds.includes(sec.id))
                              .map(sec => (
                                <Chip key={sec.id}
                                  label={sec.name}
                                  color="primary"
                                  icon={<AdminIcon name={sec.icon} size={14} />}
                                  onDelete={() => setForm(f => ({
                                    ...f,
                                    assignedSectionIds: f.assignedSectionIds.filter(id => id !== sec.id)
                                  }))}
                                />
                              ))
                            }
                          </Box>
                        </Box>
                      )}

                      {/* Available sections to add */}
                      {sections.some(sec => !form.assignedSectionIds.includes(sec.id)) && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Available — click to assign
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {sections
                              .filter(sec => !form.assignedSectionIds.includes(sec.id))
                              .map(sec => (
                                <Chip key={sec.id}
                                  label={sec.name}
                                  clickable
                                  variant="outlined"
                                  icon={<AdminIcon name={sec.icon} size={14} />}
                                  onClick={() => setForm(f => ({
                                    ...f,
                                    assignedSectionIds: [...f.assignedSectionIds, sec.id]
                                  }))}
                                />
                              ))
                            }
                          </Box>
                        </Box>
                      )}

                      {form.assignedSectionIds.length === 0 && orphanedSections.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No sections assigned. Click a section above to assign it to this user.
                        </Typography>
                      )}

                      {/* Orphaned sections: deleted from Section Builder but still in user config */}
                      {orphanedSections.length > 0 && (
                        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.light' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark', display: 'block', mb: 1 }}>
                            Deleted sections still assigned to this user — save to remove them:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {orphanedSections.map(sec => (
                              <Chip key={sec.id}
                                label={sec.name}
                                color="warning"
                                size="small"
                                onDelete={() => setOrphanedSections(prev => prev.filter(s => s.id !== sec.id))}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Grid>
                  )}

                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button variant="outlined" onClick={resetUserForm}>Cancel</Button>
                      <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSaveUser}>
                        Save Configuration
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ===================== SECTION BUILDER TAB ===================== */}
      {adminTab === 'sections' && (
        <Grid container spacing={3}>
          {/* Left: Section list */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Sections</Typography>
                  <Button size="small" startIcon={<Plus size={16} />} onClick={resetSectionForm}>New</Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {sections.length === 0 && (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No sections yet.</Typography>
                    <Typography variant="caption" color="text.secondary">Click "New" to create your first section.</Typography>
                  </Box>
                )}

                <Stack spacing={1}>
                  {sections.map(sec => (
                    <Box key={sec.id} onClick={() => loadSection(sec)} sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer', border: '1px solid',
                      borderColor: selectedSection?.id === sec.id ? 'primary.main' : 'divider',
                      bgcolor: selectedSection?.id === sec.id ? alpha('#1976d2', 0.06) : 'background.paper',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#1976d2', 0.04) },
                      transition: 'all 0.15s'
                    }}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: sec.color || '#1976d2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        <AdminIcon name={sec.icon} size={18} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{sec.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(() => {
                            const tabCount = (sec.tabs || []).length;
                            const totalFields = sec.tabs
                              ? sec.tabs.reduce((sum, t) => sum + (t.fields || []).length, 0)
                              : (sec.fields || []).length;
                            return tabCount > 1
                              ? `${tabCount} tabs · ${totalFields} fields`
                              : `${totalFields} field${totalFields !== 1 ? 's' : ''}`;
                          })()}
                          {sec.description ? ` · ${sec.description}` : ''}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error"
                        onClick={e => { e.stopPropagation(); confirmDeleteSection(sec.id, sec.name); }}>
                        <Trash2 size={14} />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Section editor */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>

                {/* Section Info */}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                  {selectedSection ? `Editing: ${selectedSection.name}` : 'New Section'}
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Section Name *" value={sectionForm.name}
                      onChange={e => setSectionForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Measurements, Readings" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Description" value={sectionForm.description}
                      onChange={e => setSectionForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Short description of this section" />
                  </Grid>
                </Grid>

                {/* Color Picker */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Color</Typography>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    {PRESET_COLORS.map(c => (
                      <Tooltip key={c} title={c}>
                        <Box onClick={() => setSectionForm(f => ({ ...f, color: c }))} sx={{
                          width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                          border: '3px solid',
                          borderColor: sectionForm.color === c ? 'text.primary' : 'transparent',
                          boxShadow: sectionForm.color === c ? `0 0 0 2px white inset` : 'none',
                          transition: 'transform 0.15s',
                          '&:hover': { transform: 'scale(1.2)' }
                        }} />
                      </Tooltip>
                    ))}
                    <TextField size="small" label="Hex" value={sectionForm.color}
                      onChange={e => setSectionForm(f => ({ ...f, color: e.target.value }))}
                      sx={{ width: 120 }}
                      InputProps={{
                        startAdornment: <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: sectionForm.color, mr: 0.5, border: '1px solid rgba(0,0,0,.2)', flexShrink: 0 }} />
                      }} />
                  </Stack>
                </Box>

                {/* Icon Picker */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Icon</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: 1 }}>
                    {SECTION_ICON_LIST.map(({ name, Icon }) => (
                      <Tooltip key={name} title={name}>
                        <Box onClick={() => setSectionForm(f => ({ ...f, icon: name }))} sx={{
                          height: 56, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 0.5,
                          borderRadius: 1.5, cursor: 'pointer', border: '2px solid',
                          borderColor: sectionForm.icon === name ? sectionForm.color || 'primary.main' : 'divider',
                          bgcolor: sectionForm.icon === name ? alpha(sectionForm.color || '#1976d2', 0.08) : 'background.default',
                          '&:hover': { borderColor: sectionForm.color || 'primary.main', bgcolor: alpha(sectionForm.color || '#1976d2', 0.05) },
                          transition: 'all 0.15s'
                        }}>
                          <Icon size={20} color={sectionForm.icon === name ? sectionForm.color || '#1976d2' : '#666'} />
                          <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.2 }}>
                            {name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Tabs & Fields Builder */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Tabs & Fields</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sectionForm.tabs.length === 1
                        ? 'Single tab — users see fields directly with no tab bar.'
                        : `${sectionForm.tabs.length} tabs — users switch between tabs in the form.`}
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<Plus size={16} />} onClick={addTab}
                    variant="outlined" sx={{ borderRadius: 2, flexShrink: 0 }}>
                    Add Tab
                  </Button>
                </Stack>

                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                  {/* Tab bar */}
                  <Box sx={{
                    display: 'flex', alignItems: 'stretch', overflowX: 'auto',
                    bgcolor: alpha(sectionForm.color || '#1976d2', 0.04),
                    borderBottom: '1px solid', borderColor: 'divider'
                  }}>
                    {sectionForm.tabs.map((tab, tabIdx) => {
                      const isActive = activeTabIdx === tabIdx;
                      return (
                        <Box key={tab.id} onClick={() => setActiveTabIdx(tabIdx)} sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 2, py: 1.25, cursor: 'pointer', userSelect: 'none',
                          borderBottom: '3px solid',
                          borderBottomColor: isActive ? (sectionForm.color || 'primary.main') : 'transparent',
                          bgcolor: isActive ? alpha(sectionForm.color || '#1976d2', 0.10) : 'transparent',
                          color: isActive ? (sectionForm.color || 'primary.main') : 'text.secondary',
                          fontWeight: isActive ? 700 : 400,
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: alpha(sectionForm.color || '#1976d2', 0.07) }
                        }}>
                          {tab.name || `Tab ${tabIdx + 1}`}
                          <Chip size="small" label={tab.fields.length}
                            sx={{ height: 18, fontSize: '0.65rem', ml: 0.5,
                              bgcolor: isActive ? alpha(sectionForm.color || '#1976d2', 0.15) : 'transparent',
                              color: isActive ? (sectionForm.color || 'primary.main') : 'text.disabled'
                            }} />
                          {sectionForm.tabs.length > 1 && (
                            <IconButton size="small" color="error"
                              onClick={e => { e.stopPropagation(); removeTab(tabIdx); }}
                              sx={{ p: 0.2, ml: 0.25, opacity: isActive ? 1 : 0.4, '&:hover': { opacity: 1 } }}>
                              <X size={11} />
                            </IconButton>
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Active tab content */}
                  {sectionForm.tabs[activeTabIdx] && (
                    <Box sx={{ p: 2 }}>
                      {/* Tab name + reorder */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <TextField
                          size="small" label="Tab Name" value={sectionForm.tabs[activeTabIdx].name}
                          onChange={e => updateTabName(activeTabIdx, e.target.value)}
                          sx={{ flex: 1 }}
                          inputProps={{ style: { fontWeight: 600 } }}
                        />
                        <Tooltip title="Move tab left">
                          <span>
                            <IconButton size="small" onClick={() => { moveTab(activeTabIdx, -1); setActiveTabIdx(i => Math.max(0, i - 1)); }}
                              disabled={activeTabIdx === 0}>
                              <ChevronUp size={16} style={{ transform: 'rotate(-90deg)' }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move tab right">
                          <span>
                            <IconButton size="small" onClick={() => { moveTab(activeTabIdx, 1); setActiveTabIdx(i => Math.min(sectionForm.tabs.length - 1, i + 1)); }}
                              disabled={activeTabIdx === sectionForm.tabs.length - 1}>
                              <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>

                      {/* Fields list */}
                      {sectionForm.tabs[activeTabIdx].fields.length === 0 && (
                        <Box sx={{ py: 4, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 2, mb: 1.5 }}>
                          <Typography variant="body2" color="text.secondary">No fields in this tab yet.</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Click "Add Field" to start adding fields.
                          </Typography>
                        </Box>
                      )}

                      <Stack spacing={1.5}>
                        {sectionForm.tabs[activeTabIdx].fields.map((field, fieldIdx) => (
                          <Paper key={field.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Stack spacing={0} sx={{ flexShrink: 0 }}>
                                <IconButton size="small" onClick={() => moveField(activeTabIdx, fieldIdx, -1)} disabled={fieldIdx === 0} sx={{ p: 0.25 }}>
                                  <ChevronUp size={14} />
                                </IconButton>
                                <IconButton size="small" onClick={() => moveField(activeTabIdx, fieldIdx, 1)} disabled={fieldIdx === sectionForm.tabs[activeTabIdx].fields.length - 1} sx={{ p: 0.25 }}>
                                  <ChevronDown size={14} />
                                </IconButton>
                              </Stack>

                              <TextField size="small" label="Field Name" value={field.name}
                                onChange={e => updateField(activeTabIdx, fieldIdx, 'name', e.target.value)}
                                placeholder="e.g., Chest, Notes"
                                sx={{ flex: '2 1 130px', minWidth: 110 }} />

                              <TextField select size="small" label="Type" value={field.type}
                                onChange={e => updateField(activeTabIdx, fieldIdx, 'type', e.target.value)}
                                sx={{ flex: '1 1 110px', minWidth: 100 }}>
                                {FIELD_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                              </TextField>

                              {field.type !== 'textarea' && field.type !== 'date' && field.type !== 'select' && (
                                <TextField size="small" label="Unit" value={field.unit}
                                  onChange={e => updateField(activeTabIdx, fieldIdx, 'unit', e.target.value)}
                                  placeholder="cm, kg…"
                                  sx={{ flex: '0 1 80px', width: 80 }} />
                              )}

                              <FormControlLabel
                                control={<Switch size="small" checked={!!field.required}
                                  onChange={e => updateField(activeTabIdx, fieldIdx, 'required', e.target.checked)}
                                  sx={{ ml: 0.5 }} />}
                                label={<Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>Required</Typography>}
                                sx={{ mx: 0, flexShrink: 0 }}
                              />

                              <IconButton size="small" color="error" onClick={() => removeField(activeTabIdx, field.id)} sx={{ flexShrink: 0 }}>
                                <X size={16} />
                              </IconButton>
                            </Stack>

                            {field.type === 'select' && (
                              <TextField fullWidth size="small" label="Options (comma-separated)" value={field.options}
                                onChange={e => updateField(activeTabIdx, fieldIdx, 'options', e.target.value)}
                                placeholder="Option 1, Option 2, Option 3"
                                sx={{ mt: 1.5 }} />
                            )}
                          </Paper>
                        ))}
                      </Stack>

                      <Button size="small" variant="outlined" startIcon={<Plus size={14} />}
                        onClick={() => addField(activeTabIdx)} sx={{ mt: 2, borderRadius: 2 }}>
                        Add Field to "{sectionForm.tabs[activeTabIdx].name || `Tab ${activeTabIdx + 1}`}"
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* Save / Delete */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  {selectedSection ? (
                    <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />}
                      onClick={() => confirmDeleteSection(selectedSection.id, selectedSection.name || sectionForm.name)}>
                      Delete Section
                    </Button>
                  ) : <Box />}
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={resetSectionForm}>Cancel</Button>
                    <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSaveSection}
                      sx={{ bgcolor: sectionForm.color || 'primary.main', '&:hover': { filter: 'brightness(0.9)', bgcolor: sectionForm.color || 'primary.main' } }}>
                      Save Section
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Delete Section Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, sectionId: null, sectionName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Section?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{deleteConfirm.sectionName}</strong>? Users assigned this section will lose access to it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, sectionId: null, sectionName: '' })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteSection}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;
