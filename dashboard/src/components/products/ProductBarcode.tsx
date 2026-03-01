import React from 'react';
import Barcode from 'react-barcode';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  Print,
  Download,
  Close,
  QrCode,
} from '@mui/icons-material';

interface ProductBarcodeProps {
  barcode: string;
  productName: string;
  price?: number;
  currency?: string;
  showDialog?: boolean;
  onClose?: () => void;
}

const ProductBarcode: React.FC<ProductBarcodeProps> = ({
  barcode,
  productName,
  price,
  currency = 'EGP',
  showDialog = false,
  onClose,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode - ${productName}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .barcode-container {
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .product-name {
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: bold;
              }
              .price {
                font-size: 18px;
                margin-top: 10px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <div class="product-name">${productName}</div>
              <svg id="barcode"></svg>
              ${price ? `<div class="price">${currency} ${price}</div>` : ''}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <script>
              JsBarcode("#barcode", "${barcode}", {
                format: "CODE128",
                width: 2,
                height: 80,
                displayValue: true,
                fontSize: 14,
                margin: 10
              });
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector('#barcode-svg canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `barcode-${barcode}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  const barcodeContent = (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {productName}
      </Typography>
      
      <Box id="barcode-svg" sx={{ my: 2 }}>
        <Barcode
          value={barcode}
          format="CODE128"
          width={2}
          height={80}
          displayValue={true}
          fontSize={14}
          margin={10}
        />
      </Box>

      {price && (
        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
          {currency} {price}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<Print />}
          onClick={handlePrint}
        >
          {isRTL ? 'طباعة' : 'Print'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownload}
        >
          {isRTL ? 'تحميل' : 'Download'}
        </Button>
      </Box>
    </Box>
  );

  if (showDialog) {
    return (
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode />
              <Typography>
                {isRTL ? 'الباركود' : 'Barcode'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {barcodeContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardContent>
        {barcodeContent}
      </CardContent>
    </Card>
  );
};

export default ProductBarcode;