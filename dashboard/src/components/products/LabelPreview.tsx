import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Barcode from 'react-barcode';
import type { LabelTemplate, PrintableProduct } from '../../types/labelPrinting.types';
import type { LayoutCalculation } from '../../utils/labelLayoutCalculator';
import { calculateGridCSS } from '../../utils/labelLayoutCalculator';

interface LabelPreviewProps {
  template: LabelTemplate;
  products: PrintableProduct[];
  pageProducts: Array<{ productId: string; labelIndex: number }>;
  layoutCalculation: LayoutCalculation;
  className?: string;
}

interface SingleLabelProps {
  product: PrintableProduct;
  template: LabelTemplate;
  layoutCalculation: LayoutCalculation;
}

const SingleLabel: React.FC<SingleLabelProps> = ({ product, template, layoutCalculation }) => {
  const { labelDesign } = template;
  const isRTL = true; // Assuming RTL for Arabic support

  const labelStyle = {
    width: `${layoutCalculation.labelWidth}mm`,
    height: `${layoutCalculation.labelHeight}mm`,
    backgroundColor: labelDesign.backgroundColor,
    border: `${labelDesign.borderWidth}px solid ${labelDesign.borderColor}`,
    borderRadius: `${labelDesign.borderRadius}px`,
    padding: `${labelDesign.padding}mm`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    fontSize: '8px', // Base font size for preview
  };

  const getElementStyle = (element: any) => ({
    fontFamily: element.fontFamily || 'Arial',
    fontSize: `${Math.max(6, element.fontSize * 0.8)}px`, // Scale down for preview
    fontWeight: element.fontWeight,
    color: element.color,
    textAlign: element.alignment as any,
    marginTop: element.marginTop ? `${element.marginTop}mm` : undefined,
    marginBottom: element.marginBottom ? `${element.marginBottom}mm` : undefined,
    direction: isRTL ? 'rtl' : 'ltr',
  });

  return (
    <Box sx={labelStyle}>
      {/* Product Name */}
      {labelDesign.elements.productName.visible && (
        <Typography
          variant="caption"
          sx={{
            ...getElementStyle(labelDesign.elements.productName),
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isRTL && product.nameAr ? product.nameAr : product.name}
        </Typography>
      )}

      {/* Barcode */}
      {labelDesign.elements.barcode.visible && product.barcode && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%',
          maxWidth: '100%',
        }}>
          <Barcode
            value={product.barcode}
            format={labelDesign.elements.barcode.format as any}
            width={Math.max(0.5, labelDesign.elements.barcode.width * 0.5)} // Scale down
            height={Math.max(15, labelDesign.elements.barcode.height * 0.6)} // Scale down
            displayValue={labelDesign.elements.barcode.displayValue}
            fontSize={Math.max(6, labelDesign.elements.barcode.textSize * 0.8)}
            textPosition={labelDesign.elements.barcode.textPosition as any}
            margin={2}
            background="transparent"
            lineColor={labelDesign.elements.barcode.color}
          />
        </Box>
      )}

      {/* Price */}
      {labelDesign.elements.price.visible && (
        <Typography
          variant="caption"
          sx={{
            ...getElementStyle(labelDesign.elements.price),
            width: '100%',
            textAlign: 'center',
          }}
        >
          {product.price} EGP
        </Typography>
      )}

      {/* SKU */}
      {labelDesign.elements.sku.visible && (
        <Typography
          variant="caption"
          sx={{
            ...getElementStyle(labelDesign.elements.sku),
            width: '100%',
            fontSize: '6px', // Even smaller for SKU
          }}
        >
          {product.sku}
        </Typography>
      )}

      {/* Category */}
      {labelDesign.elements.category?.visible && product.categoryName && (
        <Typography
          variant="caption"
          sx={{
            ...getElementStyle(labelDesign.elements.category),
            width: '100%',
            fontSize: '6px',
          }}
        >
          {product.categoryName}
        </Typography>
      )}
    </Box>
  );
};

const LabelPreview: React.FC<LabelPreviewProps> = ({
  template,
  products,
  pageProducts,
  layoutCalculation,
  className,
}) => {
  const theme = useTheme();

  const gridStyle = {
    ...calculateGridCSS(template.layout, layoutCalculation),
    display: 'grid',
    gridTemplateColumns: `repeat(${template.layout.labelsPerRow}, 1fr)`,
    gridTemplateRows: `repeat(${template.layout.labelsPerColumn}, 1fr)`,
    gap: `${template.layout.spacing.vertical}mm ${template.layout.spacing.horizontal}mm`,
    padding: `${template.layout.margins.top}mm ${template.layout.margins.right}mm ${template.layout.margins.bottom}mm ${template.layout.margins.left}mm`,
    width: `${layoutCalculation.pageWidth}mm`,
    height: `${layoutCalculation.pageHeight}mm`,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    boxSizing: 'border-box' as const,
  };

  // Create a map for quick product lookup
  const productsMap = new Map(products.map(p => [p.id, p]));

  return (
    <Box
      className={`${className || ''} print-area`}
      sx={{
        ...gridStyle,
        '@media print': {
          width: `${layoutCalculation.pageWidth}mm !important`,
          height: `${layoutCalculation.pageHeight}mm !important`,
          margin: '0 !important',
          padding: `${template.layout.margins.top}mm ${template.layout.margins.right}mm ${template.layout.margins.bottom}mm ${template.layout.margins.left}mm !important`,
          border: 'none !important',
          boxShadow: 'none !important',
        },
      }}
    >
      {Array.from({ length: layoutCalculation.totalLabels }).map((_, index) => {
        const pageProduct = pageProducts.find(pp => pp.labelIndex === index);
        const product = pageProduct ? productsMap.get(pageProduct.productId) : null;

        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: `${layoutCalculation.labelHeight}mm`,
              border: product ? 'none' : '1px dashed #ccc',
              borderRadius: '2px',
              '@media print': {
                border: 'none !important',
              },
            }}
          >
            {product ? (
              <SingleLabel
                product={product}
                template={template}
                layoutCalculation={layoutCalculation}
              />
            ) : (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontSize: '10px',
                  '@media print': {
                    display: 'none',
                  },
                }}
              >
                Empty
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default LabelPreview;