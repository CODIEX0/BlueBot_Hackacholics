import React from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  React.useEffect(() => {
    window.frameworkReady?.();
  });
}
