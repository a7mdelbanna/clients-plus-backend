declare module 'react-barcode' {
  import { ComponentType } from 'react';

  interface BarcodeProps {
    value: string;
    format?: 
      | 'CODE128'
      | 'CODE39'
      | 'EAN13'
      | 'EAN8'
      | 'UPC'
      | 'ITF14'
      | 'MSI'
      | 'pharmacode'
      | 'codabar';
    width?: number;
    height?: number;
    displayValue?: boolean;
    text?: string;
    fontOptions?: string;
    font?: string;
    textAlign?: 'left' | 'center' | 'right';
    textPosition?: 'top' | 'bottom';
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    flat?: boolean;
    renderer?: 'svg' | 'canvas' | 'img';
  }

  const Barcode: ComponentType<BarcodeProps>;
  export default Barcode;
}