import React from 'react';
import { useRouter } from 'expo-router';

export default function ProfileDeepLink() {
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
			const id = setTimeout(() => {
				try { 
					router.replace('/(tabs)/profile'); 
				} catch (error) {
					console.warn('Navigation error:', error);
				}
			}, 0);
			return () => clearTimeout(id);
		}
	}, [isReady, router]);

	return null;
}
