import React from 'react';
import ReceiptScanner from '@/components/ReceiptScanner';
import { useRouter } from 'expo-router';

import ReceiptScanner from '@/components/ReceiptScanner';
import { useRouter } from 'expo-router';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  const [open, setOpen] = React.useState(true);
  return (
    <ReceiptScanner
      visible={open}
      onClose={() => { setOpen(false); router.back(); }}
      onReceiptProcessed={() => {}}
    />
  );
}
