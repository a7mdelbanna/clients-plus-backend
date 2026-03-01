export type PageSize = 'A4' | 'Letter' | 'A5';
export type PageOrientation = 'portrait' | 'landscape';
export type TextAlignment = 'left' | 'center' | 'right';
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'QR';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LabelSpacing {
  horizontal: number;
  vertical: number;
}

export interface ElementSettings {
  visible: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  color: string;
  alignment: TextAlignment;
  marginTop?: number;
  marginBottom?: number;
}

export interface BarcodeSettings extends Omit<ElementSettings, 'fontSize' | 'fontFamily'> {
  format: BarcodeFormat;
  width: number;
  height: number;
  displayValue: boolean;
  textPosition: 'top' | 'bottom' | 'none';
  textSize: number;
}

export interface CustomFieldSettings extends ElementSettings {
  fieldName: string;
  fieldValue: string;
}

export interface LabelLayout {
  pageSize: PageSize;
  orientation: PageOrientation;
  labelsPerRow: number;
  labelsPerColumn: number;
  margins: PageMargins;
  spacing: LabelSpacing;
}

export interface LabelDesign {
  width: number;
  height: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  padding: number;
  elements: {
    productName: ElementSettings;
    barcode: BarcodeSettings;
    price: ElementSettings;
    sku: ElementSettings;
    category?: ElementSettings;
    customFields: CustomFieldSettings[];
  };
}

export interface LabelTemplate {
  id: string;
  name: string;
  companyId: string;
  userId: string;
  isDefault: boolean;
  layout: LabelLayout;
  labelDesign: LabelDesign;
  createdAt: any;
  updatedAt: any;
}

export interface PrintableProduct {
  id: string;
  name: string;
  nameAr?: string;
  barcode: string;
  sku: string;
  price: number;
  categoryName?: string;
  quantity: number; // How many labels to print for this product
  customFields?: Record<string, string>;
}

export interface PrintJob {
  products: PrintableProduct[];
  template: LabelTemplate;
  fillStrategy: 'row' | 'column';
  groupByCategory: boolean;
  testMode: boolean;
}

// Preset templates
export const PRESET_TEMPLATES: Partial<LabelTemplate>[] = [
  {
    name: 'Standard Price Labels (30 per sheet)',
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      labelsPerRow: 3,
      labelsPerColumn: 10,
      margins: { top: 13, right: 8, bottom: 13, left: 8 },
      spacing: { horizontal: 2.5, vertical: 0 },
    },
    labelDesign: {
      width: 63.5,
      height: 25.4,
      borderRadius: 2,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: '#ffffff',
      padding: 2,
      elements: {
        productName: {
          visible: true,
          fontSize: 10,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          color: '#000000',
          alignment: 'center',
          marginTop: 1,
          marginBottom: 2,
        },
        barcode: {
          visible: true,
          format: 'CODE128',
          width: 1.5,
          height: 35,
          displayValue: true,
          textPosition: 'bottom',
          textSize: 8,
          color: '#000000',
          alignment: 'center',
          fontWeight: 'normal',
        },
        price: {
          visible: true,
          fontSize: 12,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          color: '#000000',
          alignment: 'center',
          marginTop: 2,
        },
        sku: {
          visible: false,
          fontSize: 8,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          color: '#666666',
          alignment: 'center',
        },
        customFields: [],
      },
    },
  },
  {
    name: 'Large Labels (8 per sheet)',
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      labelsPerRow: 2,
      labelsPerColumn: 4,
      margins: { top: 15, right: 10, bottom: 15, left: 10 },
      spacing: { horizontal: 5, vertical: 5 },
    },
    labelDesign: {
      width: 90,
      height: 60,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#cccccc',
      backgroundColor: '#ffffff',
      padding: 5,
      elements: {
        productName: {
          visible: true,
          fontSize: 14,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          color: '#000000',
          alignment: 'center',
          marginTop: 3,
          marginBottom: 5,
        },
        barcode: {
          visible: true,
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          textPosition: 'bottom',
          textSize: 10,
          color: '#000000',
          alignment: 'center',
          fontWeight: 'normal',
        },
        price: {
          visible: true,
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          color: '#000000',
          alignment: 'center',
          marginTop: 5,
        },
        sku: {
          visible: true,
          fontSize: 10,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          color: '#666666',
          alignment: 'center',
          marginTop: 2,
        },
        customFields: [],
      },
    },
  },
  {
    name: 'Small Inventory Labels (65 per sheet)',
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      labelsPerRow: 5,
      labelsPerColumn: 13,
      margins: { top: 10, right: 5, bottom: 10, left: 5 },
      spacing: { horizontal: 2, vertical: 2 },
    },
    labelDesign: {
      width: 38,
      height: 18,
      borderRadius: 0,
      borderWidth: 0.5,
      borderColor: '#dddddd',
      backgroundColor: '#ffffff',
      padding: 1,
      elements: {
        productName: {
          visible: true,
          fontSize: 7,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          color: '#000000',
          alignment: 'center',
          marginBottom: 1,
        },
        barcode: {
          visible: true,
          format: 'CODE128',
          width: 1,
          height: 25,
          displayValue: false,
          textPosition: 'none',
          textSize: 6,
          color: '#000000',
          alignment: 'center',
          fontWeight: 'normal',
        },
        price: {
          visible: false,
          fontSize: 8,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          color: '#000000',
          alignment: 'center',
        },
        sku: {
          visible: true,
          fontSize: 6,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          color: '#333333',
          alignment: 'center',
          marginTop: 1,
        },
        customFields: [],
      },
    },
  },
];