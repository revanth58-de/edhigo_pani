const PDFDocument = require('pdfkit');

/**
 * Generates a beautifully styled, professional PDF Earnings & Work Certificate
 * for a worker and writes it directly to the response stream.
 *
 * @param {res} stream - The Express response object (or any writable stream)
 * @param {object} worker - User model representing the worker
 * @param {object} earningsData - Earnings aggregation data from earnings.controller.js
 */
const generateEarningsPdf = (stream, worker, earningsData) => {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    info: {
      Title: `Earnings Certificate - ${worker.name || 'Worker'}`,
      Author: 'Dinasari Platform',
      Subject: 'Official Earnings Summary and Work Verification',
    },
  });

  doc.pipe(stream);

  // Colors based on branding
  const primaryColor = '#16A34A'; // Brand Green
  const textColor = '#1F2937';    // Dark Slate
  const lightBg = '#F3F4F6';      // Gray 100
  const borderLight = '#E5E7EB';  // Gray 200

  // ─── Header Section ───
  // Accent brand line
  doc.rect(0, 0, 595.28, 15).fill(primaryColor);

  // Logo / Brand Name
  doc.fillColor(primaryColor)
     .fontSize(24)
     .font('Helvetica-Bold')
     .text('🌾 DINASARI', 50, 45);

  doc.fillColor('#6B7280')
     .fontSize(10)
     .font('Helvetica')
     .text('DINASARI MARKETPLACE', 50, 72);

  // Document Title (Right-aligned)
  doc.fillColor(textColor)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('EARNINGS & WORK CERTIFICATE', 250, 45, { align: 'right', width: 295 });

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  doc.fillColor('#9CA3AF')
     .fontSize(9)
     .font('Helvetica')
     .text(`Generated: ${dateStr}`, 250, 65, { align: 'right', width: 295 });

  // Divider Line
  doc.moveTo(50, 95)
     .lineTo(545, 95)
     .strokeColor(borderLight)
     .lineWidth(1)
     .stroke();

  // ─── Worker Details ───
  doc.fillColor(textColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('WORKER DETAILS', 50, 115);

  doc.fontSize(10).font('Helvetica');
  const detailsY = 135;
  
  // Left Column
  doc.fillColor('#4B5563').text('Name:', 50, detailsY);
  doc.fillColor(textColor).font('Helvetica-Bold').text(worker.name || 'N/A', 110, detailsY);
  
  doc.fillColor('#4B5563').font('Helvetica').text('Phone:', 50, detailsY + 20);
  doc.fillColor(textColor).font('Helvetica-Bold').text(worker.phone || 'N/A', 110, detailsY + 20);

  // Right Column
  doc.fillColor('#4B5563').font('Helvetica').text('Village:', 300, detailsY);
  doc.fillColor(textColor).font('Helvetica-Bold').text(worker.village || 'N/A', 360, detailsY);
  
  doc.fillColor('#4B5563').font('Helvetica').text('Status:', 300, detailsY + 20);
  doc.fillColor(primaryColor).font('Helvetica-Bold').text('Verified Account', 360, detailsY + 20);

  // ─── Financial Summary Cards ───
  const summary = earningsData.summary || {};
  const cardWidth = 150;
  const cardHeight = 70;
  const cardsY = 190;

  // Helper function to draw a summary card
  const drawCard = (x, label, value, color) => {
    // Card background
    doc.roundedRect(x, cardsY, cardWidth, cardHeight, 8)
       .fillColor(lightBg)
       .fill();
    // Accent left border
    doc.rect(x, cardsY, 4, cardHeight)
       .fillColor(color)
       .fill();
    // Labels
    doc.fillColor('#6B7280')
       .fontSize(9)
       .font('Helvetica')
       .text(label.toUpperCase(), x + 15, cardsY + 15);
    doc.fillColor(textColor)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text(value, x + 15, cardsY + 32);
  };

  const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  drawCard(50, 'Total Net Earnings', formatINR(summary.totalEarned), primaryColor);
  drawCard(222, 'Jobs Completed', String(summary.totalJobs || 0), '#3B82F6');
  drawCard(395, 'Average Per Job', formatINR(summary.avgPerJob), '#F59E0B');

  // ─── Recent Payments Table ───
  doc.fillColor(textColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('RECENT COMPLETED TRANSACTIONS (LAST 10)', 50, 290);

  // Table Headers
  const tableY = 315;
  doc.rect(50, tableY, 495, 20).fillColor(lightBg).fill();
  doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold');
  
  doc.text('Date', 60, tableY + 6);
  doc.text('Job / Work Type', 140, tableY + 6);
  doc.text('Farmer', 280, tableY + 6);
  doc.text('Method', 380, tableY + 6);
  doc.text('Amount', 470, tableY + 6, { width: 65, align: 'right' });

  // Rows
  const payments = earningsData.recentPayments || [];
  let currentY = tableY + 20;

  doc.fontSize(9).font('Helvetica');
  
  if (payments.length === 0) {
    doc.fillColor('#9CA3AF')
       .text('No completed transactions found.', 50, currentY + 15, { align: 'center', width: 495 });
  } else {
    payments.slice(0, 10).forEach((p, idx) => {
      // Alternate row backgrounds
      if (idx % 2 === 1) {
        doc.rect(50, currentY, 495, 22).fillColor('#F9FAFB').fill();
      }
      doc.fillColor(textColor);
      
      const pDate = new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

      doc.text(pDate, 60, currentY + 6);
      doc.text(p.workType || 'General Work', 140, currentY + 6);
      doc.text(p.farmerName || 'Farmer', 280, currentY + 6);
      doc.text(p.method?.toUpperCase() || 'UPI', 380, currentY + 6);
      
      const amtStr = '₹' + Number(p.workerAmount || p.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      doc.font('Helvetica-Bold')
         .text(amtStr, 470, currentY + 6, { width: 65, align: 'right' })
         .font('Helvetica');

      currentY += 22;
    });
  }

  // ─── Verification footer badge ───
  const badgeY = 560;
  doc.roundedRect(50, badgeY, 495, 45, 6)
     .strokeColor(primaryColor)
     .lineWidth(1)
     .stroke();

  doc.fillColor(primaryColor)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('✓ OFFICIAL PLATFORM VERIFICATION', 65, badgeY + 10);

  doc.fillColor('#6B7280')
     .fontSize(8)
     .font('Helvetica')
     .text('This document certifies valid automated records securely logged on the Dinasari platform.', 65, badgeY + 24);

  // Footer notes
  doc.fillColor('#9CA3AF')
     .fontSize(8)
     .text('If you have questions about this certificate, please contact support in the app.', 50, 750, { align: 'center', width: 495 });

  doc.end();
};

module.exports = {
  generateEarningsPdf,
};
