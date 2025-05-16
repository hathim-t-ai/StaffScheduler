import React from 'react';
import {
  Table as MuiTable,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Checkbox,
} from '@mui/material';

export interface TableProps {
  dataSource: any[];
  columns: Array<{
    title: React.ReactNode;
    dataIndex?: string;
    key?: string;
    renderCell?: (value: any, row: any) => React.ReactNode;
    renderHeader?: () => React.ReactNode;
  }>;
  rowSelection?: {
    selectedKeys: any[];
    onChange: (selectedKeys: any[]) => void;
  };
  showIndex?: boolean;
  rowKey?: string;
}

const Table: React.FC<TableProps> = ({ dataSource, columns, rowSelection, showIndex, rowKey = 'id' }) => {
  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'common.white', borderRadius: 2, boxShadow: 1, mb: 2 }}>
      <MuiTable sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            {rowSelection && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={rowSelection.selectedKeys.length > 0 && rowSelection.selectedKeys.length < dataSource.length}
                  checked={dataSource.length > 0 && rowSelection.selectedKeys.length === dataSource.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      rowSelection.onChange(dataSource.map(row => row[rowKey]));
                    } else {
                      rowSelection.onChange([]);
                    }
                  }}
                />
              </TableCell>
            )}
            {showIndex && <TableCell>#</TableCell>}
            {columns.map((col) => (
              <TableCell key={col.key?.toString() ?? String(col.title)} sx={{ fontWeight: 'bold' }}>
                {col.renderHeader ? col.renderHeader() : col.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSource.map((row, rowIndex) => (
            <TableRow
              key={row[rowKey] ?? rowIndex}
              hover
              selected={rowSelection ? rowSelection.selectedKeys.includes(row[rowKey]) : false}
            >
              {rowSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={rowSelection.selectedKeys.includes(row[rowKey])}
                    onChange={(e) => {
                      const key = row[rowKey];
                      const newSelected = e.target.checked
                        ? [...rowSelection.selectedKeys, key]
                        : rowSelection.selectedKeys.filter(k => k !== key);
                      rowSelection.onChange(newSelected);
                    }}
                  />
                </TableCell>
              )}
              {showIndex && <TableCell>{rowIndex + 1}</TableCell>}
              {columns.map((col, colIndex) => {
                const dataKey = col.dataIndex ?? col.key ?? '';
                const value = row[dataKey];
                let content: React.ReactNode;
                if (col.renderCell) {
                  content = col.renderCell(value, row);
                } else if (Array.isArray(value)) {
                  content = value.join(', ');
                } else {
                  content = value;
                }
                return (
                  <TableCell key={col.key ?? colIndex}>
                    {content}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
};

export default Table; 