import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Readable } from 'stream';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  terms?: string;
  termsConditions?: string;
  company: {
    name: string;
    email?: string;
    phone?: string;
    address?: any;
    logo?: string;
    taxId?: string;
  };
  branch: {
    name: string;
    address?: any;
    phone?: string;
    email?: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: any;
  };
  appointment?: {
    date: Date;
    startTime: Date;
    endTime: Date;
    title?: string;
    staff?: {
      name: string;
    };
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    total: number;
  }[];
  payments: {
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    reference?: string;
    status: string;
  }[];
}

interface PDFOptions {
  template?: 'standard' | 'modern' | 'minimal';
  language?: 'en' | 'ar';
  includePaymentQR?: boolean;
  watermark?: string;
  showPayments?: boolean;
}

export class PDFService {
  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceData: InvoiceData, options: PDFOptions = {}): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          template = 'standard',
          language = 'en',
          includePaymentQR = false,
          watermark,
          showPayments = true
        } = options;

        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoiceData.invoiceNumber}`,
            Author: invoiceData.company.name,
            Subject: `Invoice for ${invoiceData.client.firstName} ${invoiceData.client.lastName}`,
            Keywords: 'invoice, billing',
            CreationDate: new Date(),
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark if specified
        if (watermark) {
          this.addWatermark(doc, watermark);
        }

        // Generate PDF based on template
        switch (template) {
          case 'modern':
            await this.generateModernTemplate(doc, invoiceData, options);
            break;
          case 'minimal':
            await this.generateMinimalTemplate(doc, invoiceData, options);
            break;
          default:
            await this.generateStandardTemplate(doc, invoiceData, options);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate standard invoice template
   */
  private async generateStandardTemplate(doc: PDFKit.PDFDocument, invoice: InvoiceData, options: PDFOptions) {
    let yPosition = 50;
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Header with company info and logo
    yPosition = await this.addHeader(doc, invoice, yPosition);
    
    // Invoice details
    yPosition = this.addInvoiceDetails(doc, invoice, yPosition);
    
    // Client information
    yPosition = this.addClientInfo(doc, invoice, yPosition);
    
    // Items table
    yPosition = this.addItemsTable(doc, invoice, yPosition);
    
    // Totals
    yPosition = this.addTotals(doc, invoice, yPosition);
    
    // Payment information
    if (options.showPayments && invoice.payments.length > 0) {
      yPosition = this.addPaymentInfo(doc, invoice, yPosition);
    }
    
    // Notes and terms
    yPosition = this.addNotesAndTerms(doc, invoice, yPosition);
    
    // Payment QR code
    if (options.includePaymentQR) {
      await this.addPaymentQR(doc, invoice, yPosition);
    }
    
    // Footer
    this.addFooter(doc, invoice);
  }

  /**
   * Generate modern invoice template
   */
  private async generateModernTemplate(doc: PDFKit.PDFDocument, invoice: InvoiceData, options: PDFOptions) {
    let yPosition = 30;
    
    // Modern header with gradient background
    doc.rect(0, 0, doc.page.width, 120).fill('#4F46E5');
    
    // Company logo and info in header
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold');
    doc.text(invoice.company.name, 50, 40);
    
    doc.fontSize(12).font('Helvetica');
    if (invoice.company.email) {
      doc.text(invoice.company.email, 50, 70);
    }
    if (invoice.company.phone) {
      doc.text(invoice.company.phone, 50, 85);
    }

    // Invoice number in header
    doc.fontSize(18).font('Helvetica-Bold');
    doc.text(`INVOICE #${invoice.invoiceNumber}`, doc.page.width - 200, 40, { width: 150, align: 'right' });
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`Date: ${this.formatDate(invoice.invoiceDate)}`, doc.page.width - 200, 65, { width: 150, align: 'right' });
    doc.text(`Due: ${this.formatDate(invoice.dueDate)}`, doc.page.width - 200, 80, { width: 150, align: 'right' });

    yPosition = 140;
    doc.fillColor('black');

    // Client info with modern styling
    yPosition = this.addModernClientInfo(doc, invoice, yPosition);
    
    // Modern items table
    yPosition = this.addModernItemsTable(doc, invoice, yPosition);
    
    // Modern totals
    yPosition = this.addModernTotals(doc, invoice, yPosition);
    
    if (options.showPayments && invoice.payments.length > 0) {
      yPosition = this.addPaymentInfo(doc, invoice, yPosition);
    }
    
    yPosition = this.addNotesAndTerms(doc, invoice, yPosition);
    
    if (options.includePaymentQR) {
      await this.addPaymentQR(doc, invoice, yPosition);
    }
    
    this.addModernFooter(doc, invoice);
  }

  /**
   * Generate minimal invoice template
   */
  private async generateMinimalTemplate(doc: PDFKit.PDFDocument, invoice: InvoiceData, options: PDFOptions) {
    let yPosition = 50;
    
    // Minimal header
    doc.fontSize(28).font('Helvetica-Light');
    doc.text('INVOICE', 50, yPosition);
    
    doc.fontSize(14).font('Helvetica');
    doc.text(`#${invoice.invoiceNumber}`, 50, yPosition + 35);
    
    yPosition += 80;
    
    // Minimal invoice and client details
    yPosition = this.addMinimalDetails(doc, invoice, yPosition);
    
    // Clean items table
    yPosition = this.addMinimalItemsTable(doc, invoice, yPosition);
    
    // Simple totals
    yPosition = this.addMinimalTotals(doc, invoice, yPosition);
    
    if (options.includePaymentQR) {
      await this.addPaymentQR(doc, invoice, yPosition);
    }
  }

  /**
   * Add header with company logo and information
   */
  private async addHeader(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): Promise<number> {
    const margin = 50;
    const pageWidth = doc.page.width;

    // Company logo (if available)
    if (invoice.company.logo) {
      try {
        // In a real implementation, you'd fetch and display the logo
        // doc.image(invoice.company.logo, margin, yPosition, { width: 100 });
      } catch (error) {
        console.log('Could not load company logo');
      }
    }

    // Company information
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text(invoice.company.name, margin + 120, yPosition);
    
    doc.fontSize(10).font('Helvetica');
    yPosition += 25;
    
    if (invoice.company.email) {
      doc.text(invoice.company.email, margin + 120, yPosition);
      yPosition += 12;
    }
    
    if (invoice.company.phone) {
      doc.text(invoice.company.phone, margin + 120, yPosition);
      yPosition += 12;
    }
    
    if (invoice.company.address) {
      const address = this.formatAddress(invoice.company.address);
      doc.text(address, margin + 120, yPosition, { width: 200 });
      yPosition += 12 * address.split('\n').length;
    }

    // Invoice title
    doc.fontSize(28).font('Helvetica-Bold');
    doc.text('INVOICE', pageWidth - 200, 50, { width: 150, align: 'right' });

    return Math.max(yPosition + 30, 120);
  }

  /**
   * Add invoice details section
   */
  private addInvoiceDetails(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;

    // Invoice details box
    doc.rect(margin, yPosition, pageWidth - (margin * 2), 80).stroke();
    
    const leftColumn = margin + 20;
    const rightColumn = pageWidth - 200;
    
    doc.fontSize(12).font('Helvetica-Bold');
    
    // Left column
    doc.text('Invoice Number:', leftColumn, yPosition + 15);
    doc.text('Invoice Date:', leftColumn, yPosition + 35);
    doc.text('Due Date:', leftColumn, yPosition + 55);
    
    // Right column
    doc.text('Status:', rightColumn, yPosition + 15);
    if (invoice.appointment) {
      doc.text('Appointment:', rightColumn, yPosition + 35);
    }
    
    doc.font('Helvetica');
    
    // Values - Left column
    doc.text(invoice.invoiceNumber, leftColumn + 100, yPosition + 15);
    doc.text(this.formatDate(invoice.invoiceDate), leftColumn + 100, yPosition + 35);
    doc.text(this.formatDate(invoice.dueDate), leftColumn + 100, yPosition + 55);
    
    // Values - Right column
    const statusColor = this.getStatusColor(invoice.status);
    doc.fillColor(statusColor).text(invoice.status.replace('_', ' '), rightColumn + 80, yPosition + 15);
    doc.fillColor('black');
    
    if (invoice.appointment) {
      doc.text(this.formatDate(invoice.appointment.date), rightColumn + 80, yPosition + 35);
    }

    return yPosition + 100;
  }

  /**
   * Add client information
   */
  private addClientInfo(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const halfWidth = (doc.page.width - (margin * 2)) / 2;

    // Bill To section
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('BILL TO:', margin, yPosition);
    
    doc.fontSize(11).font('Helvetica');
    yPosition += 20;
    
    doc.text(`${invoice.client.firstName} ${invoice.client.lastName}`, margin, yPosition);
    yPosition += 15;
    
    if (invoice.client.email) {
      doc.text(invoice.client.email, margin, yPosition);
      yPosition += 12;
    }
    
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, margin, yPosition);
      yPosition += 12;
    }
    
    if (invoice.client.address) {
      const address = this.formatAddress(invoice.client.address);
      doc.text(address, margin, yPosition, { width: halfWidth - 20 });
      yPosition += 12 * address.split('\n').length;
    }

    // Branch info (right side)
    const rightStart = margin + halfWidth;
    let rightY = yPosition - (invoice.client.address ? 12 * this.formatAddress(invoice.client.address).split('\n').length : 0) - 35;
    
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('FROM:', rightStart, rightY);
    
    doc.fontSize(11).font('Helvetica');
    rightY += 20;
    
    doc.text(invoice.branch.name, rightStart, rightY);
    rightY += 15;
    
    if (invoice.branch.email) {
      doc.text(invoice.branch.email, rightStart, rightY);
      rightY += 12;
    }
    
    if (invoice.branch.phone) {
      doc.text(invoice.branch.phone, rightStart, rightY);
      rightY += 12;
    }
    
    if (invoice.branch.address) {
      const address = this.formatAddress(invoice.branch.address);
      doc.text(address, rightStart, rightY, { width: halfWidth - 20 });
    }

    return yPosition + 30;
  }

  /**
   * Add items table
   */
  private addItemsTable(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const tableWidth = pageWidth - (margin * 2);
    const rowHeight = 25;
    
    // Table header
    const headerY = yPosition;
    doc.rect(margin, headerY, tableWidth, rowHeight).fillAndStroke('#f0f0f0', '#000');
    
    doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
    
    const columns = [
      { text: 'Description', x: margin + 10, width: tableWidth * 0.4 },
      { text: 'Qty', x: margin + tableWidth * 0.45, width: tableWidth * 0.1 },
      { text: 'Rate', x: margin + tableWidth * 0.6, width: tableWidth * 0.15 },
      { text: 'Discount', x: margin + tableWidth * 0.75, width: tableWidth * 0.1 },
      { text: 'Amount', x: margin + tableWidth * 0.85, width: tableWidth * 0.15 }
    ];
    
    columns.forEach(col => {
      doc.text(col.text, col.x, headerY + 8, { width: col.width, align: col.text === 'Description' ? 'left' : 'center' });
    });
    
    yPosition += rowHeight;
    
    // Table rows
    doc.font('Helvetica').fontSize(9);
    
    invoice.items.forEach((item, index) => {
      const rowY = yPosition + (index * rowHeight);
      
      // Alternate row backgrounds
      if (index % 2 === 1) {
        doc.rect(margin, rowY, tableWidth, rowHeight).fillAndStroke('#f9f9f9', '#e0e0e0');
      } else {
        doc.rect(margin, rowY, tableWidth, rowHeight).stroke('#e0e0e0');
      }
      
      doc.fillColor('black');
      
      // Description
      doc.text(item.description, columns[0].x, rowY + 8, { 
        width: columns[0].width - 10, 
        height: rowHeight - 4,
        ellipsis: true
      });
      
      // Quantity
      doc.text(this.formatNumber(item.quantity), columns[1].x, rowY + 8, { 
        width: columns[1].width, 
        align: 'center' 
      });
      
      // Rate
      doc.text(`${invoice.currency} ${this.formatNumber(item.unitPrice)}`, columns[2].x, rowY + 8, { 
        width: columns[2].width, 
        align: 'center' 
      });
      
      // Discount
      doc.text(item.discount ? `${invoice.currency} ${this.formatNumber(item.discount)}` : '-', columns[3].x, rowY + 8, { 
        width: columns[3].width, 
        align: 'center' 
      });
      
      // Amount
      doc.text(`${invoice.currency} ${this.formatNumber(item.total)}`, columns[4].x, rowY + 8, { 
        width: columns[4].width, 
        align: 'center' 
      });
    });
    
    return yPosition + (invoice.items.length * rowHeight) + 20;
  }

  /**
   * Add totals section
   */
  private addTotals(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const rightAlign = pageWidth - 200;
    const labelWidth = 100;
    const valueWidth = 80;
    
    doc.fontSize(11).font('Helvetica');
    
    // Subtotal
    doc.text('Subtotal:', rightAlign, yPosition, { width: labelWidth, align: 'right' });
    doc.text(`${invoice.currency} ${this.formatNumber(invoice.subtotal)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
    yPosition += 18;
    
    // Discount (if any)
    if (invoice.discountAmount > 0) {
      doc.text('Discount:', rightAlign, yPosition, { width: labelWidth, align: 'right' });
      doc.text(`-${invoice.currency} ${this.formatNumber(invoice.discountAmount)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
      yPosition += 18;
    }
    
    // Tax (if any)
    if (invoice.taxAmount > 0) {
      doc.text(`Tax (${this.formatNumber(invoice.taxRate)}%):`, rightAlign, yPosition, { width: labelWidth, align: 'right' });
      doc.text(`${invoice.currency} ${this.formatNumber(invoice.taxAmount)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
      yPosition += 18;
    }
    
    // Total line
    yPosition += 5;
    doc.lineWidth(1).moveTo(rightAlign, yPosition).lineTo(pageWidth - margin, yPosition).stroke();
    yPosition += 10;
    
    // Total
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('TOTAL:', rightAlign, yPosition, { width: labelWidth, align: 'right' });
    doc.text(`${invoice.currency} ${this.formatNumber(invoice.total)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
    yPosition += 25;
    
    // Payment status
    doc.fontSize(11).font('Helvetica');
    if (invoice.paidAmount > 0) {
      doc.text('Paid:', rightAlign, yPosition, { width: labelWidth, align: 'right' });
      doc.fillColor('green').text(`${invoice.currency} ${this.formatNumber(invoice.paidAmount)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
      yPosition += 18;
      
      if (invoice.balanceAmount > 0) {
        doc.fillColor('black').text('Balance Due:', rightAlign, yPosition, { width: labelWidth, align: 'right' });
        doc.fillColor('red').text(`${invoice.currency} ${this.formatNumber(invoice.balanceAmount)}`, rightAlign + labelWidth + 10, yPosition, { width: valueWidth, align: 'right' });
        doc.fillColor('black');
        yPosition += 18;
      }
    }
    
    return yPosition + 20;
  }

  /**
   * Add payment information
   */
  private addPaymentInfo(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('PAYMENT HISTORY:', margin, yPosition);
    yPosition += 20;
    
    doc.fontSize(9).font('Helvetica');
    
    invoice.payments.forEach((payment, index) => {
      if (payment.status === 'COMPLETED' || payment.status === 'PAID') {
        const paymentText = `${this.formatDate(payment.paymentDate)} - ${payment.paymentMethod} - ${invoice.currency} ${this.formatNumber(payment.amount)}`;
        if (payment.reference) {
          doc.text(`${paymentText} (${payment.reference})`, margin, yPosition);
        } else {
          doc.text(paymentText, margin, yPosition);
        }
        yPosition += 12;
      }
    });
    
    return yPosition + 20;
  }

  /**
   * Add notes and terms
   */
  private addNotesAndTerms(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - (margin * 2);
    
    if (invoice.notes) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('NOTES:', margin, yPosition);
      yPosition += 15;
      
      doc.fontSize(10).font('Helvetica');
      doc.text(invoice.notes, margin, yPosition, { width: contentWidth });
      yPosition += 10 + (Math.ceil(invoice.notes.length / 80) * 12);
    }
    
    if (invoice.terms || invoice.termsConditions) {
      const terms = invoice.terms || invoice.termsConditions;
      if (terms) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('TERMS & CONDITIONS:', margin, yPosition);
        yPosition += 15;
        
        doc.fontSize(10).font('Helvetica');
        doc.text(terms, margin, yPosition, { width: contentWidth });
        yPosition += 10 + (Math.ceil(terms.length / 80) * 12);
      }
    }
    
    return yPosition + 20;
  }

  /**
   * Add payment QR code
   */
  private async addPaymentQR(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): Promise<void> {
    try {
      // Generate payment URL or data for QR code
      const paymentData = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceAmount,
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString()
      };
      
      const qrData = JSON.stringify(paymentData);
      const qrCodeDataURL = await QRCode.toDataURL(qrData);
      
      // Convert data URL to buffer
      const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');
      
      const margin = 50;
      const qrSize = 80;
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Scan to Pay:', margin, yPosition);
      
      // Add QR code image
      doc.image(qrBuffer, margin, yPosition + 15, { width: qrSize, height: qrSize });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  /**
   * Add footer
   */
  private addFooter(doc: PDFKit.PDFDocument, invoice: InvoiceData): void {
    const margin = 50;
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;
    
    doc.fontSize(8).font('Helvetica');
    doc.fillColor('#666666');
    
    // Footer line
    doc.lineWidth(0.5).moveTo(margin, footerY).lineTo(doc.page.width - margin, footerY).stroke();
    
    // Footer text
    let footerText = `Generated on ${this.formatDate(new Date())}`;
    if (invoice.company.taxId) {
      footerText += ` | Tax ID: ${invoice.company.taxId}`;
    }
    
    doc.text(footerText, margin, footerY + 10, { 
      width: doc.page.width - (margin * 2), 
      align: 'center' 
    });
    
    doc.fillColor('black');
  }

  // Modern template methods
  private addModernClientInfo(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const halfWidth = (doc.page.width - (margin * 2)) / 2;

    // Client info card
    doc.roundedRect(margin, yPosition, halfWidth - 10, 100, 8).fillAndStroke('#f8f9fa', '#e9ecef');
    
    doc.fillColor('#495057').fontSize(12).font('Helvetica-Bold');
    doc.text('BILL TO', margin + 15, yPosition + 15);
    
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.text(`${invoice.client.firstName} ${invoice.client.lastName}`, margin + 15, yPosition + 35);
    
    let clientY = yPosition + 50;
    if (invoice.client.email) {
      doc.text(invoice.client.email, margin + 15, clientY);
      clientY += 12;
    }
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, margin + 15, clientY);
    }

    // Branch info card
    const rightStart = margin + halfWidth;
    doc.roundedRect(rightStart, yPosition, halfWidth - 10, 100, 8).fillAndStroke('#f8f9fa', '#e9ecef');
    
    doc.fillColor('#495057').fontSize(12).font('Helvetica-Bold');
    doc.text('FROM', rightStart + 15, yPosition + 15);
    
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.text(invoice.branch.name, rightStart + 15, yPosition + 35);
    
    let branchY = yPosition + 50;
    if (invoice.branch.email) {
      doc.text(invoice.branch.email, rightStart + 15, branchY);
      branchY += 12;
    }
    if (invoice.branch.phone) {
      doc.text(invoice.branch.phone, rightStart + 15, branchY);
    }

    return yPosition + 120;
  }

  private addModernItemsTable(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const tableWidth = pageWidth - (margin * 2);
    const rowHeight = 30;
    
    // Modern table header
    doc.roundedRect(margin, yPosition, tableWidth, rowHeight, 8).fill('#4F46E5');
    
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold');
    
    const columns = [
      { text: 'Description', x: margin + 15, width: tableWidth * 0.45 },
      { text: 'Qty', x: margin + tableWidth * 0.5, width: tableWidth * 0.1 },
      { text: 'Rate', x: margin + tableWidth * 0.65, width: tableWidth * 0.15 },
      { text: 'Total', x: margin + tableWidth * 0.8, width: tableWidth * 0.2 }
    ];
    
    columns.forEach(col => {
      doc.text(col.text, col.x, yPosition + 10, { width: col.width, align: col.text === 'Description' ? 'left' : 'center' });
    });
    
    yPosition += rowHeight;
    
    // Table rows with modern styling
    doc.fillColor('black').fontSize(10).font('Helvetica');
    
    invoice.items.forEach((item, index) => {
      const rowY = yPosition + (index * rowHeight);
      
      if (index % 2 === 1) {
        doc.rect(margin, rowY, tableWidth, rowHeight).fill('#f8f9fa');
      }
      
      doc.fillColor('black');
      
      doc.text(item.description, columns[0].x, rowY + 10, { width: columns[0].width - 10 });
      doc.text(this.formatNumber(item.quantity), columns[1].x, rowY + 10, { width: columns[1].width, align: 'center' });
      doc.text(`${invoice.currency} ${this.formatNumber(item.unitPrice)}`, columns[2].x, rowY + 10, { width: columns[2].width, align: 'center' });
      doc.text(`${invoice.currency} ${this.formatNumber(item.total)}`, columns[3].x, rowY + 10, { width: columns[3].width, align: 'center' });
    });
    
    return yPosition + (invoice.items.length * rowHeight) + 20;
  }

  private addModernTotals(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const totalsWidth = 250;
    const totalsX = pageWidth - margin - totalsWidth;
    
    // Totals card
    doc.roundedRect(totalsX, yPosition, totalsWidth, 120, 8).fillAndStroke('#f8f9fa', '#e9ecef');
    
    doc.fillColor('black').fontSize(11).font('Helvetica');
    
    let totalsY = yPosition + 20;
    
    doc.text('Subtotal:', totalsX + 20, totalsY, { width: 150 });
    doc.text(`${invoice.currency} ${this.formatNumber(invoice.subtotal)}`, totalsX + 170, totalsY, { width: 60, align: 'right' });
    totalsY += 20;
    
    if (invoice.discountAmount > 0) {
      doc.text('Discount:', totalsX + 20, totalsY, { width: 150 });
      doc.text(`-${invoice.currency} ${this.formatNumber(invoice.discountAmount)}`, totalsX + 170, totalsY, { width: 60, align: 'right' });
      totalsY += 20;
    }
    
    if (invoice.taxAmount > 0) {
      doc.text(`Tax (${this.formatNumber(invoice.taxRate)}%):`, totalsX + 20, totalsY, { width: 150 });
      doc.text(`${invoice.currency} ${this.formatNumber(invoice.taxAmount)}`, totalsX + 170, totalsY, { width: 60, align: 'right' });
      totalsY += 20;
    }
    
    // Total
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('TOTAL:', totalsX + 20, totalsY, { width: 150 });
    doc.text(`${invoice.currency} ${this.formatNumber(invoice.total)}`, totalsX + 170, totalsY, { width: 60, align: 'right' });
    
    return yPosition + 140;
  }

  private addModernFooter(doc: PDFKit.PDFDocument, invoice: InvoiceData): void {
    const margin = 50;
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 60;
    
    // Modern footer
    doc.rect(0, footerY, doc.page.width, 60).fill('#4F46E5');
    
    doc.fillColor('white').fontSize(10).font('Helvetica');
    doc.text(`© ${new Date().getFullYear()} ${invoice.company.name}. All rights reserved.`, 
             margin, footerY + 20, { width: doc.page.width - (margin * 2), align: 'center' });
  }

  // Minimal template methods
  private addMinimalDetails(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const halfWidth = (doc.page.width - (margin * 2)) / 2;

    doc.fontSize(12).font('Helvetica');
    
    // Left side - Client
    doc.text(`To: ${invoice.client.firstName} ${invoice.client.lastName}`, margin, yPosition);
    if (invoice.client.email) {
      doc.text(invoice.client.email, margin, yPosition + 15);
    }
    
    // Right side - Dates
    const rightStart = margin + halfWidth;
    doc.text(`Date: ${this.formatDate(invoice.invoiceDate)}`, rightStart, yPosition);
    doc.text(`Due: ${this.formatDate(invoice.dueDate)}`, rightStart, yPosition + 15);
    
    return yPosition + 50;
  }

  private addMinimalItemsTable(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const tableWidth = pageWidth - (margin * 2);
    
    // Simple line
    doc.lineWidth(1).moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke();
    yPosition += 20;
    
    doc.fontSize(10).font('Helvetica');
    
    invoice.items.forEach((item, index) => {
      doc.text(item.description, margin, yPosition);
      doc.text(`${this.formatNumber(item.quantity)} × ${invoice.currency} ${this.formatNumber(item.unitPrice)}`, 
               pageWidth - 150, yPosition, { width: 100, align: 'right' });
      doc.text(`${invoice.currency} ${this.formatNumber(item.total)}`, 
               pageWidth - 100, yPosition, { width: 50, align: 'right' });
      yPosition += 20;
    });
    
    // Simple line
    doc.lineWidth(1).moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke();
    
    return yPosition + 20;
  }

  private addMinimalTotals(doc: PDFKit.PDFDocument, invoice: InvoiceData, yPosition: number): number {
    const pageWidth = doc.page.width;
    
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('TOTAL:', pageWidth - 150, yPosition, { width: 100, align: 'right' });
    doc.text(`${invoice.currency} ${this.formatNumber(invoice.total)}`, 
             pageWidth - 100, yPosition, { width: 50, align: 'right' });
    
    return yPosition + 40;
  }

  /**
   * Add watermark
   */
  private addWatermark(doc: PDFKit.PDFDocument, text: string): void {
    doc.save();
    doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(60).font('Helvetica').fillColor('#f0f0f0');
    doc.text(text, 0, doc.page.height / 2 - 30, { 
      width: doc.page.width, 
      align: 'center' 
    });
    doc.restore();
  }

  /**
   * Utility methods
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  private formatAddress(address: any): string {
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      if (address.zipCode) parts.push(address.zipCode);
      return parts.join(', ');
    }
    return '';
  }

  private getStatusColor(status: string): string {
    switch (status.toUpperCase()) {
      case 'PAID': return '#22c55e';
      case 'PARTIAL': return '#f59e0b';
      case 'OVERDUE': return '#ef4444';
      case 'CANCELLED': return '#6b7280';
      default: return '#3b82f6';
    }
  }
}