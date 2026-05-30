import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface ContractData {
  applicationId: string;
  animalName: string;
  animalSpecies: string;
  adopterName: string;
  adopterEmail: string;
  generatedAt: Date;
}

interface SignedContractData extends ContractData {
  signatureDataUrl: string; // base64 PNG from canvas
  signedAt: Date;
}

const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');

export function buildContractUrl(filename: string): string {
  const base = process.env.BACKEND_URL || 'http://localhost:3000';
  return `${base}/uploads/contracts/${filename}`;
}

export async function generateContractPdf(data: ContractData): Promise<string> {
  if (!fs.existsSync(CONTRACTS_DIR)) fs.mkdirSync(CONTRACTS_DIR, { recursive: true });

  const filename = `adoption-${data.applicationId}.pdf`;
  const filePath = path.join(CONTRACTS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('CONTRATO DE ADOPCIÓN', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Rescue Pet — Plataforma de Gestión de Animales Rescatados', { align: 'center' })
      .fillColor('#111827')
      .moveDown(1.5);

    // Divider
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1);

    // Contract details
    doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL CONTRATO').moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    const rows: [string, string][] = [
      ['Número de solicitud', data.applicationId],
      ['Fecha de emisión', data.generatedAt.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Animal adoptado', `${data.animalName} (${data.animalSpecies})`],
      ['Adoptante', data.adopterName],
      ['Correo del adoptante', data.adopterEmail],
    ];

    for (const [label, value] of rows) {
      doc.font('Helvetica-Bold').text(`${label}:  `, { continued: true }).font('Helvetica').text(value);
    }

    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1);

    // Clauses
    doc.fontSize(12).font('Helvetica-Bold').text('CLÁUSULAS').moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#374151');

    const clauses = [
      'El adoptante declara haber leído y aceptado íntegramente el reglamento de adopción de Rescue Pet.',
      'El adoptante se compromete a proporcionar al animal alimento, agua, atención veterinaria y un ambiente seguro y afectuoso.',
      'El animal adoptado no podrá ser cedido, vendido, ni transferido a terceros sin autorización previa del refugio.',
      'Rescue Pet se reserva el derecho de realizar visitas de seguimiento para verificar el bienestar del animal.',
      'En caso de incumplimiento, el refugio podrá recuperar al animal sin necesidad de procedimiento judicial.',
      'El adoptante acepta que cualquier disputa será resuelta según las leyes vigentes de la República de Costa Rica.',
    ];

    clauses.forEach((clause, i) => {
      doc.text(`${i + 1}. ${clause}`, { paragraphGap: 6 });
    });

    doc.moveDown(2);
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1.5);

    // Signature area
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('FIRMA DEL ADOPTANTE').moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Pendiente de firma digital por el adoptante.')
      .fillColor('#111827');

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#6b7280').text(`Documento generado el ${data.generatedAt.toISOString()} — Rescue Pet`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

export async function generateSignedContractPdf(data: SignedContractData): Promise<string> {
  if (!fs.existsSync(CONTRACTS_DIR)) fs.mkdirSync(CONTRACTS_DIR, { recursive: true });

  const filename = `adoption-${data.applicationId}-signed.pdf`;
  const filePath = path.join(CONTRACTS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('CONTRATO DE ADOPCIÓN — FIRMADO', { align: 'center' }).moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Rescue Pet — Plataforma de Gestión de Animales Rescatados', { align: 'center' }).fillColor('#111827').moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL CONTRATO').moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    const rows: [string, string][] = [
      ['Número de solicitud', data.applicationId],
      ['Fecha de emisión', data.generatedAt.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Fecha de firma', data.signedAt.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Animal adoptado', `${data.animalName} (${data.animalSpecies})`],
      ['Adoptante', data.adopterName],
      ['Correo del adoptante', data.adopterEmail],
    ];

    for (const [label, value] of rows) {
      doc.font('Helvetica-Bold').text(`${label}:  `, { continued: true }).font('Helvetica').text(value);
    }

    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('CLÁUSULAS').moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#374151');

    const clauses = [
      'El adoptante declara haber leído y aceptado íntegramente el reglamento de adopción de Rescue Pet.',
      'El adoptante se compromete a proporcionar al animal alimento, agua, atención veterinaria y un ambiente seguro y afectuoso.',
      'El animal adoptado no podrá ser cedido, vendido, ni transferido a terceros sin autorización previa del refugio.',
      'Rescue Pet se reserva el derecho de realizar visitas de seguimiento para verificar el bienestar del animal.',
      'En caso de incumplimiento, el refugio podrá recuperar al animal sin necesidad de procedimiento judicial.',
      'El adoptante acepta que cualquier disputa será resuelta según las leyes vigentes de la República de Costa Rica.',
    ];

    clauses.forEach((clause, i) => {
      doc.text(`${i + 1}. ${clause}`, { paragraphGap: 6 });
    });

    doc.moveDown(2);
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke().moveDown(1);

    // Embed signature image from base64 data URL
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('FIRMA DEL ADOPTANTE').moveDown(0.5);

    try {
      const base64 = data.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const sigBuffer = Buffer.from(base64, 'base64');
      doc.image(sigBuffer, { width: 250, height: 80 });
    } catch {
      doc.fontSize(10).font('Helvetica').fillColor('#ef4444').text('[Error al incrustar firma]');
    }

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#374151')
      .text(`Firmado digitalmente por ${data.adopterName}`)
      .text(`Fecha y hora: ${data.signedAt.toLocaleString('es-CR')}`);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#6b7280').text(`Documento generado el ${data.generatedAt.toISOString()} — Rescue Pet`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}
