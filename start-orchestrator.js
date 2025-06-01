// Load .env variables so child processes inherit Supabase credentials
require('dotenv').config();
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Directory containing the Python orchestrator
const orchestratorDir = path.join(__dirname, 'orchestrator-service');

// Detect Python command dynamically
let pythonCmdName = os.platform() === 'win32' ? 'python' : 'python3';

// Check if Python virtual environment exists
const venvPath = path.join(orchestratorDir, '.venv');
const venvPythonPath = os.platform() === 'win32' 
  ? path.join(venvPath, 'Scripts', 'python.exe')
  : path.join(venvPath, 'bin', 'python');

// Determine activation command based on OS
const activateCmd = os.platform() === 'win32' 
  ? `${path.join(venvPath, 'Scripts', 'activate.bat')}`
  : `source ${path.join(venvPath, 'bin', 'activate')}`;

console.log('Starting Python orchestrator service...');

// Proceed with venv creation or start orchestrator once Python is confirmed
function proceedWithSetup() {
  console.log(`Using Python command: ${pythonCmdName}`);
  if (!fs.existsSync(venvPath)) {
    console.log('Creating Python virtual environment...');
    const createVenvCmd = `cd "${orchestratorDir}" && ${pythonCmdName} -m venv .venv`;
    exec(createVenvCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Failed to create virtual environment:', error.message);
        console.error('Try creating it manually with:');
        console.error(`cd "${orchestratorDir}" && ${pythonCmdName} -m venv .venv`);
        process.exit(1);
      }
      installDependencies();
    });
  } else {
    console.log('✅ Python virtual environment found');
    startOrchestrator();
  }
}

// Check if Python is installed, try python3 then fall back to python
exec(`${pythonCmdName} --version`, (error, stdout, stderr) => {
  if (error) {
    if (pythonCmdName === 'python3') {
      console.warn('python3 not found, trying python');
      pythonCmdName = 'python';
      exec('python --version', (error2, stdout2, stderr2) => {
        if (error2) {
          console.error('❌ Python not found. Please install Python 3.8 or later.');
          process.exit(1);
        } else {
          console.log(`✅ ${stdout2.trim()}`);
          proceedWithSetup();
        }
      });
    } else {
      console.error('❌ Python not found. Please install Python 3.8 or later.');
      process.exit(1);
    }
  } else {
    console.log(`✅ ${stdout.trim()}`);
    proceedWithSetup();
  }
});

function installDependencies() {
  console.log('Installing Python dependencies...');
  
  const installCmd = os.platform() === 'win32'
    ? `cd "${orchestratorDir}" && .venv\\Scripts\\pip install -r requirements.txt`
    : `cd "${orchestratorDir}" && .venv/bin/pip install -r requirements.txt`;
    
  exec(installCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to install dependencies:', error.message);
      console.error('Try installing them manually with:');
      console.error(`cd "${orchestratorDir}" && ${activateCmd} && pip install -r requirements.txt`);
      process.exit(1);
    }
    
    console.log('✅ Dependencies installed successfully');
    startOrchestrator();
  });
}

function startOrchestrator() {
  console.log('Starting orchestrator service...');
  
  const pythonCmd = os.platform() === 'win32'
    ? `"${venvPythonPath}"`
    : venvPythonPath;
    
  const appPath = path.join(orchestratorDir, 'app.py');
  
  const orchestrator = spawn(pythonCmd, [appPath], {
    cwd: orchestratorDir,
    stdio: 'pipe',
    env: { ...process.env, USE_CREW: '1' }
  });
  
  orchestrator.stdout.on('data', (data) => {
    console.log(`[Orchestrator] ${data.toString().trim()}`);
  });
  
  orchestrator.stderr.on('data', (data) => {
    console.error(`[Orchestrator Error] ${data.toString().trim()}`);
  });
  
  orchestrator.on('error', (error) => {
    console.error('❌ Failed to start orchestrator service:', error.message);
  });
  
  orchestrator.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Orchestrator process exited with code ${code}`);
    }
  });
  
  // Handle Node.js process termination
  process.on('SIGINT', () => {
    console.log('Stopping orchestrator service...');
    orchestrator.kill();
    process.exit();
  });
  
  process.on('SIGTERM', () => {
    console.log('Stopping orchestrator service...');
    orchestrator.kill();
    process.exit();
  });
} 