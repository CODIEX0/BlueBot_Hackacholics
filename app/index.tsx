import { useRouter } from 'expo-router';
import React from 'react';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Wait for router to be fully mounted
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (isReady) {
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.warn('Navigation error:', error);
      }
    }
  }, [isReady, router]);

  return null;
}