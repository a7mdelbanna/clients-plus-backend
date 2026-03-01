import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Alert as MuiAlert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Warning,
  ErrorOutline,
  CheckCircle,
  Refresh,
  ShoppingCart,
} from '@mui/icons-material';
import apiClient from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import { toDate } from '../../utils/dateUtils';
import type { StockAlert } from '../../types/product.types';

interface LowStockAlertsProps {
  alerts: StockAlert[];
  onRefresh: () => void;
}

export default function LowStockAlerts({ alerts, onRefresh }: LowStockAlertsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMarkAsRead = async (alertId: string) => {
    if (!user?.companyId) return;

    try {
      await apiClient.patch(`/inventory/alerts/${alertId}`, { isRead: true });
      onRefresh();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!user?.companyId) return;

    try {
      await apiClient.patch(`/inventory/alerts/${alertId}`, {
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.uid,
      });
      onRefresh();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleCreateOrder = async () => {
    // This would create a purchase order
    // For now, just close the dialog
    setOrderDialogOpen(false);
    setSelectedAlert(null);
    setOrderQuantity('');
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <ErrorOutline color="error" />;
      case 'medium':
        return <Warning color="warning" />;
      default:
        return <Warning color="info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };

  if (alerts.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isRTL ? 'لا توجد تنبيهات' : 'No Alerts'}
        </Typography>
        <Typography color="text.secondary">
          {isRTL ? 'جميع مستويات المخزون جيدة' : 'All stock levels are good'}
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={onRefresh}
          sx={{ mt: 2 }}
        >
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Summary */}
      <MuiAlert severity="warning" sx={{ mb: 3 }}>
        <Typography>
          {isRTL 
            ? `لديك ${alerts.length} تنبيه مخزون يحتاج إلى انتباهك`
            : `You have ${alerts.length} stock alert(s) that need your attention`
          }
        </Typography>
      </MuiAlert>

      {/* Alerts List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            sx={{
              border: 1,
              borderColor: alpha(getSeverityColor(alert.severity), 0.3),
              bgcolor: alpha(getSeverityColor(alert.severity), 0.05),
              opacity: alert.isRead ? 0.7 : 1,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {/* Icon */}
                <Box sx={{ mt: 0.5 }}>
                  {getSeverityIcon(alert.severity)}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {isRTL ? alert.messageAr : alert.message}
                    </Typography>
                    <Chip
                      label={alert.type}
                      size="small"
                      color={alert.severity === 'high' ? 'error' : 'warning'}
                    />
                    {!alert.isRead && (
                      <Chip
                        label={isRTL ? 'جديد' : 'New'}
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {isRTL ? 'المنتج:' : 'Product:'} {alert.productId}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                    <Typography variant="body2">
                      {isRTL ? 'الكمية الحالية:' : 'Current Quantity:'}{' '}
                      <strong>{alert.currentQuantity}</strong>
                    </Typography>
                    <Typography variant="body2">
                      {isRTL ? 'الحد الأدنى:' : 'Minimum:'}{' '}
                      <strong>{alert.threshold}</strong>
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {toDate(alert.createdAt)?.toLocaleString()}
                  </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {!alert.isRead && (
                    <Button
                      size="small"
                      onClick={() => handleMarkAsRead(alert.id!)}
                    >
                      {isRTL ? 'تم القراءة' : 'Mark Read'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ShoppingCart />}
                    onClick={() => {
                      setSelectedAlert(alert);
                      setOrderDialogOpen(true);
                    }}
                  >
                    {isRTL ? 'طلب شراء' : 'Order'}
                  </Button>
                  {!alert.isResolved && (
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleResolve(alert.id!)}
                    >
                      {isRTL ? 'تم الحل' : 'Resolve'}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Create Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isRTL ? 'إنشاء طلب شراء' : 'Create Purchase Order'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <MuiAlert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {isRTL 
                  ? 'سيتم إنشاء طلب شراء لهذا المنتج'
                  : 'A purchase order will be created for this product'
                }
              </Typography>
            </MuiAlert>

            <TextField
              fullWidth
              label={isRTL ? 'الكمية المطلوبة' : 'Order Quantity'}
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              helperText={
                selectedAlert && 
                `${isRTL ? 'الكمية المقترحة:' : 'Suggested:'} ${
                  selectedAlert.threshold - selectedAlert.currentQuantity + 10
                }`
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleCreateOrder}
            variant="contained"
            disabled={!orderQuantity || loading}
          >
            {isRTL ? 'إنشاء طلب' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}