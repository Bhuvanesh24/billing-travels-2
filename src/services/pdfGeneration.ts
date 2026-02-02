import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// Constant VPA from user
const UPI_VPA = '1975thilak-1@okicici';
const MERCHANT_NAME = 'Gokilam Travels'; // Or 'Thilak Sambath' based on screenshot, but company name is safer

export interface InvoiceData {
  customerTitle: string;
  customerName: string;
  customerCompanyName: string;
  customerAddress: string;
  customerGstNo: string;
  driverName: string;
  vehicleNo: string;
  vehicleType: string;
  tripStartLocation: string;
  tripEndLocation: string;
  startKm: number;
  endKm: number;
  startTime: string;
  endTime: string;
  rentType: 'fixed' | 'hour' | 'day' | 'km';
  fixedAmount: number;
  hours: number;
  ratePerHour: number;
  days: number;
  ratePerDay: number;
  fuelLitres?: number;
  ratePerLitre?: number;
  totalKm: number;
  freeKm: number;
  chargeableKm: number;
  ratePerKm: number;
  chargePerKmFixed: number;
  chargePerKmHour: number;
  fuelChargePerKm: number;
  additionalCosts: { label: string; amount: number }[];
  enableDiscount: boolean;
  discountAmount: number;
  enableGst: boolean;
  gstPercentage: number;
  gstAmount: number;
  advance: number;
  grandTotal: number;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<{ blob: Blob; fileName: string }> => {
  const doc = new jsPDF();

  // Date/Time for Bill No
  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  // Add a random 3-digit suffix for extra uniqueness
  const randomSuffix = Math.floor(Math.random() * 900 + 100);
  const billNo = `INV-${dateStr}-${timeStr}-${randomSuffix}`;

  // Sanitize customer name for filename
  const cleanCustomerName = data.customerName ? data.customerName.replace(/[^a-z0-9]/gi, '_') : 'Customer';
  const fileName = `${billNo}_${cleanCustomerName}.pdf`;

  // --- Header ---
  // Company Name
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // Blue color scheme
  doc.text('Gokilam Travels', 105, 20, { align: 'center' });

  // Company Details
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('30, Gokhale Street, Ram Nagar,', 105, 28, { align: 'center' });
  doc.text('Coimbatore - 641009', 105, 33, { align: 'center' });
  doc.text('Email: gokilam1950@gmail.com', 105, 38, { align: 'center' });
  doc.text('Phone: 94436 82900, 82202 62205', 105, 43, { align: 'center' });

  // Divider Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(15, 48, 195, 48);

  // --- Invoice Info ---
  doc.setFontSize(10);
  doc.setTextColor(0);

  // Left Side: Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, 58);
  doc.setFont('helvetica', 'normal');

  let currentY = 64;
  const lineHeight = 5;



  const fullCustomerName = data.customerTitle ? `${data.customerTitle}. ${data.customerName}` : data.customerName;
  doc.text(`Customer Name: ${fullCustomerName || '-'}`, 15, currentY);
  currentY += lineHeight;

  if (data.customerCompanyName) {
    doc.text(`Company: ${data.customerCompanyName}`, 15, currentY);
    currentY += lineHeight;
  }

  if (data.customerAddress) {
    // Split address into lines if too long - extend to right column boundary
    const addressLines = doc.splitTextToSize(`Address: ${data.customerAddress}`, 115);
    doc.text(addressLines, 15, currentY);
    currentY += (lineHeight * addressLines.length);
  }

  if (data.customerGstNo) {
    doc.text(`GST No: ${data.customerGstNo}`, 15, currentY);
    currentY += lineHeight;
  }

  doc.text(`Vehicle No: ${data.vehicleNo || '-'}`, 15, currentY);
  currentY += lineHeight;
  doc.text(`Driver Name: ${data.driverName || '-'}`, 15, currentY);
  currentY += lineHeight;

  if (data.tripStartLocation) {
    doc.text(`From: ${data.tripStartLocation}`, 15, currentY);
    currentY += lineHeight;
  }

  if (data.tripEndLocation) {
    doc.text(`To: ${data.tripEndLocation}`, 15, currentY);
    currentY += lineHeight;
  }



  // Right Side: Invoice Details
  const rightColX = 130;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details:', rightColX, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill No: ${billNo}`, rightColX, 64);
  doc.text(`Date: ${now.toLocaleDateString()}`, rightColX, 70);
  doc.text(`Time: ${now.toLocaleTimeString()}`, rightColX, 76);

  // --- Trip Details Section ---
  // Adjust starting Y dynamically based on left column height if needed, but usually Trip Details is lower
  const tripDetailsY = Math.max(currentY + 5, 82);

  // Increased height to accommodate more trip details
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, tripDetailsY, 180, 35, 2, 2, 'F');

  const tripTextY = tripDetailsY + 6;
  const tripValueY = tripDetailsY + 12;
  const tripTextY2 = tripDetailsY + 20;
  const tripValueY2 = tripDetailsY + 26;

  doc.setFontSize(9);

  // First Row - Trip Times and Location
  doc.setFont('helvetica', 'normal');
  doc.text('Trip Start', 20, tripTextY);
  doc.setFont('helvetica', 'bold');
  const startTimeText = data.startTime ? new Date(data.startTime).toLocaleString() : '-';
  doc.text(startTimeText, 20, tripValueY);

  doc.setFont('helvetica', 'normal');
  doc.text('Trip End', 70, tripTextY);
  doc.setFont('helvetica', 'bold');
  const endTimeText = data.endTime ? new Date(data.endTime).toLocaleString() : '-';
  doc.text(endTimeText, 70, tripValueY);

  doc.setFont('helvetica', 'normal');
  doc.text('Vehicle Type', 120, tripTextY);
  doc.setFont('helvetica', 'bold');
  doc.text(data.vehicleType || '-', 120, tripValueY);

  doc.setFont('helvetica', 'normal');
  doc.text('KM Reading', 165, tripTextY);
  doc.setFontSize(7);
  doc.text(`Start: ${data.startKm} km`, 165, tripValueY);
  doc.text(`Closing: ${data.endKm} km`, 165, tripValueY + 4);
  doc.setFontSize(9);


  // Second Row - KM Details
  doc.setFont('helvetica', 'normal');
  doc.text('Total KM', 20, tripTextY2);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.totalKm} km`, 20, tripValueY2);

  if (data.freeKm > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Free KM', 70, tripTextY2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.freeKm} km`, 70, tripValueY2);

    doc.setFont('helvetica', 'normal');
    doc.text('Chargeable KM', 120, tripTextY2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.chargeableKm} km`, 120, tripValueY2);
  }


  // --- Items Table ---
  const tableBody = [];

  // 1. Rent Item
  let rentDescription = '';
  let rentAmount = 0;

  switch (data.rentType) {
    case 'fixed':
      // Fixed Amount + Chargeable KM * Charge per KM
      if (data.fixedAmount > 0) {
        tableBody.push(['Vehicle Rent (Fixed Amount)', data.fixedAmount.toFixed(2)]);
      }
      if (data.chargeableKm > 0 && data.chargePerKmFixed > 0) {
        const kmCharge = data.chargeableKm * data.chargePerKmFixed;
        tableBody.push([`KM Charges (${data.chargeableKm} km @ Rs${data.chargePerKmFixed}/km)`, kmCharge.toFixed(2)]);
      }
      rentAmount = 0; // Already added individual items
      break;
    case 'hour':
      // Hours * Rate per Hour + Chargeable KM * Charge per KM
      if (data.hours > 0 && data.ratePerHour > 0) {
        const hourCharge = data.hours * data.ratePerHour;
        tableBody.push([`Vehicle Rent (${data.hours} hrs @ Rs${data.ratePerHour}/hr)`, hourCharge.toFixed(2)]);
      }
      if (data.chargeableKm > 0 && data.chargePerKmHour > 0) {
        const kmCharge = data.chargeableKm * data.chargePerKmHour;
        tableBody.push([`KM Charges (${data.chargeableKm} km @ Rs${data.chargePerKmHour}/km)`, kmCharge.toFixed(2)]);
      }
      rentAmount = 0; // Already added individual items
      break;
    case 'day':
      // Days * Rate per Day + Chargeable KM * Fuel Charge per KM
      if (data.days > 0 && data.ratePerDay > 0) {
        const dayCharge = data.days * data.ratePerDay;
        tableBody.push([`Vehicle Rent (${data.days} days @ Rs${data.ratePerDay}/day)`, dayCharge.toFixed(2)]);
      }
      if (data.chargeableKm > 0 && data.fuelChargePerKm > 0) {
        const fuelCharge = data.chargeableKm * data.fuelChargePerKm;
        tableBody.push([`Fuel Charges (${data.chargeableKm} km @ Rs${data.fuelChargePerKm}/km)`, fuelCharge.toFixed(2)]);
      }
      rentAmount = 0; // Already added individual items
      break;
    case 'km':
      // Chargeable KM * Rate per KM
      {
        const billableKm = data.chargeableKm;
        if (data.freeKm > 0) {
          rentDescription = `Vehicle Rent (${data.totalKm} km - ${data.freeKm} free km = ${billableKm} km @ Rs${data.ratePerKm}/km)`;
        } else {
          rentDescription = `Vehicle Rent (${billableKm} km @ Rs${data.ratePerKm}/km)`;
        }
        rentAmount = billableKm * data.ratePerKm;
        break;
      }
  }

  if (rentAmount > 0) {
    tableBody.push([rentDescription, rentAmount.toFixed(2)]);
  }

  // 2. Additional Costs
  data.additionalCosts.forEach(cost => {
    tableBody.push([cost.label, cost.amount.toFixed(2)]);
  });

  autoTable(doc, {
    startY: tripDetailsY + 41,  // Adjusted for larger trip details box (35px height + 6px padding)
    head: [['Description', 'Amount (Rs)']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Description
      1: { cellWidth: 50, halign: 'right' } // Amount
    }
  });

  // --- Totals Section ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for totals
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  const totalsXLabel = 130;
  const totalsXValue = 190;

  // Subtotal calculation from table body to be safe, or just use what we have? 
  // Let's rely on the passed-in grand total logic mostly, but we can reconstruct subtotal for display.
  const subtotal = tableBody.reduce((sum, row) => sum + parseFloat(row[1] as string), 0);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsXLabel, finalY);
  doc.text(`Rs:${subtotal.toFixed(2)}`, totalsXValue, finalY, { align: 'right' });
  finalY += 7;

  if (data.enableDiscount) {
    doc.setTextColor(200, 0, 0); // Red
    doc.text('Discount:', totalsXLabel, finalY);
    doc.text(`-Rs:${data.discountAmount.toFixed(2)}`, totalsXValue, finalY, { align: 'right' });
    doc.setTextColor(0);
    finalY += 7;
  }

  if (data.enableGst) {
    doc.text(`GST (${data.gstPercentage}%):`, totalsXLabel, finalY);
    doc.text(`Rs:${data.gstAmount.toFixed(2)}`, totalsXValue, finalY, { align: 'right' });
    finalY += 7;
  }

  if (data.advance > 0) {
    doc.setTextColor(220, 140, 0); // Amber/Orange color
    doc.text('Advance:', totalsXLabel, finalY);
    doc.text(`-Rs:${data.advance.toFixed(2)}`, totalsXValue, finalY, { align: 'right' });
    doc.setTextColor(0);
    finalY += 7;
  }

  // Grand Total Line
  doc.setLineWidth(0.5);
  doc.line(totalsXLabel - 5, finalY - 4, 195, finalY - 4);

  const finalTotal = data.grandTotal - data.advance;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', totalsXLabel, finalY + 2);
  doc.text(`Rs:${finalTotal.toFixed(2)}`, totalsXValue, finalY + 2, { align: 'right' });


  // --- UPI QR Code Section ---
  // Position QR code at the bottom center, above the footer message
  const pageHeight = doc.internal.pageSize.height;
  const qrSize = 35;
  const qrX = (210 - qrSize) / 2; // Center horizontally (A4 width is 210mm)
  const qrY = pageHeight - 65; // Position above footer messages

  try {
    // Generate UPI URI
    // upi://pay?pa=...&pn=...&am=...&cu=INR
    // encodeURIComponent is safer
    const finalTotal = data.grandTotal - data.advance;
    const upiUri = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${finalTotal.toFixed(2)}&cu=INR`;

    // Generate QR Data URL
    const qrDataUrl = await QRCode.toDataURL(upiUri, { errorCorrectionLevel: 'H' });

    // Add QR Image
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Add "Scan to Pay" text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Open GPay/PhonePe and scan this QR code to pay', 105, qrY + qrSize + 5, { align: 'center' });

    // Make QR Clickable (Hyperlink)
    doc.link(qrX, qrY, qrSize, qrSize, { url: upiUri });

  } catch (err) {
    console.error('Error generating QR code:', err);
    // Fallback text if QR fails
    doc.setFontSize(8);
    doc.setTextColor(255, 0, 0);
    doc.text('Error generating QR Code', 105, qrY + 10, { align: 'center' });
  }


  // Footer Message
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Compute only, valid without signature.', 105, pageHeight - 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for travelling with us!', 105, pageHeight - 15, { align: 'center' });

  return { blob: doc.output('blob'), fileName };
};
