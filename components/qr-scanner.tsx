"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (result: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [active]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        startScanning();
      }
    } catch (err) {
      setCameraError(
        "Camera access denied. Please allow camera access to scan QR codes."
      );
    }
  }

  function stopCamera() {
    setScanning(false);
    if (scannerRef.current) {
      clearInterval(scannerRef.current);
      scannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startScanning() {
    // Use a canvas-based approach to decode QR from video frames
    // We'll dynamically import jsQR for lightweight scanning
    scannerRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Dynamic import of jsQR
      try {
        const { default: jsQR } = await import("jsqr");
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          onScan(code.data);
        }
      } catch {
        // jsQR not available, will keep retrying
      }
    }, 300);
  }

  if (cameraError) {
    return (
      <div className="rounded-2xl bg-muted/50 border border-border/50 p-8 flex flex-col items-center gap-4 text-center">
        <CameraOff className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          {cameraError}
        </p>
        <Button variant="outline" size="sm" onClick={startCamera}>
          Retry Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-foreground/5 border border-border/50">
      <video
        ref={videoRef}
        className="w-full aspect-square object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan overlay */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-primary/70 rounded-2xl relative">
            <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br-lg" />
          </div>
        </div>
      )}

      {!scanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="flex flex-col items-center gap-3">
            <Camera className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}
