import { spawn } from 'child_process'

if (!process.argv[2] || !process.argv[2].trim()) {
  console.error("Script name is required.");
  process.exit(0);
}

// Get the script name and any arguments
const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3);

// Execute the script with arguments if provided
const args = [`./examples/${scriptName}.ts`, ...scriptArgs];

// Use Node.js built-in spawn with stdio inheritance for real-time streaming
const childProcess = spawn('tsx', args, { 
  stdio: 'inherit' // This makes stdout and stderr stream directly to the parent process
});

// Handle exit
childProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Example script exited with code ${code}`);
    process.exit(code);
  }
});

// Handle errors
childProcess.on('error', (err) => {
  console.error('Failed to start example script:', err);
  process.exit(1);
});