import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Alert, CircularProgress
} from '@mui/material';
import { BrowserMultiFormatReader } from '@zxing/browser';

const BarcodeScanner = ({ open, onScan, onClose }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);

    let stopped = false;
    const codeReader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        const controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              controls.stop();
              onScan(result.getText());
              onClose();
            }
            // 'NotFoundException' just means no barcode in frame yet — ignore
            if (err && err.name !== 'NotFoundException') {
              console.warn('Scan error:', err);
            }
          }
        );
        controlsRef.current = controls;
        setLoading(false);
      } catch (err) {
        setError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Camera not available. Please check your device.'
        );
        setLoading(false);
      }
    };

    start();

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Scan Barcode</DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{
            position: 'relative', width: '100%', bgcolor: '#000',
            borderRadius: 1, overflow: 'hidden', minHeight: 260,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {loading && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <CircularProgress sx={{ color: 'white' }} />
              </Box>
            )}
            <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
            {/* Scan guide line */}
            <Box sx={{
              position: 'absolute', top: '50%', left: '8%', right: '8%',
              height: 2, bgcolor: 'error.main', transform: 'translateY(-50%)',
              boxShadow: '0 0 12px rgba(255,50,50,0.9)', zIndex: 3
            }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
          Point the camera at a barcode — it scans automatically
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
