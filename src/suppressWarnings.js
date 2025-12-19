// Suppress browser feature detection warnings from libraries like react-globe.gl
if (typeof window !== 'undefined') {
  const originalError = console.warn;
  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string') {
      const message = args[0];
      // Skip Permissions Policy warnings
      if (message.includes('Unrecognized feature') ||
          message.includes('ambient-light-sensor') ||
          message.includes('battery') ||
          message.includes('execution-while') ||
          message.includes('layout-animations') ||
          message.includes('navigation-override') ||
          message.includes('publickey-credentials') ||
          message.includes('speaker-selection') ||
          message.includes('Permissions Policy') ||
          message.includes('Feature-Policy')) {
        return; // Suppress warning
      }
    }
    originalError.apply(console, args);
  };
}

export default {};
