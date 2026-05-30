import qrcode from 'qrcode';

export async function generatePetQrDataUrl(petId: string) {
  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const profileUrl = `${frontendBaseUrl}/pets/${petId}`;

  return qrcode.toDataURL(profileUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: { dark: '#14532d', light: '#ffffff' },
  });
}
