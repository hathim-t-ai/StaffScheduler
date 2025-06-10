import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Box,
  Collapse,
  Chip,
} from '@mui/material';
import {
  Remove as RemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material';

export interface PivotColumn {
  key: string;
  title: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  format?: (value: any) => string;
  useColorChip?: boolean; // For chargeability percentage color coding
}

export interface PivotNode {
  id: string;
  name: string;
  level: number;
  data: Record<string, any>;
  children?: PivotNode[];
  isLeaf?: boolean;
}

interface HierarchicalPivotTableProps {
  title: string;
  data: PivotNode[];
  columns: PivotColumn[];
  height?: number;
  levelIndentPixels?: number;
}

const HierarchicalPivotTable: React.FC<HierarchicalPivotTableProps> = ({
  title,
  data,
  columns,
  height = 400,
  levelIndentPixels = 20,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const flattenNodes = (nodes: PivotNode[]): PivotNode[] => {
    const result: PivotNode[] = [];

    const processNode = (node: PivotNode) => {
      result.push(node);
      
      if (node.children && expandedNodes.has(node.id)) {
        node.children.forEach(processNode);
      }
    };

    nodes.forEach(processNode);
    return result;
  };

  const flattenedData = useMemo(() => flattenNodes(data), [data, expandedNodes]);

  const renderExpandIcon = (node: PivotNode) => {
    if (!node.children || node.children.length === 0) {
      return <Box sx={{ width: 24 }} />; // Spacer for alignment
    }

    const isExpanded = expandedNodes.has(node.id);
    return (
      <IconButton
        size="small"
        onClick={() => toggleNode(node.id)}
        sx={{ p: 0.5 }}
      >
        {isExpanded ? (
          <RemoveIcon fontSize="small" />
        ) : (
          <AddIcon fontSize="small" />
        )}
      </IconButton>
    );
  };

  const getRowStyle = (node: PivotNode) => {
    const baseStyle = {
      backgroundColor: 'inherit', // Changed to always use white background
      fontWeight: node.level < 2 ? 600 : 400,
    };
    
    return baseStyle;
  };

  const getChargeabilityColor = (percentage: number): string => {
    return percentage >= 80
      ? '#4CAF50'  // Green for >= 80%
      : percentage >= 60
        ? '#FF9800'  // Orange for 60-79%
        : '#F44336'; // Red for < 60%
  };

  const formatCellValue = (column: PivotColumn, value: any) => {
    if (column.useColorChip && typeof value === 'number') {
      return (
        <Chip
          label={`${value.toFixed(1)}%`}
          size="small"
          sx={{
            backgroundColor: getChargeabilityColor(value),
            color: 'white',
            fontWeight: 600,
          }}
        />
      );
    }
    
    if (column.format) {
      return column.format(value);
    }
    
    if (typeof value === 'number') {
      if (column.key.toLowerCase().includes('percentage') || column.key.toLowerCase().includes('%')) {
        return `${value.toFixed(1)}%`;
      }
      if (column.key.toLowerCase().includes('budget') || column.key.toLowerCase().includes('cost')) {
        return `${value.toLocaleString()} AED`;
      }
      return value.toLocaleString();
    }
    
    return value || '-';
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#ffffff', height }} elevation={1}>
      <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ height: height - 80, overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: 'white', fontWeight: 'bold', minWidth: 200 }}>
                Category
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'right'}
                  sx={{ 
                    backgroundColor: 'white', 
                    fontWeight: 'bold',
                    width: column.width,
                    minWidth: column.width || 120,
                  }}
                >
                  {column.title}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {flattenedData.length > 0 ? (
              flattenedData.map((node) => (
                <TableRow key={node.id} sx={getRowStyle(node)}>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        ml: node.level * (levelIndentPixels / 8), // Convert to theme units
                      }}
                    >
                      {renderExpandIcon(node)}
                      <Typography
                        variant={node.level < 2 ? 'body2' : 'body2'}
                        sx={{
                          ml: 1,
                          fontWeight: node.level < 2 ? 600 : 400,
                        }}
                      >
                        {node.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'right'}
                    >
                      {formatCellValue(column, node.data[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default HierarchicalPivotTable; 