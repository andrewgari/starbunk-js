// Simple health check to verify the process is running
// Exit with code 0 for healthy, 1 for unhealthy

try {
  // Check if the process is running
  console.log('Health check running...');
  
  // If we got this far, the process is at least running
  process.exit(0);
} catch (error) {
  console.error('Health check failed:', error);
  process.exit(1);
}