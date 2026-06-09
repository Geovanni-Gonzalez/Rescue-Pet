import { Button } from './ui/button';
import { QrCode, Download } from 'lucide-react';

interface QRDisplayProps {
  qrCodeUrl: string;
  petName: string;
}

export function QRDisplay({ qrCodeUrl, petName }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-rescue-900">
        <QrCode className="w-5 h-5" />
        <h4 className="font-semibold text-lg">Código QR de {petName}</h4>
      </div>
      
      <div className="p-4 bg-card border-2 border-dashed border-border rounded-lg mb-6">
        <img src={qrCodeUrl} alt={`QR Code para ${petName}`} className="w-48 h-48 object-contain" />
      </div>

      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2"
        onClick={() => {
          const a = document.createElement('a');
          a.href = qrCodeUrl;
          a.download = `QR_${petName.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }}
      >
        <Download className="w-4 h-4" />
        Descargar QR
      </Button>
    </div>
  );
}
