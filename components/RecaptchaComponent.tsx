/**
 * reCAPTCHA Component - Google reCAPTCHA verification for enhanced security
 */

import React from 'react';
const { useState, useRef } = React;
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import Recaptcha from 'react-native-recaptcha-that-works';

interface RecaptchaComponentProps {
  onVerify: (token: string) => void;
  onError?: (error: any) => void;
  siteKey?: string;
  baseUrl?: string;
}

const RecaptchaComponent: React.FC<RecaptchaComponentProps> = ({
  onVerify,
  onError,
  siteKey = 'YOUR_RECAPTCHA_SITE_KEY', // Replace with your actual site key
  baseUrl = 'https://yourapp.com', // Replace with your actual domain
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<any>(null);

  const handleVerify = (token: string) => {
    setIsLoading(false);
    if (token) {
      onVerify(token);
    } else {
      onError?.(new Error('reCAPTCHA verification failed'));
    }
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    console.error('reCAPTCHA error:', error);
    onError?.(error);
    Alert.alert(
      'Verification Error',
      'Failed to load reCAPTCHA. Please check your internet connection and try again.'
    );
  };

  const handleLoad = () => {
    setIsLoading(true);
  };

  const openRecaptcha = () => {
    recaptchaRef.current?.open();
  };

  const closeRecaptcha = () => {
    recaptchaRef.current?.close();
  };

  return (
    <View style={styles.container}>
      <Recaptcha
        ref={recaptchaRef}
        siteKey={siteKey}
        baseUrl={baseUrl}
        onVerify={handleVerify}
        onError={handleError}
        onLoad={handleLoad}
        size="normal"
        theme="light"
        style={styles.recaptcha}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  recaptcha: {
    width: Dimensions.get('window').width - 40,
    height: 80,
  },
});

export default RecaptchaComponent;
export { RecaptchaComponent };
