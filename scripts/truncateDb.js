#!/usr/bin/env node
require('dotenv').config();
const supabase = require('../supabaseClient');

(async function truncate() {
  try {
    console.log('Deleting all assignments...');
    let { error } = await supabase.from('assignments').delete().not('id', 'is', null);
    if (error) throw error;
    console.log('Assignments deleted.');

    console.log('Deleting all staff...');
    ({ error } = await supabase.from('staff').delete().not('id', 'is', null));
    if (error) throw error;
    console.log('Staff deleted.');

    console.log('Deleting all projects...');
    ({ error } = await supabase.from('projects').delete().not('id', 'is', null));
    if (error) throw error;
    console.log('Projects deleted.');

    console.log('Database truncate complete.');
  } catch (err) {
    console.error('Error truncating database:', err.message);
    process.exit(1);
  }
})(); 