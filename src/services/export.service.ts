import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import { format } from 'date-fns';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs-extra';
import { DailyReport, MonthlyReport, CustomReport } from './reports.service';
import { RevenueAnalytics, AppointmentAnalytics, ClientAnalytics, StaffPerformance, ServiceAnalytics } from './analytics.service';

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  template?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter';
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
}

export class ExportService {
  private readonly exportDir = path.join(process.cwd(), 'exports');
  private readonly baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  constructor() {
    // Ensure export directory exists
    fs.ensureDirSync(this.exportDir);
  }

  /**
   * Export daily report
   */
  async exportDailyReport(
    report: DailyReport,
    companyName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const fileName = options.fileName || `daily-report-${format(report.date, 'yyyy-MM-dd')}`;
    
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportDailyReportToPDF(report, companyName, fileName, options);
        case 'excel':
          return await this.exportDailyReportToExcel(report, companyName, fileName, options);
        case 'csv':
          return await this.exportDailyReportToCSV(report, companyName, fileName);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Error exporting daily report:', error);
      throw new Error('Failed to export daily report');
    }
  }

  /**
   * Export monthly report
   */
  async exportMonthlyReport(
    report: MonthlyReport,
    companyName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const fileName = options.fileName || `monthly-report-${report.year}-${report.month.toString().padStart(2, '0')}`;
    
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportMonthlyReportToPDF(report, companyName, fileName, options);
        case 'excel':
          return await this.exportMonthlyReportToExcel(report, companyName, fileName, options);
        case 'csv':
          return await this.exportMonthlyReportToCSV(report, companyName, fileName);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Error exporting monthly report:', error);
      throw new Error('Failed to export monthly report');
    }
  }

  /**
   * Export custom report
   */
  async exportCustomReport(
    report: CustomReport,
    companyName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const fileName = options.fileName || `custom-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}`;
    
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportCustomReportToPDF(report, companyName, fileName, options);
        case 'excel':
          return await this.exportCustomReportToExcel(report, companyName, fileName, options);
        case 'csv':
          return await this.exportCustomReportToCSV(report, companyName, fileName);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Error exporting custom report:', error);
      throw new Error('Failed to export custom report');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    data: RevenueAnalytics | AppointmentAnalytics | ClientAnalytics | StaffPerformance | ServiceAnalytics,
    type: string,
    companyName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const fileName = options.fileName || `${type}-analytics-${format(new Date(), 'yyyy-MM-dd')}`;
    
    try {
      switch (options.format) {
        case 'excel':
          return await this.exportAnalyticsToExcel(data, type, companyName, fileName, options);
        case 'csv':
          return await this.exportAnalyticsToCSV(data, type, companyName, fileName);
        case 'pdf':
          return await this.exportAnalyticsToPDF(data, type, companyName, fileName, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      throw new Error('Failed to export analytics data');
    }
  }

  // PDF Export Methods

  private async exportDailyReportToPDF(
    report: DailyReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.pdf`);
    const doc = new PDFDocument({
      size: options.paperSize || 'A4',
      layout: options.orientation || 'portrait',
      margin: 50
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text(companyName, 50, 50);
    doc.fontSize(16).text(`Daily Report - ${format(report.date, 'MMMM dd, yyyy')}`, 50, 80);
    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    let yPosition = 130;

    // Summary Section
    doc.fontSize(14).text('Summary', 50, yPosition);
    yPosition += 30;

    const summaryData = [
      ['Total Revenue', `$${report.summary.totalRevenue.toFixed(2)}`],
      ['Appointments Scheduled', report.summary.appointmentsScheduled.toString()],
      ['Appointments Completed', report.summary.appointmentsCompleted.toString()],
      ['Appointments Cancelled', report.summary.appointmentsCancelled.toString()],
      ['New Clients', report.summary.newClients.toString()],
      ['Total Payments', `$${report.summary.totalPayments.toFixed(2)}`]
    ];

    summaryData.forEach(([label, value]) => {
      doc.fontSize(10).text(`${label}:`, 50, yPosition);
      doc.text(value, 250, yPosition);
      yPosition += 20;
    });

    yPosition += 20;

    // Upcoming Appointments
    if (report.appointments.upcoming.length > 0) {
      doc.fontSize(14).text('Upcoming Appointments', 50, yPosition);
      yPosition += 30;

      report.appointments.upcoming.slice(0, 10).forEach(apt => {
        doc.fontSize(10).text(
          `${apt.startTime} - ${apt.clientName} (${apt.serviceName}) - ${apt.staffName}`,
          50,
          yPosition
        );
        yPosition += 15;
      });

      yPosition += 20;
    }

    // Staff Performance
    if (report.staff.length > 0) {
      doc.fontSize(14).text('Staff Performance', 50, yPosition);
      yPosition += 30;

      report.staff.forEach(staff => {
        doc.fontSize(10).text(
          `${staff.staffName}: ${staff.appointmentsToday} appointments, $${staff.revenueToday.toFixed(2)} revenue, ${staff.utilizationRate.toFixed(1)}% utilization`,
          50,
          yPosition
        );
        yPosition += 15;
      });

      yPosition += 20;
    }

    // Alerts
    if (report.alerts.length > 0) {
      doc.fontSize(14).text('Alerts', 50, yPosition);
      yPosition += 30;

      report.alerts.forEach(alert => {
        doc.fontSize(10).text(`• ${alert.message}`, 50, yPosition);
        yPosition += 15;
      });
    }

    // Footer
    doc.fontSize(8).text(
      `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`,
      50,
      doc.page.height - 50
    );

    doc.end();

    await this.waitForPDFCompletion(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('pdf', fileName, filePath, stats.size);
  }

  private async exportMonthlyReportToPDF(
    report: MonthlyReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.pdf`);
    const doc = new PDFDocument({
      size: options.paperSize || 'A4',
      layout: options.orientation || 'portrait',
      margin: 50
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text(companyName, 50, 50);
    doc.fontSize(16).text(`Monthly Report - ${format(new Date(report.year, report.month - 1), 'MMMM yyyy')}`, 50, 80);
    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    let yPosition = 130;

    // Executive Summary
    doc.fontSize(14).text('Executive Summary', 50, yPosition);
    yPosition += 30;

    const summaryData = [
      ['Total Revenue', `$${report.summary.totalRevenue.toFixed(2)}`],
      ['Revenue Growth', `${report.summary.revenueGrowth.toFixed(1)}%`],
      ['Total Appointments', report.summary.totalAppointments.toString()],
      ['Appointment Growth', `${report.summary.appointmentGrowth.toFixed(1)}%`],
      ['New Clients', report.summary.newClients.toString()],
      ['Average Appointment Value', `$${report.summary.averageAppointmentValue.toFixed(2)}`]
    ];

    summaryData.forEach(([label, value]) => {
      doc.fontSize(10).text(`${label}:`, 50, yPosition);
      doc.text(value, 250, yPosition);
      yPosition += 20;
    });

    yPosition += 30;

    // Top Services
    doc.fontSize(14).text('Top Services', 50, yPosition);
    yPosition += 30;

    report.summary.topServices.forEach(service => {
      doc.fontSize(10).text(
        `${service.name}: ${service.count} bookings, $${service.revenue.toFixed(2)} revenue`,
        50,
        yPosition
      );
      yPosition += 15;
    });

    yPosition += 30;

    // Client Analysis
    doc.fontSize(14).text('Client Analysis', 50, yPosition);
    yPosition += 30;

    const clientData = [
      ['Total Clients', report.clientAnalysis.totalClients.toString()],
      ['New Clients', report.clientAnalysis.newClients.toString()],
      ['Returning Clients', report.clientAnalysis.returningClients.toString()],
      ['Retention Rate', `${report.clientAnalysis.clientRetentionRate.toFixed(1)}%`],
      ['Average Lifetime Value', `$${report.clientAnalysis.averageLifetimeValue.toFixed(2)}`]
    ];

    clientData.forEach(([label, value]) => {
      doc.fontSize(10).text(`${label}:`, 50, yPosition);
      doc.text(value, 250, yPosition);
      yPosition += 20;
    });

    // Footer
    doc.fontSize(8).text(
      `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`,
      50,
      doc.page.height - 50
    );

    doc.end();

    await this.waitForPDFCompletion(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('pdf', fileName, filePath, stats.size);
  }

  private async exportCustomReportToPDF(
    report: CustomReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.pdf`);
    const doc = new PDFDocument({
      size: options.paperSize || 'A4',
      layout: options.orientation || 'portrait',
      margin: 50
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text(companyName, 50, 50);
    doc.fontSize(16).text(report.name, 50, 80);
    doc.fontSize(12).text(report.description, 50, 105);
    doc.moveTo(50, 125).lineTo(550, 125).stroke();

    let yPosition = 145;

    // Key Metrics
    doc.fontSize(14).text('Key Metrics', 50, yPosition);
    yPosition += 30;

    report.summary.keyMetrics.forEach(metric => {
      let value = metric.value.toString();
      if (metric.format === 'currency') {
        value = `$${Number(metric.value).toFixed(2)}`;
      } else if (metric.format === 'percentage') {
        value = `${metric.value}%`;
      }

      doc.fontSize(10).text(`${metric.label}:`, 50, yPosition);
      doc.text(value, 250, yPosition);
      yPosition += 20;
    });

    // Summary
    yPosition += 20;
    doc.fontSize(14).text('Summary', 50, yPosition);
    yPosition += 20;
    doc.fontSize(10).text(`Date Range: ${report.summary.dateRange}`, 50, yPosition);
    yPosition += 15;
    doc.fontSize(10).text(`Total Records: ${report.summary.totalRecords}`, 50, yPosition);

    // Footer
    doc.fontSize(8).text(
      `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`,
      50,
      doc.page.height - 50
    );

    doc.end();

    await this.waitForPDFCompletion(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('pdf', fileName, filePath, stats.size);
  }

  private async exportAnalyticsToPDF(
    data: any,
    type: string,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.pdf`);
    const doc = new PDFDocument({
      size: options.paperSize || 'A4',
      layout: options.orientation || 'portrait',
      margin: 50
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text(companyName, 50, 50);
    doc.fontSize(16).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Analytics Report`, 50, 80);
    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    let yPosition = 130;

    // Basic data display - would be customized based on data type
    doc.fontSize(12).text(JSON.stringify(data, null, 2), 50, yPosition, { 
      width: 500, 
      height: 500 
    });

    // Footer
    doc.fontSize(8).text(
      `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`,
      50,
      doc.page.height - 50
    );

    doc.end();

    await this.waitForPDFCompletion(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('pdf', fileName, filePath, stats.size);
  }

  // Excel Export Methods

  private async exportDailyReportToExcel(
    report: DailyReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow([companyName]);
    summarySheet.addRow([`Daily Report - ${format(report.date, 'MMMM dd, yyyy')}`]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Revenue', report.summary.totalRevenue]);
    summarySheet.addRow(['Appointments Scheduled', report.summary.appointmentsScheduled]);
    summarySheet.addRow(['Appointments Completed', report.summary.appointmentsCompleted]);
    summarySheet.addRow(['Appointments Cancelled', report.summary.appointmentsCancelled]);
    summarySheet.addRow(['New Clients', report.summary.newClients]);
    summarySheet.addRow(['Total Payments', report.summary.totalPayments]);

    // Upcoming Appointments Sheet
    const upcomingSheet = workbook.addWorksheet('Upcoming Appointments');
    upcomingSheet.addRow(['Client Name', 'Service', 'Staff', 'Time', 'Duration', 'Status']);
    report.appointments.upcoming.forEach(apt => {
      upcomingSheet.addRow([
        apt.clientName,
        apt.serviceName,
        apt.staffName,
        apt.startTime,
        apt.duration,
        apt.status
      ]);
    });

    // Completed Appointments Sheet
    const completedSheet = workbook.addWorksheet('Completed Appointments');
    completedSheet.addRow(['Client Name', 'Service', 'Revenue', 'Duration']);
    report.appointments.completed.forEach(apt => {
      completedSheet.addRow([
        apt.clientName,
        apt.serviceName,
        apt.revenue,
        apt.duration
      ]);
    });

    // Staff Performance Sheet
    const staffSheet = workbook.addWorksheet('Staff Performance');
    staffSheet.addRow(['Staff Name', 'Appointments Today', 'Revenue Today', 'Utilization Rate']);
    report.staff.forEach(staff => {
      staffSheet.addRow([
        staff.staffName,
        staff.appointmentsToday,
        staff.revenueToday,
        `${staff.utilizationRate.toFixed(1)}%`
      ]);
    });

    // Style the headers
    [summarySheet, upcomingSheet, completedSheet, staffSheet].forEach(sheet => {
      const headerRow = sheet.getRow(sheet.rowCount > 3 ? 4 : 1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('excel', fileName, filePath, stats.size);
  }

  private async exportMonthlyReportToExcel(
    report: MonthlyReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow([companyName]);
    summarySheet.addRow([`Monthly Report - ${format(new Date(report.year, report.month - 1), 'MMMM yyyy')}`]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Metric', 'Value', 'Growth']);
    summarySheet.addRow(['Total Revenue', report.summary.totalRevenue, `${report.summary.revenueGrowth.toFixed(1)}%`]);
    summarySheet.addRow(['Total Appointments', report.summary.totalAppointments, `${report.summary.appointmentGrowth.toFixed(1)}%`]);
    summarySheet.addRow(['New Clients', report.summary.newClients, `${report.summary.clientGrowth.toFixed(1)}%`]);
    summarySheet.addRow(['Average Appointment Value', report.summary.averageAppointmentValue, '']);

    // Top Services Sheet
    const servicesSheet = workbook.addWorksheet('Top Services');
    servicesSheet.addRow(['Service Name', 'Bookings', 'Revenue']);
    report.summary.topServices.forEach(service => {
      servicesSheet.addRow([service.name, service.count, service.revenue]);
    });

    // Top Staff Sheet
    const staffSheet = workbook.addWorksheet('Top Staff');
    staffSheet.addRow(['Staff Name', 'Appointments', 'Revenue']);
    report.summary.topStaff.forEach(staff => {
      staffSheet.addRow([staff.name, staff.appointments, staff.revenue]);
    });

    // Client Analysis Sheet
    const clientSheet = workbook.addWorksheet('Client Analysis');
    clientSheet.addRow(['Metric', 'Value']);
    clientSheet.addRow(['Total Clients', report.clientAnalysis.totalClients]);
    clientSheet.addRow(['New Clients', report.clientAnalysis.newClients]);
    clientSheet.addRow(['Returning Clients', report.clientAnalysis.returningClients]);
    clientSheet.addRow(['Retention Rate', `${report.clientAnalysis.clientRetentionRate.toFixed(1)}%`]);
    clientSheet.addRow(['Average Lifetime Value', report.clientAnalysis.averageLifetimeValue]);

    // Top Clients Sheet
    const topClientsSheet = workbook.addWorksheet('Top Clients');
    topClientsSheet.addRow(['Client Name', 'Total Spent', 'Visits']);
    report.clientAnalysis.topClients.forEach(client => {
      topClientsSheet.addRow([client.name, client.totalSpent, client.visits]);
    });

    // Daily Revenue Trend Sheet
    const revenueSheet = workbook.addWorksheet('Daily Revenue Trend');
    revenueSheet.addRow(['Date', 'Revenue']);
    report.trends.dailyRevenue.forEach(trend => {
      revenueSheet.addRow([format(trend.date, 'yyyy-MM-dd'), trend.revenue]);
    });

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('excel', fileName, filePath, stats.size);
  }

  private async exportCustomReportToExcel(
    report: CustomReport,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow([companyName]);
    summarySheet.addRow([report.name]);
    summarySheet.addRow([report.description]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Key Metrics']);
    summarySheet.addRow(['Metric', 'Value']);
    report.summary.keyMetrics.forEach(metric => {
      let value = metric.value;
      if (metric.format === 'currency') {
        value = Number(metric.value);
      }
      summarySheet.addRow([metric.label, value]);
    });

    summarySheet.addRow([]);
    summarySheet.addRow(['Date Range', report.summary.dateRange]);
    summarySheet.addRow(['Total Records', report.summary.totalRecords]);

    // Data Sheet (raw data if included)
    if (options.includeRawData && report.data) {
      const dataSheet = workbook.addWorksheet('Data');
      // Convert data to tabular format - this would be customized based on data structure
      const dataArray = this.convertDataToArray(report.data);
      dataArray.forEach(row => {
        dataSheet.addRow(row);
      });
    }

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('excel', fileName, filePath, stats.size);
  }

  private async exportAnalyticsToExcel(
    data: any,
    type: string,
    companyName: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet(type);
    sheet.addRow([companyName]);
    sheet.addRow([`${type.charAt(0).toUpperCase() + type.slice(1)} Analytics`]);
    sheet.addRow([]);

    // Convert analytics data to tabular format based on type
    const tableData = this.convertAnalyticsToTable(data, type);
    tableData.forEach(row => {
      sheet.addRow(row);
    });

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);
    return this.createExportResult('excel', fileName, filePath, stats.size);
  }

  // CSV Export Methods

  private async exportDailyReportToCSV(
    report: DailyReport,
    companyName: string,
    fileName: string
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.csv`);

    // Combine all data into a single CSV structure
    const csvData = [
      { section: 'Summary', metric: 'Total Revenue', value: report.summary.totalRevenue },
      { section: 'Summary', metric: 'Appointments Scheduled', value: report.summary.appointmentsScheduled },
      { section: 'Summary', metric: 'Appointments Completed', value: report.summary.appointmentsCompleted },
      { section: 'Summary', metric: 'Appointments Cancelled', value: report.summary.appointmentsCancelled },
      { section: 'Summary', metric: 'New Clients', value: report.summary.newClients },
      { section: 'Summary', metric: 'Total Payments', value: report.summary.totalPayments },
      ...report.staff.map(staff => ({
        section: 'Staff Performance',
        metric: `${staff.staffName} - Appointments`,
        value: staff.appointmentsToday
      })),
      ...report.staff.map(staff => ({
        section: 'Staff Performance',
        metric: `${staff.staffName} - Revenue`,
        value: staff.revenueToday
      }))
    ];

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'section', title: 'Section' },
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    const stats = await fs.stat(filePath);
    return this.createExportResult('csv', fileName, filePath, stats.size);
  }

  private async exportMonthlyReportToCSV(
    report: MonthlyReport,
    companyName: string,
    fileName: string
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.csv`);

    const csvData = [
      { section: 'Summary', metric: 'Total Revenue', value: report.summary.totalRevenue },
      { section: 'Summary', metric: 'Revenue Growth', value: report.summary.revenueGrowth },
      { section: 'Summary', metric: 'Total Appointments', value: report.summary.totalAppointments },
      { section: 'Summary', metric: 'Appointment Growth', value: report.summary.appointmentGrowth },
      { section: 'Summary', metric: 'New Clients', value: report.summary.newClients },
      { section: 'Summary', metric: 'Average Appointment Value', value: report.summary.averageAppointmentValue },
      ...report.summary.topServices.map(service => ({
        section: 'Top Services',
        metric: `${service.name} - Bookings`,
        value: service.count
      })),
      ...report.summary.topServices.map(service => ({
        section: 'Top Services',
        metric: `${service.name} - Revenue`,
        value: service.revenue
      }))
    ];

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'section', title: 'Section' },
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    const stats = await fs.stat(filePath);
    return this.createExportResult('csv', fileName, filePath, stats.size);
  }

  private async exportCustomReportToCSV(
    report: CustomReport,
    companyName: string,
    fileName: string
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.csv`);

    const csvData = report.summary.keyMetrics.map(metric => ({
      metric: metric.label,
      value: metric.value,
      format: metric.format || 'number'
    }));

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
        { id: 'format', title: 'Format' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    const stats = await fs.stat(filePath);
    return this.createExportResult('csv', fileName, filePath, stats.size);
  }

  private async exportAnalyticsToCSV(
    data: any,
    type: string,
    companyName: string,
    fileName: string
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${fileName}.csv`);

    // Convert analytics data to CSV format
    const tableData = this.convertAnalyticsToTable(data, type);
    
    if (tableData.length === 0) {
      throw new Error('No data to export');
    }

    // Use first row as headers
    const headers = tableData[0].map((header, index) => ({
      id: `col${index}`,
      title: header
    }));

    const records = tableData.slice(1).map(row => {
      const record: any = {};
      row.forEach((value, index) => {
        record[`col${index}`] = value;
      });
      return record;
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(records);

    const stats = await fs.stat(filePath);
    return this.createExportResult('csv', fileName, filePath, stats.size);
  }

  // Helper Methods

  private async waitForPDFCompletion(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkFile = () => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (!err) {
            setTimeout(resolve, 100); // Small delay to ensure file is fully written
          } else {
            setTimeout(checkFile, 100);
          }
        });
      };
      
      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timeout'));
      }, 10000);
      
      checkFile();
      clearTimeout(timeout);
    });
  }

  private convertDataToArray(data: any): any[][] {
    // Convert object/array data to 2D array for Excel
    if (Array.isArray(data)) {
      if (data.length === 0) return [['No data']];
      
      const keys = Object.keys(data[0]);
      const result = [keys];
      
      data.forEach(item => {
        result.push(keys.map(key => item[key] || ''));
      });
      
      return result;
    }
    
    // Convert object to key-value pairs
    return Object.entries(data).map(([key, value]) => [key, value]);
  }

  private convertAnalyticsToTable(data: any, type: string): any[][] {
    switch (type) {
      case 'revenue':
        if (data.revenueByService) {
          const headers = ['Service ID', 'Service Name', 'Revenue', 'Appointments', 'Average Value'];
          const rows = data.revenueByService.map((service: any) => [
            service.serviceId,
            service.serviceName,
            service.revenue,
            service.appointments,
            service.averageValue
          ]);
          return [headers, ...rows];
        }
        break;
        
      case 'appointments':
        if (data.statusBreakdown) {
          const headers = ['Status', 'Count', 'Percentage'];
          const rows = data.statusBreakdown.map((status: any) => [
            status.status,
            status.count,
            status.percentage
          ]);
          return [headers, ...rows];
        }
        break;
        
      case 'clients':
        if (data.topClients) {
          const headers = ['Client ID', 'Client Name', 'Total Spent', 'Appointments', 'Last Visit'];
          const rows = data.topClients.map((client: any) => [
            client.clientId,
            client.clientName,
            client.totalSpent,
            client.appointmentCount,
            format(new Date(client.lastVisit), 'yyyy-MM-dd')
          ]);
          return [headers, ...rows];
        }
        break;
        
      case 'staff':
        if (data.staffMetrics) {
          const headers = ['Staff ID', 'Staff Name', 'Revenue', 'Appointments', 'Completion Rate', 'Utilization'];
          const rows = data.staffMetrics.map((staff: any) => [
            staff.staffId,
            staff.staffName,
            staff.totalRevenue,
            staff.appointmentCount,
            staff.completionRate,
            staff.utilizationRate
          ]);
          return [headers, ...rows];
        }
        break;
        
      case 'services':
        if (data.servicePerformance) {
          const headers = ['Service ID', 'Service Name', 'Bookings', 'Revenue', 'Average Price', 'Conversion Rate'];
          const rows = data.servicePerformance.map((service: any) => [
            service.serviceId,
            service.serviceName,
            service.bookingCount,
            service.revenue,
            service.averagePrice,
            service.conversionRate
          ]);
          return [headers, ...rows];
        }
        break;
    }
    
    // Fallback: convert object to key-value pairs
    return Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]);
  }

  private createExportResult(
    format: string,
    fileName: string,
    filePath: string,
    fileSize: number
  ): ExportResult {
    const mimeTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv'
    };

    const fullFileName = `${fileName}.${format === 'excel' ? 'xlsx' : format}`;
    const downloadUrl = `${this.baseUrl}/api/v1/exports/download/${path.basename(filePath)}`;

    return {
      success: true,
      fileName: fullFileName,
      filePath,
      fileSize,
      mimeType: mimeTypes[format as keyof typeof mimeTypes] || 'application/octet-stream',
      downloadUrl
    };
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.exportDir);
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffTime) {
          await fs.remove(filePath);
          logger.info(`Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up export files:', error);
    }
  }

  /**
   * Get file for download
   */
  async getExportFile(fileName: string): Promise<{ filePath: string; mimeType: string }> {
    const filePath = path.join(this.exportDir, fileName);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error('Export file not found');
    }

    const ext = path.extname(fileName).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        mimeType = 'application/pdf';
        break;
      case '.xlsx':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.csv':
        mimeType = 'text/csv';
        break;
    }

    return { filePath, mimeType };
  }
}

// Export singleton instance
export const exportService = new ExportService();