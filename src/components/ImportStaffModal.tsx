import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Alert,
  LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from 'xlsx';
import { StaffMember } from '../store/slices/staffSlice';
import { v4 as uuidv4 } from 'uuid';

interface ImportStaffModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (staffMembers: StaffMember[]) => void;
  customFields: string[];
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

const ImportStaffModal: React.FC<ImportStaffModalProps> = ({ open, onClose, onImport, customFields }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Record<string, any>[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Select File', 'Map Columns', 'Preview & Import'];

  const requiredFields = ['name', 'grade', 'department', 'city', 'country'];
  const defaultFields = [...requiredFields, 'skills'];
  const availableTargetFields = [...defaultFields, ...customFields];

  // Handler for file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

        if (json.length === 0) {
          setError('The file contains no data');
          setFile(null);
          setLoading(false);
          return;
        }

        setFileData(json);
        
        // Extract column headers
        if (json[0] && typeof json[0] === 'object' && json[0] !== null) {
          const headers = Object.keys(json[0]);
          setColumnHeaders(headers);

          // Create initial column mappings based on similar names
          const initialMappings: ColumnMapping[] = headers.map(header => {
            const normalizedHeader = header.toLowerCase().trim();
            
            // Try to find a matching field
            const matchedField = availableTargetFields.find(field => 
              normalizedHeader === field.toLowerCase() || 
              normalizedHeader.includes(field.toLowerCase())
            );
            
            return {
              sourceColumn: header,
              targetField: matchedField || ''
            };
          });

          setColumnMappings(initialMappings);
        } else {
          setError('The file data is not in the expected format');
          setFile(null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Failed to process the file. Please make sure it is a valid Excel or CSV file.');
        setFile(null);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setFile(null);
      setLoading(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Handler for column mapping changes
  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prevMappings => 
      prevMappings.map(mapping => 
        mapping.sourceColumn === sourceColumn 
          ? { ...mapping, targetField } 
          : mapping
      )
    );
  };

  // Generate preview data based on mappings
  const generatePreview = () => {
    setError(null);
    
    // Check if all required fields are mapped
    const mappedFields = columnMappings
      .filter(mapping => mapping.targetField)
      .map(mapping => mapping.targetField);
    
    const missingRequiredFields = requiredFields.filter(
      field => !mappedFields.includes(field)
    );
    
    if (missingRequiredFields.length > 0) {
      setError(`Missing required mappings: ${missingRequiredFields.join(', ')}`);
      return false;
    }
    
    try {
      // Transform data based on mappings
      const transformed = fileData.map((row) => {
        const staffMember: Partial<StaffMember> = {
          id: uuidv4(),
        };
        
        // Process each mapping
        columnMappings.forEach(mapping => {
          if (!mapping.targetField) return; // Skip unmapped columns
          
          const value = row[mapping.sourceColumn];
          
          if (mapping.targetField === 'skills') {
            // Handle skills as array (comma-separated values)
            staffMember.skills = value 
              ? String(value || '').split(',').map(s => s.trim()).filter(Boolean)
              : [];
          } else {
            // Handle other fields as strings, ensuring they're not null/undefined
            staffMember[mapping.targetField] = value !== undefined && value !== null ? String(value) : '';
          }
        });
        
        return staffMember as StaffMember;
      });
      
      setPreviewData(transformed);
      return true;
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Failed to generate preview data');
      return false;
    }
  };

  // Navigate steps
  const handleNext = () => {
    if (activeStep === 1) {
      // When moving from mapping to preview, generate preview
      if (generatePreview()) {
        setActiveStep(prevStep => prevStep + 1);
      }
    } else {
      setActiveStep(prevStep => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleImport = () => {
    onImport(previewData);
    handleClose();
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setFileData([]);
    setColumnHeaders([]);
    setColumnMappings([]);
    setPreviewData([]);
    setError(null);
    onClose();
  };

  // Detect potential duplicates
  const getDuplicateCount = () => {
    const nameSet = new Set<string>();
    const duplicates: string[] = [];
    
    previewData.forEach(staff => {
      // Safely access properties and handle possible null/undefined values
      const name = (staff.name || '').toLowerCase();
      const grade = (staff.grade || '').toLowerCase();
      const city = (staff.city || '').toLowerCase();
      const country = (staff.country || '').toLowerCase();
      
      const key = `${name}-${grade}-${city}-${country}`;
      if (nameSet.has(key)) {
        duplicates.push(staff.name);
      } else {
        nameSet.add(key);
      }
    });
    
    return duplicates.length;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle>Import Staff Data</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, pt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: File Upload */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <Paper
              elevation={3}
              sx={{ 
                p: 5, 
                cursor: 'pointer',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Click to upload Excel or CSV file
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: .xlsx, .xls, .csv
              </Typography>
              {file && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Paper>
          </Box>
        )}

        {/* Step 2: Column Mapping */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Map Columns
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Map the columns from your file to the corresponding fields in the system.
              Fields marked with * are required.
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {columnMappings.map((mapping, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <FormControl fullWidth>
                    <InputLabel>Map "{mapping.sourceColumn}" to:</InputLabel>
                    <Select
                      value={mapping.targetField}
                      onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                      label={`Map "${mapping.sourceColumn}" to:`}
                    >
                      <MenuItem value="">Not Mapped</MenuItem>
                      {availableTargetFields.map(field => (
                        <MenuItem 
                          key={field} 
                          value={field}
                          disabled={
                            // Disable options that are already selected in other mappings
                            // except for the current mapping
                            columnMappings.some(
                              m => m.targetField === field && 
                                   m.sourceColumn !== mapping.sourceColumn
                            ) &&
                            // Only apply this restriction to required fields
                            // to prevent mapping multiple source columns to the same target
                            requiredFields.includes(field)
                          }
                        >
                          {field} {requiredFields.includes(field) ? '*' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 3: Preview & Import */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Preview Data
            </Typography>
            
            {getDuplicateCount() > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Detected {getDuplicateCount()} potential duplicates based on name, grade, and location.
                These will be imported as separate records.
              </Alert>
            )}
            
            <Paper variant="outlined" sx={{ overflow: 'auto', maxHeight: '40vh' }}>
              <Box sx={{ minWidth: 700 }}>
                <Box 
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    bgcolor: 'grey.100',
                    px: 2,
                    py: 1,
                    display: 'flex'
                  }}
                >
                  {availableTargetFields.map(field => 
                    columnMappings.some(mapping => mapping.targetField === field) && (
                      <Typography 
                        key={field}
                        variant="subtitle2" 
                        sx={{ 
                          flex: 1, 
                          minWidth: 100, 
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {field}
                      </Typography>
                    )
                  )}
                </Box>
                
                {previewData.slice(0, 5).map((row, rowIndex) => (
                  <Box 
                    key={rowIndex}
                    sx={{ 
                      px: 2, 
                      py: 1,
                      display: 'flex',
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    {availableTargetFields.map(field => 
                      columnMappings.some(mapping => mapping.targetField === field) && (
                        <Typography 
                          key={field}
                          variant="body2" 
                          sx={{ 
                            flex: 1, 
                            minWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {field === 'skills' 
                            ? (row[field] || []).join(', ')
                            : row[field] || ''}
                        </Typography>
                      )
                    )}
                  </Box>
                ))}
                
                {previewData.length > 5 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Showing 5 of {previewData.length} records
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Total records to import: {previewData.length}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button 
            onClick={handleNext} 
            variant="contained" 
            color="primary"
            disabled={activeStep === 0 && !file}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleImport} 
            variant="contained" 
            color="primary"
          >
            Import Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportStaffModal; 