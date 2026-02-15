"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QrScannerProps {
  onScan: (result: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize on mount/active change
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      cleanupScanner();
    };
  }, []);

  useEffect(() => {
    if (active && mounted) {
      startScanner();
    } else {
      cleanupScanner();
    }
  }, [active, mounted]);

  const cleanupScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch(console.error);
      } catch (e) {
        console.error("Failed to clear scanner", e);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(() => {
    if (!mounted) return;

    // Cleanup existing instance if any
    cleanupScanner();

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            showTorchButtonIfSupported: true,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            // Optional: Pause scanning after success? Usually caller handles state change.
            // cleanupScanner(); // Don't cleanup immediately, allow caller to decide
          },
          (errorMessage) => {
            // parse error, ignore
            // console.log(errorMessage);
          }
        );

        scannerRef.current = scanner;
        setCameraError(null);
      } catch (err) {
        console.error("Scanner initialization failed", err);
        setCameraError("Failed to start camera. Please ensure camera permissions are granted.");
      }
    }, 100);
  }, [cleanupScanner, onScan, mounted]);

  if (cameraError) {
    return (
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-8 flex flex-col items-center gap-4 text-center">
        <CameraOff className="w-10 h-10 text-destructive/50" />
        <p className="text-sm text-destructive font-medium">
          {cameraError}
        </p>
        <Button variant="outline" size="sm" onClick={() => { setCameraError(null); startScanner(); }}>
          Retry Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-border/50 bg-black/5 relative">
      <style jsx global>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__dashboard_section_csr span, 
        #qr-reader__dashboard_section_swaplink {
          display: none !important;
        }
        #qr-reader video {
          object-fit: cover;
          border-radius: 1rem;
        }
      `}</style>
      <div id="qr-reader" className="w-full" />

      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <Camera className="w-8 h-8 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground font-medium">Camera Inactive</p>
          </div>
        </div>
      )}
    </div>
  );
}
