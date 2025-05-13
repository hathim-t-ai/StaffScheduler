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

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition[];
  onAddColumn: () => void;
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
  emptyMessage = 'No data available'
}: DataTableProps<T>) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell 
                  key={column.field}
                  style={{ 
                    minWidth: column.width, 
                    width: column.width,
                    flex: column.flex
                  }}
                >
                  {column.headerName}
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
              data.map((row, index) => (
                <TableRow hover key={index}>
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
                <TableCell colSpan={columns.length + 1} align="center">
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