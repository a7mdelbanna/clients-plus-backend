import { Request, Response } from 'express';
import { z } from 'zod';
import { reportsService, CustomReportParams } from '../services/reports.service';
import { exportService } from '../services/export.service';
import { successResponse, errorResponse } from '../utils/response';
import { parseISO, isValid } from 'date-fns';

// Validation schemas
const dailyReportSchema = z.object({
  date: z.string().refine(date => isValid(parseISO(date)), 'Invalid date format')
});

const monthlyReportSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030)
});

const customReportSchema = z.object({
  reportType: z.enum(['revenue', 'appointments', 'clients', 'staff', 'services', 'custom']),
  startDate: z.string().refine(date => isValid(parseISO(date)), 'Invalid start date format'),
  endDate: z.string().refine(date => isValid(parseISO(date)), 'Invalid end date format'),
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
  metrics: z.array(z.string()).optional().default([]),
  filters: z.record(z.any()).optional().default({}),
  format: z.enum(['json', 'pdf', 'excel', 'csv']).optional().default('json')
});

const exportReportSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']),
  template: z.string().optional(),
  includeCharts: z.boolean().optional().default(false),
  includeRawData: z.boolean().optional().default(true),
  fileName: z.string().optional(),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  paperSize: z.enum(['A4', 'Letter']).optional().default('A4')
});

export class ReportsController {

  /**
   * Generate daily report
   */
  async generateDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = dailyReportSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { date } = validation.data;
      const companyId = req.user!.companyId;

      const report = await reportsService.generateDailyReport(
        companyId,
        parseISO(date)
      );

      res.json(successResponse(report, 'Daily report generated successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = monthlyReportSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { month, year } = validation.data;
      const companyId = req.user!.companyId;

      const report = await reportsService.generateMonthlyReport(
        companyId,
        month,
        year
      );

      res.json(successResponse(report, 'Monthly report generated successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = customReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid request parameters', validation.error.errors));
        return;
      }

      const reportParams = validation.data;
      const companyId = req.user!.companyId;

      const customReportParams: CustomReportParams = {
        companyId,
        reportType: reportParams.reportType,
        startDate: parseISO(reportParams.startDate),
        endDate: parseISO(reportParams.endDate),
        branchId: reportParams.branchId,
        staffId: reportParams.staffId,
        serviceId: reportParams.serviceId,
        groupBy: reportParams.groupBy,
        metrics: reportParams.metrics,
        filters: reportParams.filters,
        format: reportParams.format
      };

      const report = await reportsService.generateCustomReport(customReportParams);

      res.json(successResponse(report, 'Custom report generated successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const templates = await reportsService.getReportTemplates(companyId);

      res.json(successResponse(templates, 'Report templates retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export daily report
   */
  async exportDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = dailyReportSchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportReportSchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { date } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      // Generate report
      const report = await reportsService.generateDailyReport(
        companyId,
        parseISO(date)
      );

      // Export report
      const result = await exportService.exportDailyReport(
        report,
        'Company Name', // Would get from company record
        exportOptions
      );

      res.json(successResponse(result, 'Daily report exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export monthly report
   */
  async exportMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = monthlyReportSchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportReportSchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { month, year } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      // Generate report
      const report = await reportsService.generateMonthlyReport(
        companyId,
        month,
        year
      );

      // Export report
      const result = await exportService.exportMonthlyReport(
        report,
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Monthly report exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export custom report
   */
  async exportCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const reportValidation = customReportSchema.safeParse(req.body);
      if (!reportValidation.success) {
        res.status(400).json(errorResponse('Invalid report parameters', reportValidation.error.errors));
        return;
      }

      const exportValidation = exportReportSchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const reportParams = reportValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      const customReportParams: CustomReportParams = {
        companyId,
        reportType: reportParams.reportType,
        startDate: parseISO(reportParams.startDate),
        endDate: parseISO(reportParams.endDate),
        branchId: reportParams.branchId,
        staffId: reportParams.staffId,
        serviceId: reportParams.serviceId,
        groupBy: reportParams.groupBy,
        metrics: reportParams.metrics,
        filters: reportParams.filters,
        format: reportParams.format
      };

      // Generate report
      const report = await reportsService.generateCustomReport(customReportParams);

      // Export report
      const result = await exportService.exportCustomReport(
        report,
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Custom report exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get report history
   */
  async getReportHistory(req: Request, res: Response): Promise<void> {
    try {
      const validation = z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: z.enum(['daily', 'monthly', 'custom']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { page, limit, type, startDate, endDate } = validation.data;

      // For now, return mock data - in production, this would query a reports history table
      const mockHistory = [
        {
          id: '1',
          name: 'Daily Report - 2024-01-15',
          type: 'daily',
          generatedAt: '2024-01-15T10:00:00Z',
          parameters: { date: '2024-01-15' },
          status: 'completed',
          downloadUrl: '/api/v1/reports/download/daily-2024-01-15.pdf'
        },
        {
          id: '2',
          name: 'Monthly Report - January 2024',
          type: 'monthly',
          generatedAt: '2024-02-01T09:00:00Z',
          parameters: { month: 1, year: 2024 },
          status: 'completed',
          downloadUrl: '/api/v1/reports/download/monthly-2024-01.pdf'
        },
        {
          id: '3',
          name: 'Revenue Analytics Report',
          type: 'custom',
          generatedAt: '2024-01-20T14:30:00Z',
          parameters: { reportType: 'revenue', startDate: '2024-01-01', endDate: '2024-01-31' },
          status: 'completed',
          downloadUrl: '/api/v1/reports/download/revenue-analytics-2024-01.xlsx'
        }
      ];

      const filteredHistory = mockHistory.filter(report => {
        if (type && report.type !== type) return false;
        if (startDate && report.generatedAt < startDate) return false;
        if (endDate && report.generatedAt > endDate) return false;
        return true;
      });

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedHistory = filteredHistory.slice(start, end);

      const response = {
        data: paginatedHistory,
        pagination: {
          page,
          limit,
          total: filteredHistory.length,
          pages: Math.ceil(filteredHistory.length / limit),
          hasNext: end < filteredHistory.length,
          hasPrev: start > 0
        }
      };

      res.json(successResponse(response, 'Report history retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Schedule report generation
   */
  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = z.object({
        reportType: z.enum(['daily', 'monthly', 'custom']),
        schedule: z.string(), // Cron expression
        parameters: z.record(z.any()),
        exportFormat: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
        recipients: z.array(z.string().email()).min(1),
        isActive: z.boolean().default(true)
      }).safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid request parameters', validation.error.errors));
        return;
      }

      const scheduleData = validation.data;
      const companyId = req.user!.companyId;

      // For now, return mock response - in production, this would store in database and set up cron job
      const scheduledReport = {
        id: `schedule_${Date.now()}`,
        companyId,
        reportType: scheduleData.reportType,
        schedule: scheduleData.schedule,
        parameters: scheduleData.parameters,
        exportFormat: scheduleData.exportFormat,
        recipients: scheduleData.recipients,
        isActive: scheduleData.isActive,
        createdAt: new Date().toISOString(),
        lastRun: null,
        nextRun: this.calculateNextRun(scheduleData.schedule)
      };

      res.json(successResponse(scheduledReport, 'Report scheduled successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      // Mock data - in production, would query from database
      const scheduledReports = [
        {
          id: 'schedule_1',
          companyId,
          reportType: 'daily',
          schedule: '0 9 * * *', // Daily at 9 AM
          parameters: {},
          exportFormat: 'pdf',
          recipients: ['manager@company.com'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastRun: '2024-01-15T09:00:00Z',
          nextRun: '2024-01-16T09:00:00Z'
        },
        {
          id: 'schedule_2',
          companyId,
          reportType: 'monthly',
          schedule: '0 10 1 * *', // Monthly on 1st at 10 AM
          parameters: {},
          exportFormat: 'excel',
          recipients: ['owner@company.com', 'accountant@company.com'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastRun: '2024-01-01T10:00:00Z',
          nextRun: '2024-02-01T10:00:00Z'
        }
      ];

      res.json(successResponse(scheduledReports, 'Scheduled reports retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const validation = z.object({
        schedule: z.string().optional(),
        parameters: z.record(z.any()).optional(),
        exportFormat: z.enum(['pdf', 'excel', 'csv']).optional(),
        recipients: z.array(z.string().email()).optional(),
        isActive: z.boolean().optional()
      }).safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid request parameters', validation.error.errors));
        return;
      }

      const updateData = validation.data;

      // Mock response - in production, would update database record
      const updatedSchedule = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
        nextRun: updateData.schedule ? this.calculateNextRun(updateData.schedule) : undefined
      };

      res.json(successResponse(updatedSchedule, 'Scheduled report updated successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Mock response - in production, would delete from database and cancel cron job
      res.json(successResponse(null, 'Scheduled report deleted successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get report download
   */
  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.params;

      const fileInfo = await exportService.getExportFile(fileName);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.sendFile(fileInfo.filePath);
    } catch (error: any) {
      if (error.message === 'Export file not found') {
        res.status(404).json(errorResponse('File not found'));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * Get report insights
   */
  async getReportInsights(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      // Mock insights - in production, would analyze report generation patterns
      const insights = {
        mostGeneratedReports: [
          { type: 'daily', count: 45, percentage: 60 },
          { type: 'monthly', count: 20, percentage: 26.7 },
          { type: 'custom', count: 10, percentage: 13.3 }
        ],
        popularExportFormats: [
          { format: 'pdf', count: 50, percentage: 66.7 },
          { format: 'excel', count: 20, percentage: 26.7 },
          { format: 'csv', count: 5, percentage: 6.6 }
        ],
        reportGenerationTrends: [
          { month: '2024-01', count: 25 },
          { month: '2024-02', count: 30 },
          { month: '2024-03', count: 28 }
        ],
        averageGenerationTime: '2.5 seconds',
        totalReportsGenerated: 75,
        scheduledReportsActive: 2,
        lastGeneratedReport: {
          type: 'daily',
          date: '2024-01-15',
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      res.json(successResponse(insights, 'Report insights retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  // Helper methods

  private calculateNextRun(cronExpression: string): string {
    // Simplified - in production, would use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
    return nextRun.toISOString();
  }
}

export const reportsController = new ReportsController();