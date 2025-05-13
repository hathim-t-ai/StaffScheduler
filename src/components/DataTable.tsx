import React from 'react';
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
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition[];
  onAddColumn: () => void;
  onDeleteColumn?: (field: string) => void;
  onDeleteRow?: (id: string) => void;
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
  customFields = [],
  emptyMessage = 'No data available'
}: DataTableProps<T>) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            {onDeleteRow && (
              <TableCell padding="checkbox" align="center" sx={{ width: 50 }}>
                <Typography variant="body2" fontWeight="bold">
                  Delete
                </Typography>
              </TableCell>
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
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <TableRow hover key={index}>
                  {onDeleteRow && (
                    <TableCell padding="checkbox">
                      <Tooltip title={`Delete ${row.name || 'this record'}`}>
                        <IconButton
                          onClick={() => onDeleteRow(row.id)}
                          size="small"
                          color="error"
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: 'rgba(211, 47, 47, 0.04)' 
                            } 
                          }}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell key={`${index}-${column.field}`}>
                      {column.renderCell 
                        ? column.renderCell(row[column.field], row)
                        : row[column.field] !== undefined 
                          ? (Array.isArray(row[column.field]) 
                            ? row[column.field].join(', ') 
                            : String(row[column.field]))
                          : ''}
                    </TableCell>
                  ))}
                  <TableCell padding="checkbox"></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={onDeleteRow ? columns.length + 2 : columns.length + 1} align="center">
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
    </Paper>
  );
};

export default DataTable; 