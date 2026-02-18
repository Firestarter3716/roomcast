"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

interface DisplayQRCodeProps {
  token: string;
  displayName: string;
  size?: number;
}

export function DisplayQRCode({ token, displayName, size = 200 }: DisplayQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const displayUrl = typeof window !== "undefined"
    ? `${window.location.origin}/display/${token}`
    : `/display/${token}`;

  useEffect(() => {
    QRCode.toDataURL(displayUrl, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl).catch(console.error);
  }, [displayUrl, size]);

  function downloadQR() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `roomcast-${displayName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    link.href = dataUrl;
    link.click();
  }

  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 animate-pulse"
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={dataUrl} alt={`QR code for ${displayName}`} width={size} height={size} className="rounded-lg border border-[var(--color-border)]" />
      <button
        onClick={downloadQR}
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <Download className="h-3 w-3" />
        Download QR
      </button>
    </div>
  );
}
