import type { LabelLayout, PageSize, PageOrientation } from '../types/labelPrinting.types';

// Page dimensions in mm
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
};

export interface LayoutCalculation {
  pageWidth: number;
  pageHeight: number;
  printableWidth: number;
  printableHeight: number;
  labelWidth: number;
  labelHeight: number;
  totalLabels: number;
  actualLabelsPerRow: number;
  actualLabelsPerColumn: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function calculateLabelLayout(layout: LabelLayout): LayoutCalculation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get page dimensions
  const pageDimensions = PAGE_SIZES[layout.pageSize];
  let pageWidth = pageDimensions.width;
  let pageHeight = pageDimensions.height;

  // Swap dimensions for landscape
  if (layout.orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  // Calculate printable area
  const printableWidth = pageWidth - layout.margins.left - layout.margins.right;
  const printableHeight = pageHeight - layout.margins.top - layout.margins.bottom;

  // Validate margins
  if (printableWidth <= 0) {
    errors.push('Horizontal margins are too large for the page size');
  }
  if (printableHeight <= 0) {
    errors.push('Vertical margins are too large for the page size');
  }

  // Calculate label dimensions
  const totalHorizontalSpacing = layout.spacing.horizontal * (layout.labelsPerRow - 1);
  const totalVerticalSpacing = layout.spacing.vertical * (layout.labelsPerColumn - 1);

  const labelWidth = (printableWidth - totalHorizontalSpacing) / layout.labelsPerRow;
  const labelHeight = (printableHeight - totalVerticalSpacing) / layout.labelsPerColumn;

  // Validate label dimensions
  if (labelWidth < 10) {
    errors.push('Label width is too small (minimum 10mm)');
  }
  if (labelHeight < 10) {
    errors.push('Label height is too small (minimum 10mm)');
  }

  // Check printer margins (most printers can't print within 3-5mm of edges)
  const minPrinterMargin = 3;
  if (layout.margins.top < minPrinterMargin || 
      layout.margins.bottom < minPrinterMargin ||
      layout.margins.left < minPrinterMargin ||
      layout.margins.right < minPrinterMargin) {
    warnings.push(`Margins less than ${minPrinterMargin}mm may not print correctly on some printers`);
  }

  // Calculate actual labels that fit
  const actualLabelsPerRow = Math.floor((printableWidth + layout.spacing.horizontal) / 
                                       (labelWidth + layout.spacing.horizontal));
  const actualLabelsPerColumn = Math.floor((printableHeight + layout.spacing.vertical) / 
                                          (labelHeight + layout.spacing.vertical));

  if (actualLabelsPerRow < layout.labelsPerRow) {
    errors.push(`Only ${actualLabelsPerRow} labels fit per row instead of ${layout.labelsPerRow}`);
  }
  if (actualLabelsPerColumn < layout.labelsPerColumn) {
    errors.push(`Only ${actualLabelsPerColumn} labels fit per column instead of ${layout.labelsPerColumn}`);
  }

  const totalLabels = layout.labelsPerRow * layout.labelsPerColumn;

  return {
    pageWidth,
    pageHeight,
    printableWidth,
    printableHeight,
    labelWidth: Math.round(labelWidth * 100) / 100, // Round to 2 decimals
    labelHeight: Math.round(labelHeight * 100) / 100,
    totalLabels,
    actualLabelsPerRow: Math.min(actualLabelsPerRow, layout.labelsPerRow),
    actualLabelsPerColumn: Math.min(actualLabelsPerColumn, layout.labelsPerColumn),
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function mmToPx(mm: number, dpi: number = 96): number {
  // Convert mm to pixels at given DPI
  // 1 inch = 25.4mm
  return (mm / 25.4) * dpi;
}

export function pxToMm(px: number, dpi: number = 96): number {
  // Convert pixels to mm at given DPI
  return (px * 25.4) / dpi;
}

export function calculateGridCSS(layout: LabelLayout, calculation: LayoutCalculation): Record<string, string> {
  return {
    '--page-width': `${calculation.pageWidth}mm`,
    '--page-height': `${calculation.pageHeight}mm`,
    '--margin-top': `${layout.margins.top}mm`,
    '--margin-right': `${layout.margins.right}mm`,
    '--margin-bottom': `${layout.margins.bottom}mm`,
    '--margin-left': `${layout.margins.left}mm`,
    '--labels-per-row': layout.labelsPerRow.toString(),
    '--labels-per-column': layout.labelsPerColumn.toString(),
    '--label-width': `${calculation.labelWidth}mm`,
    '--label-height': `${calculation.labelHeight}mm`,
    '--label-gap-horizontal': `${layout.spacing.horizontal}mm`,
    '--label-gap-vertical': `${layout.spacing.vertical}mm`,
  };
}

export function distributeProductsToLabels(
  products: Array<{ id: string; quantity: number }>,
  totalLabelsPerPage: number,
  fillStrategy: 'row' | 'column' = 'row'
): Array<Array<{ productId: string; labelIndex: number }>> {
  const pages: Array<Array<{ productId: string; labelIndex: number }>> = [];
  let currentPage: Array<{ productId: string; labelIndex: number }> = [];
  let currentLabelIndex = 0;

  for (const product of products) {
    for (let i = 0; i < product.quantity; i++) {
      if (currentLabelIndex >= totalLabelsPerPage) {
        pages.push(currentPage);
        currentPage = [];
        currentLabelIndex = 0;
      }

      currentPage.push({
        productId: product.id,
        labelIndex: currentLabelIndex,
      });

      currentLabelIndex++;
    }
  }

  // Add the last page if it has labels
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}