/**
 * PDF Generation Service
 * Generates PDF reports for user check-in history
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF report for user's check-in history
 * @param {Object} user - User object with name, phone, role
 * @param {Array} records - Array of check-in records
 * @returns {Promise<string>} Path to generated PDF file
 */
async function generateHistoryPDF(user, records) {
  return new Promise((resolve, reject) => {
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `historico_${user.phone}_${timestamp}.pdf`;
      const filepath = path.join(tempDir, filename);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Pipe to file
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Relatório de Histórico de Ponto', {
        align: 'center'
      });

      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
        { align: 'center' }
      );

      doc.moveDown(1.5);

      // User information
      doc.fontSize(12).font('Helvetica-Bold').text('Informações do Funcionário:', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nome: ${user.name}`);
      doc.text(`Telefone: ${user.phone}`);
      doc.text(`Cargo: ${getRoleText(user.role)}`);

      if (user.expected_weekly_hours) {
        doc.text(`Horas Semanais Esperadas: ${user.expected_weekly_hours}h`);
      }

      doc.moveDown(1);

      // Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Resumo:', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total de registros: ${records.length}`);

      if (records.length > 0) {
        const firstDate = new Date(records[records.length - 1].timestamp).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo'
        });
        const lastDate = new Date(records[0].timestamp).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo'
        });
        doc.text(`Período: ${firstDate} a ${lastDate}`);

        // Count by type
        const counts = records.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {});

        doc.text(`Check-ins: ${counts.checkin || 0}`);
        doc.text(`Check-outs: ${counts.checkout || 0}`);
        doc.text(`Pausas: ${counts.break || 0}`);
        doc.text(`Retornos: ${counts.return || 0}`);
      }

      doc.moveDown(1.5);

      // Records table header
      doc.fontSize(12).font('Helvetica-Bold').text('Histórico Detalhado:', { underline: true });
      doc.moveDown(0.5);

      if (records.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').text('Nenhum registro encontrado.', {
          align: 'center'
        });
      } else {
        // Table headers
        const tableTop = doc.y;
        const colData = 60;
        const colHora = 140;
        const colTipo = 220;
        const colLocal = 320;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Data', colData, tableTop);
        doc.text('Hora', colHora, tableTop);
        doc.text('Tipo', colTipo, tableTop);
        doc.text('Local', colLocal, tableTop);

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        // Table rows
        doc.font('Helvetica').fontSize(8);

        records.forEach((record, index) => {
          const date = new Date(record.timestamp);
          const dateStr = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const timeStr = date.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
          });

          const typeText = getTypeText(record.type);
          const location = record.location || '-';

          const y = doc.y;

          // Check if we need a new page
          if (y > 700) {
            doc.addPage();
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Data', colData, 50);
            doc.text('Hora', colHora, 50);
            doc.text('Tipo', colTipo, 50);
            doc.text('Local', colLocal, 50);
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(8);
          }

          doc.text(dateStr, colData, doc.y);
          doc.text(timeStr, colHora, doc.y);
          doc.text(typeText, colTipo, doc.y);
          doc.text(location.substring(0, 30), colLocal, doc.y);

          doc.moveDown(0.4);

          // Draw line every 5 rows for readability
          if ((index + 1) % 5 === 0) {
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeOpacity(0.3).stroke().strokeOpacity(1);
            doc.moveDown(0.2);
          }
        });
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica').text(
          `Página ${i + 1} de ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF generated:', filepath);
        resolve(filepath);
      });

      stream.on('error', (err) => {
        console.error('❌ Error writing PDF:', err);
        reject(err);
      });

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      reject(error);
    }
  });
}

/**
 * Delete PDF file after sending
 * @param {string} filepath - Path to PDF file
 */
async function deletePDF(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('🗑️ PDF deleted:', filepath);
    }
  } catch (error) {
    console.error('❌ Error deleting PDF:', error);
  }
}

/**
 * Helper: Get role text in Portuguese
 */
function getRoleText(role) {
  const roleMap = {
    staff: 'Funcionário',
    manager: 'Gerente',
    supervisor: 'Supervisor'
  };
  return roleMap[role] || role;
}

/**
 * Helper: Get type text in Portuguese
 */
function getTypeText(type) {
  const typeMap = {
    checkin: 'Check-in',
    checkout: 'Check-out',
    break: 'Pausa',
    return: 'Retorno'
  };
  return typeMap[type] || type;
}

module.exports = {
  generateHistoryPDF,
  deletePDF
};
