import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  MoreVert,
  CalendarToday,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { MonthSchedule, WeekSchedule, ViewMode } from '../../../../services/workSchedule.service';
import ScheduleEditDialog from './ScheduleEditDialog';

interface ScheduleCalendarProps {
  schedule: MonthSchedule | WeekSchedule;
  viewMode: ViewMode;
  currentDate: Date;
  onScheduleUpdate: () => void;
  companyId: string;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedule,
  viewMode,
  currentDate,
  onScheduleUpdate,
  companyId,
}) => {
  const theme = useTheme();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    employeeId: string;
    employeeName: string;
    date: Date;
    dayName: string;
    existingSchedule?: { startTime: string; endTime: string; };
  } | null>(null);
  
  // Always show 7 days for better readability
  const maxDaysToShow = 7;
  // Ensure we have exactly 7 days, even if the schedule has fewer
  const daysToDisplay = schedule.days.length >= maxDaysToShow 
    ? schedule.days.slice(0, maxDaysToShow)
    : schedule.days;

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 5 || day === 6; // Friday or Saturday
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatTime = (time: string) => {
    return time; // Already in HH:MM format
  };

  const renderScheduleBlock = (employeeId: string, dayIndex: number) => {
    const daySchedule = daysToDisplay[dayIndex];
    if (!daySchedule) return null;

    const employeeSchedule = daySchedule.employees.find(e => e.employeeId === employeeId);
    
    if (!employeeSchedule) {
      return (
        <TableCell 
          key={dayIndex} 
          sx={{ 
            p: 0.5,
            minWidth: 90,
            width: '12.5%',
            cursor: 'pointer',
            borderLeft: dayIndex === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
            transition: 'all 0.2s',
            '&:hover': { 
              backgroundColor: theme.palette.action.hover,
              '&::after': {
                content: '"\u002B"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '1.5rem',
                color: theme.palette.primary.main,
                fontWeight: 'bold',
              },
            },
            position: 'relative',
            '@media (max-width: 768px)': {
              minWidth: 70,
              p: 0.25,
            },
          }}
          onClick={() => {
            const date = new Date(daysToDisplay[dayIndex].date);
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[date.getDay()];
            const employeeName = schedule.employeeTotals[employeeId]?.name || 'موظف';
            
            setEditDialog({
              open: true,
              employeeId,
              employeeName,
              date,
              dayName,
            });
          }}
        />
      );
    }

    return (
      <TableCell 
        key={dayIndex} 
        sx={{ 
          p: 0.5, 
          minWidth: 90,
          width: '12.5%',
          borderLeft: dayIndex === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
          '@media (max-width: 768px)': {
            minWidth: 70,
            p: 0.25,
          },
        }}
        onMouseEnter={() => setHoveredCell(`${employeeId}-${dayIndex}`)}
        onMouseLeave={() => setHoveredCell(null)}
      >
        <Tooltip title={`${employeeSchedule.totalHours} ساعة`}>
          <Box
            sx={{
              backgroundColor: '#4CAF50',
              color: 'white',
              borderRadius: 1,
              p: 0.75,
              minHeight: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.7rem',
              boxShadow: theme.shadows[1],
              '&:hover': {
                backgroundColor: '#45a049',
                transform: 'scale(1.05)',
                boxShadow: theme.shadows[3],
                '&::after': {
                  content: '"✎"',
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  fontSize: '0.75rem',
                  color: 'white',
                },
              },
              position: 'relative',
              '@media (max-width: 768px)': {
                p: 0.5,
                minHeight: 28,
                fontSize: '0.6rem',
              },
            }}
            onClick={() => {
              const date = new Date(daysToDisplay[dayIndex].date);
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const dayName = dayNames[date.getDay()];
              const employeeName = schedule.employeeTotals[employeeId]?.name || 'موظف';
              
              setEditDialog({
                open: true,
                employeeId,
                employeeName,
                date,
                dayName,
                existingSchedule: {
                  startTime: employeeSchedule.startTime,
                  endTime: employeeSchedule.endTime,
                },
              });
            }}
          >
            <Typography variant="caption" sx={{ 
              fontWeight: 600, 
              fontSize: '0.7rem', 
              lineHeight: 1.1,
              '@media (max-width: 768px)': {
                fontSize: '0.6rem',
              },
            }}>
              {formatTime(employeeSchedule.startTime)}-{formatTime(employeeSchedule.endTime)}
            </Typography>
          </Box>
        </Tooltip>
      </TableCell>
    );
  };

  const renderDayHeaders = () => {
    const headers = [];
    
    // Day headers - show only 7 days for better readability
    daysToDisplay.forEach((day, index) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
      const dayNumber = date.getDate();
      const isWeekendDay = isWeekend(date);
      const isTodayDate = isToday(date);

      headers.push(
        <TableCell 
          key={index} 
          align="center" 
          sx={{ 
            backgroundColor: isTodayDate ? theme.palette.warning.light : 
                           isWeekendDay ? (theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100]) : 'transparent',
            minWidth: 90,
            width: '12.5%',
            p: 1,
            borderLeft: index === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
            '@media (max-width: 768px)': {
              minWidth: 70,
              p: 0.75,
            },
          }}
        >
          <Typography variant="h6" sx={{ 
            display: 'block', 
            fontSize: '1.1rem', 
            fontWeight: 700,
            mb: 0.25,
            color: isTodayDate ? theme.palette.warning.dark : 
                   (isWeekendDay && theme.palette.mode === 'dark') ? theme.palette.error.light : 'inherit',
            '@media (max-width: 768px)': {
              fontSize: '0.9rem',
            },
          }}>
            {dayNumber}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              color: isWeekendDay ? 'error.main' : 'text.secondary',
              fontWeight: isTodayDate ? 600 : 500,
              fontSize: '0.7rem',
              '@media (max-width: 768px)': {
                fontSize: '0.6rem',
              },
            }}
          >
            {dayName}
          </Typography>
        </TableCell>
      );
    });

    return headers;
  };

  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        minWidth: 0, // Prevent flex item from overflowing
      }}
    >
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2,
          flex: 1,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: theme.shadows[1],
          border: `1px solid ${theme.palette.divider}`,
          '&::-webkit-scrollbar': {
            height: 10,
            width: 10,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: 5,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.primary.main,
            borderRadius: 5,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
          // Mobile optimizations
          '@media (max-width: 768px)': {
            '&::-webkit-scrollbar': {
              height: 6,
            },
          },
        }}
      >
      <Table stickyHeader sx={{ 
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: 0,
      }}>
        <TableHead>
          <TableRow>
            {/* Staff header */}
            <TableCell 
              sx={{ 
                backgroundColor: theme.palette.background.paper, 
                minWidth: 140,
                width: '140px',
                position: 'sticky',
                left: 0,
                zIndex: 2,
                borderRight: `2px solid ${theme.palette.divider}`,
                '@media (max-width: 768px)': {
                  minWidth: 110,
                  width: '110px',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  الموظفين
                </Typography>
                <Chip 
                  label={Object.keys(schedule.employeeTotals).length} 
                  size="small" 
                  color="warning"
                  sx={{ height: 20, fontWeight: 600, fontSize: '0.7rem' }}
                />
              </Box>
            </TableCell>
            {renderDayHeaders()}
            {/* Week total header */}
            <TableCell sx={{ 
              fontWeight: 600, 
              minWidth: 80, 
              width: '80px',
              p: 1, 
              fontSize: '0.75rem',
              backgroundColor: theme.palette.action.hover,
              '@media (max-width: 768px)': {
                minWidth: 60,
                width: '60px',
                p: 0.75,
                fontSize: '0.65rem',
              },
            }}>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>مجموع</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                  الأسبوع
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(schedule.employeeTotals).map(([employeeId, employeeData], index) => (
            <motion.tr
              key={employeeId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Employee info cell */}
              <TableCell 
                sx={{ 
                  backgroundColor: theme.palette.background.default,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  borderRight: `2px solid ${theme.palette.divider}`,
                  minWidth: 140,
                  width: '140px',
                  p: 1,
                  '@media (max-width: 768px)': {
                    minWidth: 110,
                    width: '110px',
                    p: 0.75,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32,
                      fontSize: '0.8rem',
                      backgroundColor: theme.palette.primary.main,
                      '@media (max-width: 768px)': {
                        width: 28,
                        height: 28,
                        fontSize: '0.7rem',
                      },
                    }}>
                      {employeeData.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '80px',
                        '@media (max-width: 768px)': {
                          fontSize: '0.7rem',
                          maxWidth: '60px',
                        },
                      }}>
                        {employeeData.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <CalendarToday sx={{ fontSize: 10, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {employeeData.scheduledDays}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          ({employeeData.totalHours}س)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ padding: 0.25 }}>
                    <MoreVert sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </TableCell>

              {/* Schedule cells - show only 7 days */}
              {daysToDisplay.map((_, dayIndex) => renderScheduleBlock(employeeId, dayIndex))}
              
              {/* Employee total cell */}
              <TableCell 
                align="center"
                sx={{ 
                  backgroundColor: theme.palette.action.hover,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  p: 1,
                  '@media (max-width: 768px)': {
                    fontSize: '0.65rem',
                    p: 0.75,
                  },
                }}
              >
                {employeeData.totalHours} س
              </TableCell>
            </motion.tr>
          ))}
          
          {/* Total row */}
          <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
            <TableCell 
              sx={{ 
                fontWeight: 600,
                position: 'sticky',
                left: 0,
                zIndex: 1,
                backgroundColor: theme.palette.action.hover,
                borderRight: `2px solid ${theme.palette.divider}`,
                p: 1,
                '@media (max-width: 768px)': {
                  p: 0.75,
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>المجموع</Typography>
            </TableCell>
            {daysToDisplay.map((day, index) => {
              const dayTotal = day.employees.reduce((sum, emp) => sum + emp.totalHours, 0);
              return (
                <TableCell 
                  key={index} 
                  align="center"
                  sx={{ 
                    p: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderLeft: index === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
                    '@media (max-width: 768px)': {
                      p: 0.75,
                      fontSize: '0.65rem',
                    },
                  }}
                >
                  {dayTotal > 0 && `${dayTotal} س`}
                </TableCell>
              );
            })}
            <TableCell 
              align="center"
              sx={{ 
                fontWeight: 700,
                fontSize: '0.875rem',
                p: 1,
                '@media (max-width: 768px)': {
                  fontSize: '0.75rem',
                  p: 0.75,
                },
              }}
            >
              {schedule.totalHours} س
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
      
      {/* Schedule Edit Dialog */}
      {editDialog && (
        <ScheduleEditDialog
          open={editDialog.open}
          onClose={() => setEditDialog(null)}
          employeeId={editDialog.employeeId}
          employeeName={editDialog.employeeName}
          date={editDialog.date}
          dayName={editDialog.dayName}
          existingSchedule={editDialog.existingSchedule}
          companyId={companyId}
          onScheduleUpdate={onScheduleUpdate}
        />
      )}
    </Box>
  );
};

export default ScheduleCalendar;