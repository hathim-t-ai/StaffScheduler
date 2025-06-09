const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Patterns to identify arbitrary/test data
const SUSPICIOUS_PATTERNS = {
  staff: [
    // Names that look like test data or arbitrary entries
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID-like strings
    /^test/i,
    /^dummy/i,
    /^sample/i,
    /^\d+$/,  // Pure numbers
    /^[^a-zA-Z]*$/,  // No letters at all
    /^.{1,2}$/,  // Too short (1-2 characters)
    /^.{100,}$/,  // Too long (100+ characters)
  ],
  projects: [
    // Project names that look like test data
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID-like strings
    /^test/i,
    /^dummy/i,
    /^sample/i,
    /^project\s*\d*$/i,  // Generic "project" names
    /^\d+$/,  // Pure numbers
    /^[^a-zA-Z]*$/,  // No letters at all
    /^.{1,2}$/,  // Too short (1-2 characters)
    /^.{100,}$/,  // Too long (100+ characters)
  ]
};

// Specific entries mentioned by the user
const SPECIFIC_ARBITRARY_ENTRIES = {
  staff: [
    'Bilal Nair',
    'Eman Tanaka', 
    'Salem Rao'
  ],
  projects: [
    'Merrin',
    'Vanguard'
  ]
};

async function identifyArbitraryData() {
  console.log('🔍 Identifying arbitrary data entries...\n');
  
  const results = {
    staff: [],
    projects: []
  };

  // Check staff table
  try {
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*');
    
    if (staffError) throw staffError;

    staffData.forEach(staff => {
      let isArbitrary = false;
      let reasons = [];

      // Check against specific entries
      if (SPECIFIC_ARBITRARY_ENTRIES.staff.includes(staff.name)) {
        isArbitrary = true;
        reasons.push('Specific arbitrary entry mentioned by user');
      }

      // Check against suspicious patterns
      SUSPICIOUS_PATTERNS.staff.forEach((pattern, index) => {
        if (pattern.test(staff.name)) {
          isArbitrary = true;
          reasons.push(`Matches suspicious pattern ${index + 1}`);
        }
      });

      // Check for incomplete data (missing essential fields)
      if (!staff.department && !staff.grade && !staff.city && !staff.country) {
        isArbitrary = true;
        reasons.push('Missing essential fields (department, grade, city, country)');
      }

      // Check for obviously invalid email formats
      if (staff.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff.email)) {
        isArbitrary = true;
        reasons.push('Invalid email format');
      }

      if (isArbitrary) {
        results.staff.push({
          id: staff.id,
          name: staff.name,
          data: staff,
          reasons
        });
      }
    });

    console.log(`📊 Found ${results.staff.length} suspicious staff entries:`);
    results.staff.forEach(entry => {
      console.log(`  - ${entry.name} (${entry.id}): ${entry.reasons.join(', ')}`);
    });
    console.log();

  } catch (error) {
    console.error('Error checking staff data:', error);
  }

  // Check projects table
  try {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectError) throw projectError;

    projectData.forEach(project => {
      let isArbitrary = false;
      let reasons = [];

      // Check against specific entries
      if (SPECIFIC_ARBITRARY_ENTRIES.projects.includes(project.name)) {
        isArbitrary = true;
        reasons.push('Specific arbitrary entry mentioned by user');
      }

      // Check against suspicious patterns
      SUSPICIOUS_PATTERNS.projects.forEach((pattern, index) => {
        if (pattern.test(project.name)) {
          isArbitrary = true;
          reasons.push(`Matches suspicious pattern ${index + 1}`);
        }
      });

      // Check for incomplete data (missing essential fields for projects mentioned by user)
      if (SPECIFIC_ARBITRARY_ENTRIES.projects.includes(project.name) && 
          (!project.partner_name && !project.team_lead && !project.budget)) {
        isArbitrary = true;
        reasons.push('Missing essential project fields (partner, team lead, budget)');
      }

      if (isArbitrary) {
        results.projects.push({
          id: project.id,
          name: project.name,
          data: project,
          reasons
        });
      }
    });

    console.log(`📊 Found ${results.projects.length} suspicious project entries:`);
    results.projects.forEach(entry => {
      console.log(`  - ${entry.name} (${entry.id}): ${entry.reasons.join(', ')}`);
    });
    console.log();

  } catch (error) {
    console.error('Error checking project data:', error);
  }

  return results;
}

async function cleanupArbitraryData(dryRun = true) {
  console.log(dryRun ? '🧪 DRY RUN MODE - No data will be deleted' : '🗑️  CLEANUP MODE - Data will be deleted');
  console.log('=' .repeat(50));
  
  const arbitraryData = await identifyArbitraryData();
  
  if (arbitraryData.staff.length === 0 && arbitraryData.projects.length === 0) {
    console.log('✅ No arbitrary data found!');
    return;
  }

  console.log(`\n📋 Summary:`);
  console.log(`  - Staff entries to delete: ${arbitraryData.staff.length}`);
  console.log(`  - Project entries to delete: ${arbitraryData.projects.length}`);

  if (dryRun) {
    console.log('\n⚠️  This is a dry run. To actually delete the data, run with --execute flag');
    return;
  }

  // Confirm deletion
  console.log('\n⚠️  WARNING: This will permanently delete the identified entries!');
  
  // Delete staff entries
  if (arbitraryData.staff.length > 0) {
    console.log('\n🗑️  Deleting staff entries...');
    for (const entry of arbitraryData.staff) {
      try {
        // First delete any assignments for this staff member
        const { error: assignmentError } = await supabase
          .from('assignments')
          .delete()
          .eq('staff_id', entry.id);
        
        if (assignmentError) {
          console.error(`  ❌ Error deleting assignments for ${entry.name}:`, assignmentError);
          continue;
        }

        // Then delete the staff member
        const { error: staffError } = await supabase
          .from('staff')
          .delete()
          .eq('id', entry.id);
        
        if (staffError) {
          console.error(`  ❌ Error deleting staff ${entry.name}:`, staffError);
        } else {
          console.log(`  ✅ Deleted staff: ${entry.name}`);
        }
      } catch (error) {
        console.error(`  ❌ Unexpected error deleting ${entry.name}:`, error);
      }
    }
  }

  // Delete project entries
  if (arbitraryData.projects.length > 0) {
    console.log('\n🗑️  Deleting project entries...');
    for (const entry of arbitraryData.projects) {
      try {
        // First delete any assignments for this project
        const { error: assignmentError } = await supabase
          .from('assignments')
          .delete()
          .eq('project_id', entry.id);
        
        if (assignmentError) {
          console.error(`  ❌ Error deleting assignments for ${entry.name}:`, assignmentError);
          continue;
        }

        // Then delete the project
        const { error: projectError } = await supabase
          .from('projects')
          .delete()
          .eq('id', entry.id);
        
        if (projectError) {
          console.error(`  ❌ Error deleting project ${entry.name}:`, projectError);
        } else {
          console.log(`  ✅ Deleted project: ${entry.name}`);
        }
      } catch (error) {
        console.error(`  ❌ Unexpected error deleting ${entry.name}:`, error);
      }
    }
  }

  console.log('\n✅ Cleanup completed!');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  
  try {
    await cleanupArbitraryData(!execute);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { identifyArbitraryData, cleanupArbitraryData }; 