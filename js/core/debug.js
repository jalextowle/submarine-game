// Debug and error handling utilities

// Global error event handler
export function setupErrorHandler() {
    window.addEventListener('error', function(event) {
        console.error('Error occurred:', event.error);
        alert('Error occurred: ' + event.error.message);
    });
}

// Debug logging function
export function debug(message) {
    console.log('Debug:', message);
}

// Initialize error handling when module is loaded
setupErrorHandler(); 