import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, TextField, InputAdornment, Button,
  Grid, MenuItem, Chip, IconButton, Typography, Collapse, Card, CardContent
} from '@mui/material';
import {
  Search, Filter, ChevronDown, ChevronUp, X, SortAsc, SortDesc, FileText
} from 'lucide-react';

const DataGrid = ({
  data = [],
  columns = [],
  title = '',
  searchPlaceholder = 'Search...',
  enableSearch = true,
  enableFilters = true,
  enablePagination = true,
  enableSorting = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  emptyMessage = 'No data found',
  loading = false,
  onRowClick,
  actions,
  filters: externalFilters = {},
  onFiltersChange,
  customFilters = [],
  renderRow,
  height = 600
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showFilters, setShowFilters] = useState(false);
  const [internalFilters, setInternalFilters] = useState({});

  // Combine internal and external filters
  const filters = { ...internalFilters, ...externalFilters };

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters, sortConfig]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery && enableSearch) {
      result = result.filter(item =>
        columns.some(col =>
          col.searchable !== false &&
          String(item[col.key] || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply filters
    if (enableFilters) {
      result = result.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || value === 'all') return true;

          const itemValue = item[key];
          if (typeof value === 'object') {
            // Range filter
            if (value.min !== undefined && itemValue < value.min) return false;
            if (value.max !== undefined && itemValue > value.max) return false;
            return true;
          }

          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortConfig.key && enableSorting) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchQuery, filters, sortConfig, columns, enableSearch, enableFilters, enableSorting]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return processedData;
    return processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedData, page, rowsPerPage, enablePagination]);

  const handleSort = (key) => {
    if (!enableSorting) return;

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...internalFilters, [key]: value };
    setInternalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    setInternalFilters({});
    setSearchQuery('');
    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v =>
    v && v !== 'all' && (typeof v !== 'object' || v.min !== undefined || v.max !== undefined)
  ).length + (searchQuery ? 1 : 0);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        {(title || enableSearch || enableFilters) && (
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            {title && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
                {title}
              </Typography>
            )}

            <Grid container spacing={1.5} alignItems="center">
              {enableSearch && (
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={18} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <X size={16} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6} md={8}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {enableFilters && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowFilters(!showFilters)}
                      startIcon={<Filter size={16} />}
                      endIcon={showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    >
                      Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </Button>
                  )}

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={clearFilters}
                      startIcon={<X size={16} />}
                      color="error"
                    >
                      Clear
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Filters Panel */}
        {enableFilters && (
          <Collapse in={showFilters}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Grid container spacing={1.5}>
                {columns.map(col => {
                  if (!col.filterable) return null;

                  if (col.filterType === 'select') {
                    return (
                      <Grid item xs={12} sm={6} md={3} key={col.key}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label={col.header}
                          value={filters[col.key] || 'all'}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        >
                          <MenuItem value="all">All {col.header}</MenuItem>
                          {col.filterOptions?.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    );
                  }

                  if (col.filterType === 'range') {
                    return (
                      <React.Fragment key={col.key}>
                        <Grid item xs={6} sm={3} md={1.5}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Min ${col.header}`}
                            type="number"
                            value={filters[col.key]?.min || ''}
                            onChange={(e) => handleFilterChange(col.key, {
                              ...filters[col.key],
                              min: e.target.value ? Number(e.target.value) : undefined
                            })}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3} md={1.5}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Max ${col.header}`}
                            type="number"
                            value={filters[col.key]?.max || ''}
                            onChange={(e) => handleFilterChange(col.key, {
                              ...filters[col.key],
                              max: e.target.value ? Number(e.target.value) : undefined
                            })}
                          />
                        </Grid>
                      </React.Fragment>
                    );
                  }

                  return (
                    <Grid item xs={12} sm={6} md={3} key={col.key}>
                      <TextField
                        fullWidth
                        size="small"
                        label={col.header}
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        placeholder={`Filter ${col.header.toLowerCase()}`}
                      />
                    </Grid>
                  );
                })}

                {customFilters.map((filter, index) => (
                  <Grid item xs={12} sm={6} md={3} key={`custom-${index}`}>
                    {filter}
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        )}

        {/* Table */}
        <TableContainer sx={{ maxHeight: enablePagination ? height : 'none' }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: '6px' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    sx={{
                      fontWeight: 700,
                      cursor: enableSorting && col.sortable !== false ? 'pointer' : 'default',
                      userSelect: 'none',
                      minWidth: col.width || 'auto'
                    }}
                    onClick={() => handleSort(col.key)}
                    align={col.align || 'left'}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {col.header}
                      {enableSorting && col.sortable !== false && sortConfig.key === col.key && (
                        sortConfig.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />
                      )}
                    </Box>
                  </TableCell>
                ))}
                {actions && <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: 0.5 }}>
                      <FileText size={32} strokeWidth={1.5} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{emptyMessage}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  renderRow ? renderRow(row, index) : (
                    <TableRow
                      key={row.id || index}
                      hover
                      onClick={() => onRowClick && onRowClick(row)}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {columns.map(col => (
                        <TableCell key={col.key} align={col.align || 'left'}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </TableCell>
                      ))}
                      {actions && (
                        <TableCell align="right">
                          {actions(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {enablePagination && processedData.length > rowsPerPage && (
          <TablePagination
            component="div"
            count={processedData.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={pageSizeOptions}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DataGrid;