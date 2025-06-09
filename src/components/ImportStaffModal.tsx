import React, { useState, useRef, useCallback } from 'react';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

import { StaffMember } from '../store/slices/staffSlice';


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
        // console.log("File loaded successfully");
        const data = e.target?.result;
        let workbook;
        
        // Process based on file type
        if (selectedFile.name.toLowerCase().endsWith('.csv')) {
          // Handle CSV files - data should be text
          // console.log("Processing CSV data");
          const csvData = data as string;
          workbook = XLSX.read(csvData, { type: 'string' });
        } else {
          // Handle Excel files
          // console.log("Processing Excel data");
          try {
            // Try array buffer first (modern browsers)
            workbook = XLSX.read(data, { type: 'array' });
          } catch (error) {
            // console.error("Array buffer parsing failed, trying binary", error);
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

        // Log the imported data for debugging
        // console.log('Imported Excel/CSV data:', json);
        
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
          // console.log('Initial column mappings:', initialMappings);
        } else {
          setError('The file data is not in the expected format');
          setFile(null);
        }
        
        setLoading(false);
      } catch (err) {
        // console.error('Error processing file:', err);
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
          // console.log(`Mapping ${mapping.sourceColumn} -> ${mapping.targetField}:`, value);
          
          if (mapping.targetField === 'skills') {
            // Handle skills as array (comma-separated values)
            let skillsArray: string[] = [];
            
            // Special handling for Excel skills data
            if (value !== undefined && value !== null) {
              // Convert the value to a string first to handle all types
              const stringValue = String(value).trim();
              
              // If value is empty, use empty array
              if (!stringValue) {
                skillsArray = [];
              }
              // If it contains commas, split by commas
              else if (stringValue.includes(',')) {
                skillsArray = stringValue.split(',')
                  .map(skill => skill.trim())
                  .filter(Boolean); // Remove empty entries
              }
              // Otherwise use as a single skill
              else {
                skillsArray = [stringValue];
              }
            }
            
            // console.log('Processed skills array:', skillsArray);
            staffMember.skills = skillsArray;
          } else {
            // Handle other fields as strings, ensuring they're not null/undefined
            staffMember[mapping.targetField] = value !== undefined && value !== null ? String(value) : '';
          }
        });
        
        return staffMember as StaffMember;
      });
      
      // console.log('Generated preview data:', transformed);
      setPreviewData(transformed);
      return true;
    } catch (err) {
      // console.error('Error generating preview:', err);
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
    // Ensure skills are always arrays before import
    const normalizedData = previewData.map(staff => ({
      ...staff,
      skills: Array.isArray(staff.skills) 
        ? staff.skills.map(skill => String(skill).trim()).filter(Boolean)
        : (typeof staff.skills === 'string'
            ? (staff.skills as string).split(',').map((s: string) => s.trim()).filter(Boolean) 
            : [])
    }));
    
    onImport(normalizedData);
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

  // Detect potential duplicates by name, grade, and department
  const getDuplicateCount = () => {
    const nameSet = new Set<string>();
    let count = 0;
    
    previewData.forEach(staff => {
      const name = (staff.name || '').toLowerCase();
      const grade = (staff.grade || '').toLowerCase();
      const department = (staff.department || '').toLowerCase();
      const key = `${name}-${grade}-${department}`;
      if (nameSet.has(key)) {
        count++;
      } else {
        nameSet.add(key);
      }
    });
    
    return count;
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
      PaperProps={{ sx: { minHeight: '60vh', bgcolor: 'common.white', color: 'background.default' } }}
    >
      <DialogTitle sx={{ color: 'background.default' }}>Import Staff Data</DialogTitle>
      <DialogContent sx={{ color: 'background.default' }}>
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
              id="staff-file-upload"
            />
            
            <Paper
              elevation={3}
              sx={{
                p: 5,
                bgcolor: 'common.white',
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
                <Grid item xs={12} sm={6} key={`mapping-${index}`}>
                  <FormControl fullWidth>
                    <InputLabel>Map &quot;{mapping.sourceColumn}&quot; to:</InputLabel>
                    <Select
                      value={mapping.targetField}
                      onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                      MenuProps={{ PaperProps: { sx: { bgcolor: 'common.white' } } }}
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
                Detected {getDuplicateCount()} potential duplicate staff entr{getDuplicateCount() > 1 ? 'ies' : 'y'} based on name, grade, and department.
                These will be ignored and existing records preserved.
              </Alert>
            )}
            
            <Paper 
              variant="outlined" 
              sx={{ bgcolor: 'common.white', overflow: 'auto', maxHeight: '40vh' }}
            >
              <Box sx={{ minWidth: 700 }}>
                <Box 
                  sx={{ 
                    borderBottom: 1, borderColor: 'divider', bgcolor: 'common.white', px: 2, py: 1, display: 'flex'
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
                    key={`preview-row-${rowIndex}`}
                    sx={{ 
                      px: 2, 
                      py: 1,
                      display: 'flex',
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    {availableTargetFields.map((field, fieldIndex) => 
                      columnMappings.some(mapping => mapping.targetField === field) && (
                        <Typography 
                          key={`${field}-${rowIndex}-${fieldIndex}`}
                          variant="body2" 
                          sx={{ 
                            flex: 1, 
                            minWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {field === 'skills' 
                            ? (Array.isArray(row[field]) && row[field].length > 0
                                ? row[field].join(', ')
                                : '')
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
      <DialogActions sx={{ color: 'background.default' }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} color="inherit">Back</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button 
            onClick={handleNext} 
            variant="contained" 
            color="primary"
            disabled={activeStep === 0 && !file}
          >
            {activeStep === steps.length - 1 ? 'Import' : 'Next'}
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