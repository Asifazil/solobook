import React, { useState, useRef } from 'react';
import {
  Box, Button, Typography, TextField, Grid, IconButton, InputAdornment,
  Stack, Paper, Container, Autocomplete, Alert, Snackbar, MenuItem,
  Tabs, Tab
} from '@mui/material';
import { Save, Edit2, Trash2, ChevronLeft, Plus, Printer, User, Calendar, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useConfig } from './ConfigContext';
import { useBusiness } from './BusinessContext';
import { useData } from './DataContext';
import DataGrid from './DataGrid';
import { useReactToPrint } from 'react-to-print';
import SectionPrintTemplate from './SectionPrintTemplate';
import SectionIcon from './SectionIcon';

const emptyTabForm = (tab) => {
  const fields = {};
  (tab?.fields || []).forEach(f => { fields[f.id] = ''; });
  return { partyName: '', date: new Date().toISOString().split('T')[0], fields, notes: '' };
};

const CustomSection = () => {
  const { sectionId } = useParams();
  const { config } = useConfig();
  const { currentBusiness } = useBusiness();
  const { getItems, addItem, updateItem, deleteItem } = useData();

  const section = config.customSections?.find(s => s.id === sectionId);

  // Normalize to tabs array (handles legacy flat-fields sections too)
  const tabs = section?.tabs?.length > 0
    ? section.tabs
    : section?.fields?.length > 0
      ? [{ id: `${sectionId}_default`, name: section.name, fields: section.fields }]
      : [];
  const multiTab = tabs.length > 1;

  // Which tab is selected in the list view
  const [activeSectionTab, setActiveSectionTab] = useState(0);

  // Record form state
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [activeTabForRecord, setActiveTabForRecord] = useState(null);
  const [form, setForm] = useState({});

  // Print state
  const [printingRecord, setPrintingRecord] = useState(null);
  const [printingTab, setPrintingTab] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const printRef = useRef();

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const allRecords = (getItems('customSectionRecords') || []).filter(
    r => r.businessId === currentBusiness?.id && r.sectionId === sectionId
  );

  // Records for a specific tab; old records without tabId fall under the first tab
  const getTabRecords = (tab, tabIdx) =>
    allRecords.filter(r => r.tabId === tab.id || (!r.tabId && tabIdx === 0));

  const parties = (getItems('parties') || []).filter(
    p => p.businessId === currentBusiness?.id && p.type === 'Customer'
  );

  if (!section) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">Section not found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This section may have been removed. Contact your administrator.
        </Typography>
      </Box>
    );
  }

  const handleNewRecord = (tab) => {
    setActiveTabForRecord(tab);
    setForm(emptyTabForm(tab));
    setEditId(null);
    setView('create');
  };

  const handleEditRecord = (tab, row) => {
    setActiveTabForRecord(tab);
    const fields = {};
    (tab?.fields || []).forEach(f => { fields[f.id] = row.fields?.[f.id] ?? ''; });
    setForm({
      partyName: row.partyName || '',
      date: row.date || new Date().toISOString().split('T')[0],
      notes: row.notes || '',
      fields
    });
    setEditId(row.id);
    setView('edit');
  };

  const handleFieldChange = (fieldId, value) => {
    setForm(prev => ({ ...prev, fields: { ...prev.fields, [fieldId]: value } }));
  };

  const handleSave = async () => {
    if (!currentBusiness?.id) { showSnackbar('Business not selected', 'error'); return; }
    if (!form.date) { showSnackbar('Please select a date', 'warning'); return; }

    for (const f of (activeTabForRecord?.fields || [])) {
      if (f.required && !form.fields[f.id]) {
        showSnackbar(`${f.name} is required`, 'warning');
        return;
      }
    }

    const dataToSave = {
      ...form,
      sectionId,
      tabId: activeTabForRecord?.id,
      businessId: currentBusiness.id,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editId) {
        await updateItem('customSectionRecords', editId, dataToSave);
      } else {
        await addItem('customSectionRecords', { ...dataToSave, createdAt: new Date().toISOString() });
      }
      showSnackbar(editId ? 'Record updated!' : 'Record saved!', 'success');
      setView('list');
      setEditId(null);
    } catch {
      showSnackbar('Error saving record', 'error');
    }
  };

  const renderField = (field) => {
    const value = form.fields?.[field.id] ?? '';
    const onChange = (e) => handleFieldChange(field.id, e.target.value);
    const label = field.name + (field.required ? ' *' : '');

    if (field.type === 'select') {
      return (
        <TextField select fullWidth label={label} value={value} onChange={onChange}>
          <MenuItem value="">None</MenuItem>
          {(field.options || []).map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </TextField>
      );
    }
    if (field.type === 'textarea') {
      return <TextField fullWidth label={label} value={value} onChange={onChange} multiline rows={3} />;
    }
    return (
      <TextField
        fullWidth label={label} value={value} onChange={onChange}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        InputProps={field.unit ? { endAdornment: <InputAdornment position="end">{field.unit}</InputAdornment> } : undefined}
      />
    );
  };

  const snackbarEl = (
    <Snackbar open={snackbar.open} autoHideDuration={5000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  // Build a section-like object for printing (uses only the relevant tab's fields)
  const buildPrintSection = (tab) => ({
    ...section,
    name: multiTab ? tab?.name : section.name,
    fields: tab?.fields || [],
    tabs: null
  });

  // ─── Create / Edit View ───────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    const tab = activeTabForRecord;
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
        <div style={{ display: 'none' }}>
          <SectionPrintTemplate ref={printRef} section={buildPrintSection(tab)} record={form} business={currentBusiness} />
        </div>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={() => { setView('list'); setEditId(null); }}
                sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                <ChevronLeft size={20} />
              </IconButton>
              <Button startIcon={<Printer size={18} />} onClick={() => handlePrint()} variant="outlined" sx={{ borderRadius: 2 }}>
                Print
              </Button>
            </Stack>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {editId ? 'Edit' : 'New'} {multiTab ? tab?.name : section.name}
              </Typography>
              {multiTab && (
                <Typography variant="caption" color="text.secondary">{section.name}</Typography>
              )}
            </Box>
            <Button variant="contained" disableElevation startIcon={<Save size={18} />} onClick={handleSave}
              sx={{ borderRadius: 2, px: 3 }}>
              Save
            </Button>
          </Stack>

          <Stack spacing={3}>
            {/* Basic Info */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Basic Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo options={parties.map(p => p.name)} fullWidth value={form.partyName}
                    onChange={(_, v) => setForm(prev => ({ ...prev, partyName: v || '' }))}
                    onInputChange={(_, v) => setForm(prev => ({ ...prev, partyName: v }))}
                    renderInput={params => (
                      <TextField {...params} label="Customer Name"
                        InputProps={{ ...params.InputProps, startAdornment: <User size={18} style={{ marginRight: 8, color: 'rgba(0,0,0,0.54)' }} /> }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="date" label="Date" value={form.date} required
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={18} color="rgba(0,0,0,0.54)" /></InputAdornment> }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Fields for this tab */}
            {(tab?.fields || []).length > 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: 1.5,
                    bgcolor: section.color || 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                  }}>
                    <SectionIcon name={section.icon} size={16} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {multiTab ? tab?.name : section.name} Details
                  </Typography>
                </Stack>
                <Grid container spacing={2.5}>
                  {(tab?.fields || []).map(field => (
                    <Grid item xs={12} sm={field.type === 'textarea' ? 12 : 6} md={field.type === 'textarea' ? 12 : 4} key={field.id}>
                      {renderField(field)}
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Notes */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info size={18} /> Notes
              </Typography>
              <TextField fullWidth multiline rows={3} placeholder="Additional notes..."
                value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Paper>
          </Stack>
          {snackbarEl}
        </Container>
      </Box>
    );
  }

  // ─── Per-tab record list renderer ────────────────────────────────────────
  const renderTabContent = (tab, tabIdx) => {
    const tabRecords = getTabRecords(tab, tabIdx);
    const dynColumns = (tab?.fields || []).slice(0, 3).map(f => ({
      key: 'fields',
      header: `${f.name}${f.unit ? ` (${f.unit})` : ''}`,
      width: 130,
      render: (fields) => {
        const v = fields?.[f.id];
        return v ? `${v}${f.unit ? ` ${f.unit}` : ''}` : '—';
      }
    }));

    return (
      <Box>
        <div style={{ display: 'none' }}>
          <SectionPrintTemplate
            ref={printRef}
            section={buildPrintSection(printingTab || tab)}
            record={printingRecord}
            business={currentBusiness}
          />
        </div>

        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button variant="contained" disableElevation startIcon={<Plus size={18} />}
            onClick={() => handleNewRecord(tab)}
            sx={{ bgcolor: section.color || '#1A1C1E', borderRadius: 2, px: 3 }}>
            New Record
          </Button>
        </Stack>

        <DataGrid
          data={tabRecords}
          columns={[
            { key: 'date', header: 'Date', width: 110 },
            { key: 'partyName', header: 'Customer', width: 180, render: v => v || '—' },
            ...dynColumns
          ]}
          actions={row => (
            <Stack direction="row" spacing={1}>
              <IconButton size="small" color="primary" title="Print"
                onClick={() => {
                  setPrintingRecord(row);
                  setPrintingTab(tab);
                  setTimeout(() => handlePrint(), 100);
                }}>
                <Printer size={18} />
              </IconButton>
              <IconButton size="small" onClick={() => handleEditRecord(tab, row)}>
                <Edit2 size={18} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => deleteItem('customSectionRecords', row.id)}>
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          )}
        />
      </Box>
    );
  };

  // ─── List View ───────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Section header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: section.color || 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <SectionIcon name={section.icon} size={22} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{section.name}</Typography>
            {section.description && (
              <Typography variant="body2" color="text.secondary">{section.description}</Typography>
            )}
          </Box>
        </Stack>
        {/* Single-tab New Record button lives in the header */}
        {!multiTab && (
          <Button variant="contained" disableElevation startIcon={<Plus />}
            onClick={() => handleNewRecord(tabs[0])}
            sx={{ bgcolor: section.color || '#1A1C1E', borderRadius: 2, px: 3 }}>
            New Record
          </Button>
        )}
      </Stack>

      {multiTab ? (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {/* Tab bar */}
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tabs
              value={activeSectionTab}
              onChange={(_, v) => setActiveSectionTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': { bgcolor: section.color || 'primary.main', height: 3 },
                '& .Mui-selected': { color: `${section.color || 'primary.main'} !important`, fontWeight: 700 }
              }}
            >
              {tabs.map((tab, i) => (
                <Tab key={tab.id} label={tab.name} value={i}
                  sx={{ minHeight: 52, fontWeight: 500, fontSize: '0.875rem' }} />
              ))}
            </Tabs>
          </Box>
          {/* Active tab record list */}
          <Box sx={{ p: 3 }}>
            {renderTabContent(tabs[activeSectionTab], activeSectionTab)}
          </Box>
        </Paper>
      ) : (
        renderTabContent(tabs[0], 0)
      )}

      {snackbarEl}
    </Box>
  );
};

export default CustomSection;
