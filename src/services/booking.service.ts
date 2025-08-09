import { PrismaClient } from '@prisma/client';
import { AppointmentService, AppointmentInput } from './appointment.service';
import { AvailabilityService, TimeSlot } from './availability.service';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export interface PublicBookingData {
  companyId: string;
  branchId: string;
  
  // Client Information
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Booking Details
  serviceIds: string[];
  preferredStaffId?: string;
  date: Date;
  startTime: string;
  
  // Additional Info
  notes?: string;
  source: 'WEB' | 'APP' | 'PHONE';
  bookingLinkId?: string;
}

export interface BookingConfirmation {
  appointmentId: string;
  confirmationNumber: string;
  clientId: string;
  appointment: {
    date: Date;
    startTime: string;
    endTime: string;
    services: any[];
    staff: {
      id: string;
      name: string;
    };
    totalDuration: number;
    totalPrice: number;
  };
  business: {
    name: string;
    address?: string;
    phone?: string;
  };
  cancellationPolicy?: string;
}

export interface WaitlistEntry {
  companyId: string;
  branchId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceIds: string[];
  preferredStaffId?: string;
  preferredDate: Date;
  flexibleDates: boolean;
  notes?: string;
}

export interface BookingAvailability {
  date: string;
  availableSlots: TimeSlot[];
  fullyBooked: boolean;
  nextAvailableDate?: string;
}

export class BookingService {
  private appointmentService = new AppointmentService();
  private availabilityService = new AvailabilityService();
  
  /**
   * Get available slots for public booking
   */
  async getPublicAvailability(
    companyId: string,
    branchId: string,
    serviceIds: string[],
    date: Date,
    staffId?: string
  ): Promise<BookingAvailability> {
    try {
      // Validate that services are available for online booking
      await this.validateServicesForBooking(companyId, serviceIds);
      
      // Get available slots
      const availableSlots = await this.availabilityService.getAvailableSlots({
        branchId,
        date,
        serviceIds,
        staffId,
        duration: await this.calculateTotalDuration(serviceIds)
      });
      
      const availableSlotsFiltered = availableSlots.filter(slot => slot.available);
      const fullyBooked = availableSlotsFiltered.length === 0;
      
      let nextAvailableDate: string | undefined;
      if (fullyBooked) {
        // Find next available date within 30 days
        const nextSlot = await this.availabilityService.findNextAvailable(
          branchId,
          serviceIds,
          undefined,
          staffId
        );
        nextAvailableDate = nextSlot?.date;
      }
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        availableSlots: availableSlotsFiltered,
        fullyBooked,
        nextAvailableDate
      };
      
    } catch (error) {
      console.error('Error getting public availability:', error);
      throw error;
    }
  }
  
  /**
   * Create public booking
   */
  async createBooking(bookingData: PublicBookingData): Promise<BookingConfirmation> {
    try {
      // 1. Validate booking data
      await this.validateBookingData(bookingData);
      
      // 2. Find or create client
      const clientId = await this.findOrCreateClient(bookingData);
      
      // 3. Get service details and calculate pricing
      const services = await this.getServiceDetails(bookingData.serviceIds);
      const totalPrice = services.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
      
      // 4. Assign staff if not specified
      let assignedStaffId = bookingData.preferredStaffId;
      if (!assignedStaffId || assignedStaffId === 'any') {
        assignedStaffId = await this.assignOptimalStaff(
          bookingData.companyId,
          bookingData.branchId,
          bookingData.serviceIds,
          bookingData.date,
          bookingData.startTime,
          totalDuration
        );
      }
      
      if (!assignedStaffId) {
        throw new Error('No available staff found for the selected time');
      }
      
      // 5. Create appointment
      const appointmentInput: AppointmentInput = {
        companyId: bookingData.companyId,
        branchId: bookingData.branchId,
        clientId,
        staffId: assignedStaffId,
        
        clientName: bookingData.clientName,
        clientPhone: bookingData.clientPhone,
        clientEmail: bookingData.clientEmail,
        isNewClient: true, // Assume new for online bookings
        
        date: bookingData.date,
        startTime: bookingData.startTime,
        totalDuration,
        
        services: services.map(service => ({
          serviceId: service.id,
          serviceName: service.name,
          duration: service.duration,
          price: service.price
        })),
        totalPrice,
        
        status: 'PENDING',
        paymentStatus: 'PENDING',
        
        notes: bookingData.notes,
        source: bookingData.source === 'WEB' ? 'ONLINE' : bookingData.source,
        bookingLinkId: bookingData.bookingLinkId,
        
        notifications: [
          {
            type: 'confirmation',
            methods: ['SMS', 'EMAIL'],
          },
          {
            type: 'reminder',
            methods: ['SMS'],
            timing: 60 // 1 hour before
          }
        ]
      };
      
      const appointmentId = await this.appointmentService.createAppointment(
        appointmentInput,
        'online-booking'
      );
      
      // 6. Generate confirmation
      const confirmation = await this.generateBookingConfirmation(appointmentId);
      
      // 7. Update booking link analytics if applicable
      if (bookingData.bookingLinkId) {
        await this.updateBookingLinkAnalytics(bookingData.bookingLinkId);
      }
      
      return confirmation;
      
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }
  
  /**
   * Cancel public booking
   */
  async cancelBooking(
    appointmentId: string,
    cancellationReason?: string
  ): Promise<void> {
    try {
      await this.appointmentService.cancelAppointment(
        appointmentId,
        'client',
        cancellationReason,
        'client'
      );
      
      // TODO: Send cancellation confirmation
      // TODO: Check waitlist for this time slot
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }
  
  /**
   * Reschedule public booking
   */
  async rescheduleBooking(
    appointmentId: string,
    newDate: Date,
    newStartTime: string,
    newStaffId?: string
  ): Promise<BookingConfirmation> {
    try {
      const newAppointmentId = await this.appointmentService.rescheduleAppointment(
        appointmentId,
        newDate,
        newStartTime,
        newStaffId,
        'client'
      );
      
      return await this.generateBookingConfirmation(newAppointmentId);
      
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      throw error;
    }
  }
  
  /**
   * Add to waitlist
   */
  async addToWaitlist(waitlistData: WaitlistEntry): Promise<string> {
    try {
      // Find or create client
      const clientId = await this.findOrCreateClient({
        companyId: waitlistData.companyId,
        clientName: waitlistData.clientName,
        clientPhone: waitlistData.clientPhone,
        clientEmail: waitlistData.clientEmail
      } as PublicBookingData);
      
      const waitlistEntry = await prisma.appointmentWaitlist.create({
        data: {
          companyId: waitlistData.companyId,
          branchId: waitlistData.branchId,
          clientId,
          serviceIds: waitlistData.serviceIds,
          preferredStaffId: waitlistData.preferredStaffId,
          preferredDate: waitlistData.preferredDate,
          flexibleDates: waitlistData.flexibleDates,
          notes: waitlistData.notes,
          status: 'WAITING'
        }
      });
      
      // TODO: Set up monitoring for availability
      // TODO: Send waitlist confirmation
      
      return waitlistEntry.id;
      
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw error;
    }
  }
  
  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(waitlistId: string): Promise<void> {
    try {
      await prisma.appointmentWaitlist.update({
        where: { id: waitlistId },
        data: { status: 'CANCELLED' }
      });
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      throw error;
    }
  }
  
  /**
   * Get client bookings
   */
  async getClientBookings(
    companyId: string,
    clientPhone: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Find client by phone
      const client = await prisma.client.findFirst({
        where: {
          companyId,
          phone: clientPhone
        }
      });
      
      if (!client) {
        return [];
      }
      
      // Get appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          companyId,
          clientId: client.id
        },
        include: {
          staff: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        },
        orderBy: {
          date: 'desc'
        },
        take: limit
      });
      
      return appointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        services: apt.services,
        staff: apt.staff,
        branch: apt.branch,
        status: apt.status,
        totalPrice: apt.totalPrice,
        canCancel: this.canCancelBooking(apt.date, apt.startTime),
        canReschedule: this.canRescheduleBooking(apt.date, apt.startTime)
      }));
      
    } catch (error) {
      console.error('Error getting client bookings:', error);
      throw error;
    }
  }
  
  /**
   * Check booking availability in bulk for calendar view
   */
  async getBulkAvailability(
    companyId: string,
    branchId: string,
    serviceIds: string[],
    startDate: Date,
    endDate: Date,
    staffId?: string
  ): Promise<{ [date: string]: BookingAvailability }> {
    try {
      const availability: { [date: string]: BookingAvailability } = {};
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        try {
          availability[dateStr] = await this.getPublicAvailability(
            companyId,
            branchId,
            serviceIds,
            currentDate,
            staffId
          );
        } catch (error) {
          console.error(`Error getting availability for ${dateStr}:`, error);
          availability[dateStr] = {
            date: dateStr,
            availableSlots: [],
            fullyBooked: true
          };
        }
        
        currentDate = addDays(currentDate, 1);
      }
      
      return availability;
      
    } catch (error) {
      console.error('Error getting bulk availability:', error);
      throw error;
    }
  }
  
  /**
   * Private helper methods
   */
  
  private async validateBookingData(bookingData: PublicBookingData): Promise<void> {
    // Validate required fields
    if (!bookingData.clientName || !bookingData.clientPhone) {
      throw new Error('Client name and phone are required');
    }
    
    if (!bookingData.serviceIds || bookingData.serviceIds.length === 0) {
      throw new Error('At least one service must be selected');
    }
    
    if (!bookingData.date || !bookingData.startTime) {
      throw new Error('Date and time are required');
    }
    
    // Validate booking is not in the past
    const bookingDateTime = new Date(`${format(bookingData.date, 'yyyy-MM-dd')} ${bookingData.startTime}`);
    if (bookingDateTime < new Date()) {
      throw new Error('Cannot book appointments in the past');
    }
    
    // Validate services are available for online booking
    await this.validateServicesForBooking(bookingData.companyId, bookingData.serviceIds);
  }
  
  private async validateServicesForBooking(companyId: string, serviceIds: string[]): Promise<void> {
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        companyId,
        active: true
      }
    });
    
    if (services.length !== serviceIds.length) {
      throw new Error('One or more services are not available');
    }
    
    // Check if all services allow online booking
    const offlineServices = services.filter(service => {
      const onlineBooking = service.onlineBooking as any;
      return !onlineBooking?.enabled;
    });
    
    if (offlineServices.length > 0) {
      throw new Error(`Services ${offlineServices.map(s => s.name).join(', ')} are not available for online booking`);
    }
  }
  
  private async findOrCreateClient(bookingData: Partial<PublicBookingData>): Promise<string> {
    try {
      // Normalize phone
      const normalizedPhone = bookingData.clientPhone?.replace(/[\s\-\(\)]/g, '').replace(/^\+20/, '');
      
      // Try to find existing client
      const existingClient = await prisma.client.findFirst({
        where: {
          companyId: bookingData.companyId,
          phone: normalizedPhone
        }
      });
      
      if (existingClient) {
        return existingClient.id;
      }
      
      // Create new client
      const nameParts = bookingData.clientName?.trim().split(' ') || [];
      const firstName = nameParts[0] || bookingData.clientName || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const newClient = await prisma.client.create({
        data: {
          companyId: bookingData.companyId!,
          firstName,
          lastName,
          phone: normalizedPhone,
          email: bookingData.clientEmail,
          status: 'ACTIVE',
          createdById: 'online-booking'
        }
      });
      
      return newClient.id;
      
    } catch (error) {
      console.error('Error finding/creating client:', error);
      throw new Error('Failed to process client information');
    }
  }
  
  private async getServiceDetails(serviceIds: string[]): Promise<any[]> {
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    });
    
    return services.map(service => {
      const duration = (service.duration as any)?.minutes || 
                      (service.duration as any)?.hours * 60 || 
                      60;
      const price = parseFloat(service.startingPrice.toString());
      
      return {
        id: service.id,
        name: service.name,
        duration,
        price
      };
    });
  }
  
  private async calculateTotalDuration(serviceIds: string[]): Promise<number> {
    const services = await this.getServiceDetails(serviceIds);
    return services.reduce((sum, service) => sum + service.duration, 0);
  }
  
  private async assignOptimalStaff(
    companyId: string,
    branchId: string,
    serviceIds: string[],
    date: Date,
    startTime: string,
    duration: number
  ): Promise<string | null> {
    try {
      // Get available staff for the services
      const availableStaff = await prisma.staff.findMany({
        where: {
          status: 'ACTIVE',
          onlineBookingEnabled: true,
          services: {
            some: {
              serviceId: { in: serviceIds },
              isActive: true
            }
          },
          branches: {
            some: {
              branchId: branchId,
              isActive: true
            }
          }
        },
        include: {
          schedules: {
            where: {
              dayOfWeek: date.getDay(),
              startDate: { lte: date },
              OR: [
                { endDate: null },
                { endDate: { gte: date } }
              ]
            }
          }
        }
      });
      
      // Check availability for each staff member
      for (const staff of availableStaff) {
        const availability = await this.availabilityService.checkSlotAvailability(
          branchId,
          date,
          startTime,
          serviceIds,
          staff.id
        );
        
        if (availability.available) {
          return staff.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error assigning optimal staff:', error);
      return null;
    }
  }
  
  private async generateBookingConfirmation(appointmentId: string): Promise<BookingConfirmation> {
    try {
      const appointment = await this.appointmentService.getAppointmentById(appointmentId);
      
      // Generate confirmation number
      const confirmationNumber = `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      return {
        appointmentId: appointment.id,
        confirmationNumber,
        clientId: appointment.clientId,
        appointment: {
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          services: appointment.services,
          staff: {
            id: appointment.staff?.id || '',
            name: appointment.staff?.name || 'TBA'
          },
          totalDuration: appointment.totalDuration,
          totalPrice: parseFloat(appointment.totalPrice.toString())
        },
        business: {
          name: appointment.branch?.name || appointment.company?.name || 'Our Business',
          address: (appointment.branch?.address as any)?.street,
          phone: (appointment.branch?.contact as any)?.phones?.[0]?.number
        },
        cancellationPolicy: 'Appointments can be cancelled up to 24 hours in advance'
      };
      
    } catch (error) {
      console.error('Error generating booking confirmation:', error);
      throw error;
    }
  }
  
  private async updateBookingLinkAnalytics(bookingLinkId: string): Promise<void> {
    try {
      // This would update booking link analytics
      // For now, we'll leave this as a placeholder
      console.log(`Updated analytics for booking link: ${bookingLinkId}`);
    } catch (error) {
      console.error('Error updating booking link analytics:', error);
      // Don't throw - analytics shouldn't break booking
    }
  }
  
  private canCancelBooking(date: Date, startTime: string): boolean {
    const appointmentDateTime = new Date(`${format(date, 'yyyy-MM-dd')} ${startTime}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursDifference >= 24; // Can cancel up to 24 hours before
  }
  
  private canRescheduleBooking(date: Date, startTime: string): boolean {
    return this.canCancelBooking(date, startTime); // Same policy as cancellation
  }
}

export const bookingService = new BookingService();