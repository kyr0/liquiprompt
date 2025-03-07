import spawn from 'spawn-please'

if (!process.argv[2] || !process.argv[2].trim()) {
  console.error("Script name is required.");
  process.exit(0);
}

// Get the script name and any arguments
const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3);

// Execute the script with arguments if provided
const args = [`./examples/${scriptName}.ts`, ...scriptArgs];
const { stdout, stderr } = await spawn('tsx', args);

if (stdout) {
  console.log(stdout);
}

if (stderr) {
  console.error(stderr);
}