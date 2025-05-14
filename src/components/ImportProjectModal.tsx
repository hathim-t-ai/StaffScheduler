import React, { useState, useRef, useCallback } from 'react';
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
import { Project } from '../store/slices/projectSlice';
import { v4 as uuidv4 } from 'uuid';

/**
 * Props for the ImportProjectModal component
 * @interface ImportProjectModalProps
 * @property {boolean} open - Controls visibility of the dialog
 * @property {() => void} onClose - Callback function when the dialog is closed
 * @property {(projects: Project[]) => void} onImport - Callback function when projects are imported
 * @property {string[]} customFields - Array of custom field names to include in the mapping
 */
interface ImportProjectModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (projects: Project[]) => void;
  customFields: string[];
}

/**
 * Represents a mapping between a source column in the import file and a target field in the Project model
 * @interface ColumnMapping
 * @property {string} sourceColumn - The column name from the import file
 * @property {string} targetField - The corresponding field name in the Project model
 */
interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

/**
 * ImportProjectModal Component
 * 
 * A multi-step modal dialog for importing projects from Excel/CSV files.
 * Handles file upload, column mapping, data preview, and import confirmation.
 * Includes validation and error handling.
 */
const ImportProjectModal: React.FC<ImportProjectModalProps> = ({ open, onClose, onImport, customFields }) => {
  // State for multi-step wizard
  const [activeStep, setActiveStep] = useState(0);
  
  // File and data state
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Record<string, any>[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<Project[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps for the stepper component
  const steps = ['Select File', 'Map Columns', 'Preview & Import'];

  // Fields required for a valid project
  const requiredFields = ['name', 'partnerName', 'teamLead', 'budget'];
  const defaultFields = [...requiredFields];
  // All available fields including custom fields
  const availableTargetFields = [...defaultFields, ...customFields];

  /**
   * Handles file selection and parses the file data
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log("File loaded successfully");
        const data = e.target?.result;
        let workbook;
        
        // Process based on file type
        if (selectedFile.name.toLowerCase().endsWith('.csv')) {
          // Handle CSV files - data should be text
          console.log("Processing CSV data");
          const csvData = data as string;
          workbook = XLSX.read(csvData, { type: 'string' });
        } else {
          // Handle Excel files
          console.log("Processing Excel data");
          try {
            // Try array buffer first (modern browsers)
            workbook = XLSX.read(data, { type: 'array' });
          } catch (error) {
            console.error("Array buffer parsing failed, trying binary", error);
            // Fallback for older browsers
            let binary = "";
            const bytes = new Uint8Array(data as ArrayBuffer);
            const length = bytes.byteLength;
            for (let i = 0; i < length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            workbook = XLSX.read(binary, { type: 'binary' });
          }
        }
        
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
            const matchedField = availableTargetFields.find(field => {
              // Handle special cases for matching
              if (field === 'partnerName' && (normalizedHeader === 'partner' || normalizedHeader.includes('partner'))) {
                return true;
              }
              if (field === 'teamLead' && (normalizedHeader === 'lead' || normalizedHeader.includes('lead') || normalizedHeader.includes('team'))) {
                return true;
              }
              
              return normalizedHeader === field.toLowerCase() || normalizedHeader.includes(field.toLowerCase());
            });
            
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

    // Use readAsArrayBuffer for better browser compatibility
    if (selectedFile.name.toLowerCase().endsWith('.csv')) {
      // For CSV files, use text reading
      reader.readAsText(selectedFile);
    } else {
      // For Excel files, use array buffer
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  /**
   * Updates the column mapping when a user changes a field mapping
   * @param {string} sourceColumn - The source column name from the import file
   * @param {string} targetField - The target field to map to
   */
  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prevMappings => 
      prevMappings.map(mapping => 
        mapping.sourceColumn === sourceColumn 
          ? { ...mapping, targetField } 
          : mapping
      )
    );
  };

  /**
   * Generates preview data based on column mappings
   * Validates that all required fields are mapped
   * @returns {boolean} True if preview generation succeeds, false otherwise
   */
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
        const project: Partial<Project> = {
          id: uuidv4(),
        };
        
        // Process each mapping
        columnMappings.forEach(mapping => {
          if (!mapping.targetField) return; // Skip unmapped columns
          
          const value = row[mapping.sourceColumn];
          
          if (mapping.targetField === 'budget') {
            // Enhanced budget parsing - handles various formats including currency symbols
            let numericValue = 0;
            if (value !== undefined && value !== null) {
              // If it's already a number, use it directly
              if (typeof value === 'number') {
                numericValue = value;
              } else {
                // Otherwise convert to string and clean it for parsing
                const stringValue = String(value);
                // Remove currency symbols, commas, and other non-numeric characters except decimal point
                const cleanedValue = stringValue.replace(/[^0-9.-]/g, '');
                numericValue = parseFloat(cleanedValue) || 0;
              }
            }
            // Ensure budget is a valid positive number
            project.budget = Math.max(0, numericValue);
            console.log(`Parsed budget value: ${value} -> ${project.budget}`);
          } else {
            // Handle other fields as strings
            project[mapping.targetField] = value !== undefined && value !== null ? String(value) : '';
          }
        });
        
        return project as Project;
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
    
    previewData.forEach(project => {
      // Safely access properties and handle possible null/undefined values
      const name = (project.name || '').toLowerCase();
      const partnerName = (project.partnerName || '').toLowerCase();
      
      const key = `${name}-${partnerName}`;
      if (nameSet.has(key)) {
        duplicates.push(project.name);
      } else {
        nameSet.add(key);
      }
    });
    
    return duplicates.length;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle>Import Project Data</DialogTitle>
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
              id="project-file-upload"
            />
            
            <Paper 
              elevation={3}
              sx={{ 
                p: 5, 
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
              onClick={handleBrowseClick}
            >
              <CloudUploadIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload Excel or CSV file
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Supported formats: .xlsx, .xls, .csv
              </Typography>
              
              {file ? (
                <Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Selected file: <b>{file.name}</b>
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the Paper click handler from triggering
                      handleBrowseClick();
                    }}
                  >
                    Change File
                  </Button>
                </Box>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary"
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation(); // This is redundant but added for clarity
                    handleBrowseClick();
                  }}
                >
                  Select File
                </Button>
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
                    <InputLabel>Map &quot;{mapping.sourceColumn}&quot; to:</InputLabel>
                    <Select
                      value={mapping.targetField}
                      onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                      label={`Map &quot;${mapping.sourceColumn}&quot; to:`}
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
                Detected {getDuplicateCount()} potential duplicates based on project name and partner.
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
                          {field === 'budget' 
                            ? formatCurrency(Number(row[field] || 0))
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

export default ImportProjectModal; 