import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Alert, CircularProgress, Chip
} from '@mui/material';
import {
  MultiFormatReader, BinaryBitmap, HybridBinarizer,
  RGBLuminanceSource, NotFoundException
} from '@zxing/library';
import { ScanLine } from 'lucide-react';

const SCANNER_GAP_MS = 50;  // max ms between hardware-scanner keystrokes
const MIN_BARCODE_LEN = 4;  // minimum chars to treat as a barcode
const SCAN_INTERVAL_MS = 250; // camera frame decode rate

const BarcodeScanner = ({ open, onScan, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const activeRef = useRef(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hwDetected, setHwDetected] = useState(false);

  // ── Hardware / USB / BT scanner support ───────────────────────────────────
  // HID scanners type characters at < 50 ms intervals then send Enter.
  // We listen in capture phase so we intercept before any focused input.
  useEffect(() => {
    if (!open) return;
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const barcode = buffer.trim();
        buffer = '';
        lastKeyTime = 0;
        if (barcode.length >= MIN_BARCODE_LEN) {
          e.preventDefault();
          e.stopPropagation();
          onScan(barcode);
          onClose();
        }
        return;
      }
      if (e.key.length !== 1) return;
      const now = Date.now();
      if (lastKeyTime && now - lastKeyTime > SCANNER_GAP_MS) buffer = '';
      buffer += e.key;
      lastKeyTime = now;
      if (buffer.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        if (!hwDetected) setHwDetected(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      setHwDetected(false);
    };
  }, [open, onScan, onClose]); // eslint-disable-line

  // ── Camera scanner ─────────────────────────────────────────────────────────
  // We bypass @zxing/browser entirely: call getUserMedia ourselves, draw frames
  // to an off-screen canvas, and decode with @zxing/library's MultiFormatReader.
  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    activeRef.current = true;

    const reader = new MultiFormatReader();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const stopAll = () => {
      activeRef.current = false;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const scanFrame = () => {
      const video = videoRef.current;
      if (!activeRef.current || !video || video.readyState < 2 || video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Convert RGBA → single-channel luminance array
        const len = width * height;
        const lum = new Uint8ClampedArray(len);
        for (let i = 0; i < len; i++) {
          // green-favouring weighted average (same formula zxing uses internally)
          lum[i] = (data[i * 4] * 2 + data[i * 4 + 1] * 4 + data[i * 4 + 2]) >> 3;
        }
        const source = new RGBLuminanceSource(lum, width, height);
        const bitmap = new BinaryBitmap(new HybridBinarizer(source));
        const result = reader.decode(bitmap);
        if (result && activeRef.current) {
          stopAll();
          onScan(result.getText());
          onClose();
        }
      } catch (e) {
        // NotFoundException is normal — no barcode in this frame
        if (!(e instanceof NotFoundException)) console.warn('Decode error:', e);
      }
    };

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(stream => {
        if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stopAll(); return; }
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(() => {}); // may already be playing via autoPlay
          setLoading(false);
          intervalRef.current = setInterval(scanFrame, SCAN_INTERVAL_MS);
        };
      })
      .catch(err => {
        if (!activeRef.current) return;
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : err.name === 'NotFoundError'
            ? 'No camera found. Use a USB/BT barcode scanner instead.'
            : `Camera error: ${err.message}`
        );
        setLoading(false);
      });

    return stopAll;
  }, [open]); // eslint-disable-line

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScanLine size={20} />
        Scan Barcode
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <Box sx={{
            position: 'relative', width: '100%', bgcolor: '#000',
            borderRadius: 2, overflow: 'hidden', minHeight: 260,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {loading && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 2,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 1.5,
              }}>
                <CircularProgress sx={{ color: 'white' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Starting camera…
                </Typography>
              </Box>
            )}
            {/* playsInline + muted required for iOS Safari inline video */}
            <video
              ref={videoRef}
              style={{ width: '100%', display: 'block' }}
              playsInline
              muted
              autoPlay
            />
            <Box sx={{
              position: 'absolute', top: '50%', left: '8%', right: '8%',
              height: 2, bgcolor: 'error.main', transform: 'translateY(-50%)',
              boxShadow: '0 0 12px rgba(255,50,50,0.9)', zIndex: 3,
            }} />
          </Box>
        )}

        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
          Point camera at barcode — scans automatically
        </Typography>

        <Box sx={{
          mt: 1.5, p: 1.5, borderRadius: 1.5,
          bgcolor: hwDetected ? 'success.50' : 'action.hover',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Chip
            label="USB / BT Scanner"
            size="small"
            color={hwDetected ? 'success' : 'default'}
            variant={hwDetected ? 'filled' : 'outlined'}
            sx={{ fontSize: '0.7rem' }}
          />
          <Typography variant="caption" color="text.secondary">
            {hwDetected
              ? 'Scanner input detected — scanning…'
              : 'Hardware scanner also supported — scan anytime'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
