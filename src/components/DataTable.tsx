import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import EditIcon from '@mui/icons-material/Edit';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition[];
  onAddColumn: () => void;
  onDeleteColumn?: (field: string) => void;
  onDeleteRow?: (id: string) => void;
  onEditRow?: (id: string) => void;
  onDeleteMultipleRows?: (ids: string[]) => void;
  customFields?: string[];
  emptyMessage?: string;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  width?: number;
  flex?: number;
  renderCell?: (value: any, row: any) => React.ReactNode;
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  onAddColumn,
  onDeleteColumn,
  onDeleteRow,
  onEditRow,
  onDeleteMultipleRows,
  customFields = [],
  emptyMessage = 'No data available'
}: DataTableProps<T>) => {
  // Debug skills data
  console.log('DataTable data:', data);
  if (data.length > 0) {
    console.log('First row skills:', data[0].skills, 'Type:', typeof data[0].skills);
  }
  
  // State for selected rows
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // State for delete confirmation dialog
  const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);
  
  // Get all IDs from data
  const allIds = data.map(row => row.id);
  
  // Check if all rows are selected
  const isAllSelected = selectedRows.length > 0 && selectedRows.length === data.length;
  
  // Handle header checkbox click (select/deselect all)
  const handleSelectAllClick = () => {
    if (isAllSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...allIds]);
    }
  };

  // Handle individual row selection
  const handleRowSelect = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Open confirmation dialog for bulk delete
  const confirmBulkDelete = () => {
    if (selectedRows.length > 0) {
      setOpenDeleteConfirmation(true);
    }
  };

  // Handle bulk delete after confirmation
  const handleBulkDelete = () => {
    if (onDeleteMultipleRows && selectedRows.length > 0) {
      onDeleteMultipleRows(selectedRows);
      setSelectedRows([]);
      setOpenDeleteConfirmation(false);
    }
  };

  // Cancel bulk delete
  const cancelBulkDelete = () => {
    setOpenDeleteConfirmation(false);
  };

  // Helper function to normalize skills for display
  const normalizeSkillsForDisplay = (value: any): string => {
    // Exit early for undefined/null
    if (value === undefined || value === null) return '';
    
    // If skills is an array, join with commas
    if (Array.isArray(value)) {
      return value.map(skill => String(skill).trim()).filter(Boolean).join(', ');
    }
    
    // If skills is a string that already contains commas
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      
      // Handle comma-separated string
      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .join(', ');
      }
      
      // Single skill as string
      return trimmed;
    }
    
    // Try parsing JSON string
    if (typeof value === 'string') {
      try {
        const parsedValue = JSON.parse(value);
        if (Array.isArray(parsedValue)) {
          return parsedValue.map(v => String(v).trim()).filter(Boolean).join(', ');
        }
      } catch (e) {
        // Not JSON, continue with other checks
      }
    }
    
    // If it's an object with values
    if (typeof value === 'object' && value !== null) {
      try {
        const objValues = Object.values(value);
        if (objValues.length > 0) {
          return objValues.map(v => String(v).trim()).filter(Boolean).join(', ');
        }
      } catch (e) {
        // Unable to extract values
      }
    }
    
    // Last resort: convert to string
    try {
      const stringValue = String(value).trim();
      return stringValue || '';
    } catch (e) {
      return '';
    }
  };

  // Function to render cell content
  const renderCellContent = (field: string, value: any, row: any) => {
    // For skills column - enhanced handling
    if (field === 'skills') {
      // Enhanced debug logging
      console.log(`Rendering skills for ${row.name || 'unknown staff'}:`, value, 'Type:', typeof value, 'isArray:', Array.isArray(value), 'Raw Value:', JSON.stringify(value));
      
      return normalizeSkillsForDisplay(value);
    }
    
    // For other columns
    return value !== undefined && value !== null
      ? (Array.isArray(value) ? value.join(', ') : String(value))
      : '';
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Bulk delete controls */}
      {selectedRows.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          px: 2,
          py: 1
        }}>
          <Typography variant="body1">
            {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
          </Typography>
          <Tooltip title="Delete selected items">
            <IconButton 
              color="inherit"
              onClick={confirmBulkDelete}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" align="center" sx={{ width: 50 }}>
                <Typography variant="body2" fontWeight="bold">
                  #
                </Typography>
              </TableCell>
              
              {/* Bulk selection checkbox */}
              {onDeleteMultipleRows && (
                <TableCell padding="checkbox" sx={{ width: 50 }}>
                  <Box display="flex" justifyContent="center">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedRows.length > 0 && selectedRows.length < data.length}
                      checked={isAllSelected}
                      onChange={handleSelectAllClick}
                      inputProps={{
                        'aria-label': 'select all items',
                      }}
                    />
                  </Box>
                </TableCell>
              )}
              
              {onEditRow && (
                <TableCell padding="checkbox" align="center" sx={{ width: 50 }} />
              )}
              
              {columns.map((column) => (
                <TableCell 
                  key={column.field}
                  style={{ 
                    minWidth: column.width, 
                    width: column.width,
                    flex: column.flex
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{column.headerName}</span>
                    {customFields.includes(column.field) && onDeleteColumn && (
                      <Tooltip title={`Delete ${column.headerName} column`}>
                        <IconButton 
                          onClick={() => onDeleteColumn(column.field)} 
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              ))}
              <TableCell padding="checkbox">
                <Tooltip title="Add Column">
                  <IconButton onClick={onAddColumn} size="small">
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => (
                <TableRow 
                  hover 
                  key={row.id}
                  selected={selectedRows.includes(row.id)}
                >
                  <TableCell padding="checkbox" align="center">
                    <Typography variant="body2">
                      {data.indexOf(row) + 1}
                    </Typography>
                  </TableCell>
                  
                  {/* Row selection checkbox */}
                  {onDeleteMultipleRows && (
                    <TableCell padding="checkbox">
                      <Box display="flex" justifyContent="center">
                        <Checkbox
                          color="primary"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleRowSelect(row.id)}
                          inputProps={{
                            'aria-labelledby': `row-${row.id}`,
                          }}
                        />
                      </Box>
                    </TableCell>
                  )}
                  
                  {onEditRow && (
                    <TableCell padding="checkbox">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() => onEditRow(row.id)}
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column.field}`}>
                      {column.renderCell 
                        ? column.renderCell(row[column.field], row)
                        : renderCellContent(column.field, row[column.field], row)}
                    </TableCell>
                  ))}
                  <TableCell padding="checkbox" />
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={onDeleteMultipleRows ? columns.length + 3 : (onEditRow ? columns.length + 3 : columns.length + 2)} align="center">
                  <Box py={3}>
                    <Typography variant="body1" color="textSecondary">
                      {emptyMessage}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirmation}
        onClose={cancelBulkDelete}
        aria-labelledby="bulk-delete-dialog-title"
        aria-describedby="bulk-delete-dialog-description"
      >
        <DialogTitle id="bulk-delete-dialog-title">
          Delete Selected Items
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="bulk-delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected item{selectedRows.length !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelBulkDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DataTable; 