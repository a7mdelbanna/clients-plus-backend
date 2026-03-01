import { staffApiService, type ExpressStaff as ApiStaff } from './api/staff.api.service';
import { toDateSafe } from '../utils/dateUtils';

// Access levels enum
export type AccessLevel = 'Employee' | 'Administrator' | 'CallCenter' | 'Accountant' | 'Manager' | 'Owner';

// Staff interface - Enhanced version
export interface Staff {
  id?: string;
  companyId: string;
  branchId?: string;
  branchIds?: string[];
  name: string;
  nameAr?: string;
  lastName?: string;
  middleName?: string;
  specialization?: string;
  positionId?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  access: {
    level: AccessLevel;
    status: 'not_granted' | 'invited' | 'active';
    inviteSentAt?: any;
    lastLogin?: any;
  };
  schedule: {
    isScheduled: boolean;
    scheduleStartDate?: any;
    scheduledUntil?: any;
    defaultTemplate?: string;
    workingHours?: {
      [day: string]: {
        isWorking: boolean;
        start?: string;
        end?: string;
        breaks?: Array<{ start: string; end: string }>;
      };
    };
  };
  services: string[];
  servicesCount?: number;
  onlineBooking: {
    enabled: boolean;
    profile?: {
      description?: string;
      showRating?: boolean;
    };
    rules?: {
      requirePrepayment?: boolean;
      allowAnySpecialist?: boolean;
    };
    schedulingTime?: 'general' | 'personal';
  };
  personalInfo?: {
    employmentDate?: any;
    registrationEndDate?: any;
    citizenship?: string;
    gender?: 'Unknown' | 'Male' | 'Female';
  };
  documents?: {
    passport?: string;
    taxId?: string;
    insuranceNumber?: string;
  };
  status: 'active' | 'dismissed' | 'deleted';
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Access level permissions
export const AccessLevelPermissions: Record<AccessLevel, string[]> = {
  Employee: ['view_own_schedule', 'view_own_services', 'update_availability'],
  Administrator: ['manage_appointments', 'manage_payments', 'view_all_schedules'],
  CallCenter: ['create_appointments', 'view_all_schedules', 'manage_clients'],
  Accountant: ['view_payroll', 'manage_payroll', 'view_financial_reports'],
  Manager: ['manage_location', 'manage_staff', 'view_reports'],
  Owner: ['*'],
};

// Access level descriptions for UI
export const AccessLevelDescriptions: Record<AccessLevel, string> = {
  Employee: 'يقدم الخدمات',
  Administrator: 'مسؤول عن المواعيد ومدفوعاتها',
  CallCenter: 'يساعد العملاء ويحجز المواعيد',
  Accountant: 'مسؤول عن الرواتب',
  Manager: 'يدير موقعًا',
  Owner: 'لديه جميع الصلاحيات',
};

// Transform API staff to legacy Staff format
function apiStaffToLegacy(apiStaff: ApiStaff): Staff {
  return {
    id: apiStaff.id,
    companyId: apiStaff.companyId,
    branchId: apiStaff.branches?.[0]?.branchId,
    branchIds: apiStaff.branches?.map(b => b.branchId) || [],
    name: apiStaff.name,
    nameAr: apiStaff.nameAr,
    lastName: apiStaff.lastName,
    middleName: apiStaff.middleName,
    specialization: apiStaff.specialization,
    positionId: apiStaff.positionId,
    avatar: apiStaff.avatar,
    email: apiStaff.email,
    phone: apiStaff.phone,
    access: {
      level: (apiStaff.accessLevel as AccessLevel) || 'Employee',
      status: apiStaff.accessStatus === 'ACTIVE' ? 'active' : 'not_granted',
    },
    schedule: {
      isScheduled: !!apiStaff.schedules?.length,
    },
    services: apiStaff.services?.map(s => s.serviceId) || [],
    servicesCount: apiStaff.services?.length || 0,
    onlineBooking: {
      enabled: apiStaff.onlineBookingEnabled || false,
      profile: apiStaff.onlineBookingProfile,
      rules: apiStaff.onlineBookingRules,
      schedulingTime: apiStaff.schedulingTime as any,
    },
    personalInfo: {
      employmentDate: apiStaff.employmentDate ? new Date(apiStaff.employmentDate) : undefined,
      registrationEndDate: apiStaff.terminationDate ? new Date(apiStaff.terminationDate) : undefined,
      citizenship: apiStaff.personalInfo?.nationality,
      gender: 'Unknown',
    },
    documents: {
      passport: apiStaff.personalInfo?.passportNumber,
      taxId: apiStaff.personalInfo?.taxId,
    },
    status: (apiStaff.status?.toLowerCase() as any) || 'active',
    active: apiStaff.status === 'ACTIVE',
    createdAt: apiStaff.createdAt ? new Date(apiStaff.createdAt) : undefined,
    updatedAt: apiStaff.updatedAt ? new Date(apiStaff.updatedAt) : undefined,
    createdBy: apiStaff.createdBy,
  };
}

export const staffService = {
  async createStaff(
    staff: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
    branchId?: string
  ): Promise<string> {
    const apiStaff = await staffApiService.createStaff({
      name: staff.name,
      nameAr: staff.nameAr,
      firstName: staff.lastName,
      lastName: staff.lastName,
      middleName: staff.middleName,
      title: undefined,
      email: staff.email,
      phone: staff.phone,
      mobile: staff.phone,
      bio: undefined,
      specialization: staff.specialization,
      positionId: staff.positionId,
      employmentDate: staff.personalInfo?.employmentDate ? toDateSafe(staff.personalInfo.employmentDate).toISOString() : undefined,
      accessLevel: staff.access.level as any,
      onlineBookingEnabled: staff.onlineBooking.enabled,
      onlineBookingProfile: staff.onlineBooking.profile,
      onlineBookingRules: staff.onlineBooking.rules,
      schedulingTime: staff.onlineBooking.schedulingTime,
      branchIds: staff.branchIds || (branchId ? [branchId] : []),
      serviceIds: staff.services,
      specializations: [staff.specialization].filter(Boolean),
      personalInfo: {
        nationality: staff.personalInfo?.citizenship,
        idNumber: staff.documents?.passport,
        passportNumber: staff.documents?.passport,
        taxId: staff.documents?.taxId,
      },
    });
    return apiStaff.id;
  },

  async getStaff(companyId: string, branchId?: string): Promise<Staff[]> {
    const result = await staffApiService.getStaff({
      branchId,
      status: 'ACTIVE',
      sortBy: 'name',
      sortDirection: 'asc',
    });
    return result.data.map(apiStaffToLegacy);
  },

  async getStaffByPosition(companyId: string, positionId: string): Promise<Staff[]> {
    const result = await staffApiService.getStaff({
      status: 'ACTIVE',
      sortBy: 'name',
      sortDirection: 'asc',
    });
    return result.data
      .filter(s => s.positionId === positionId)
      .map(apiStaffToLegacy);
  },

  async getStaffMember(staffId: string): Promise<Staff | null> {
    try {
      const apiStaff = await staffApiService.getStaffById(staffId, true);
      return apiStaffToLegacy(apiStaff);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async updateStaff(staffId: string, updates: Partial<Staff>): Promise<void> {
    await staffApiService.updateStaff(staffId, {
      name: updates.name,
      nameAr: updates.nameAr,
      firstName: updates.lastName,
      lastName: updates.lastName,
      middleName: updates.middleName,
      email: updates.email,
      phone: updates.phone,
      mobile: updates.phone,
      specialization: updates.specialization,
      positionId: updates.positionId,
      accessLevel: updates.access?.level as any,
      onlineBookingEnabled: updates.onlineBooking?.enabled,
      onlineBookingProfile: updates.onlineBooking?.profile,
      onlineBookingRules: updates.onlineBooking?.rules,
      schedulingTime: updates.onlineBooking?.schedulingTime,
      branchIds: updates.branchIds,
      serviceIds: updates.services,
      status: updates.status?.toUpperCase() as any,
      accessStatus: updates.access?.status === 'active' ? 'ACTIVE' as any : 'INVITED' as any,
    });
  },

  async deleteStaff(staffId: string): Promise<void> {
    await staffApiService.deleteStaff(staffId, 'Terminated through admin panel');
  },

  async updatePositionStaffCount(_positionId: string, _change: number): Promise<void> {
    // Position staff counts are now managed server-side
  },

  subscribeToStaff(
    companyId: string,
    callback: (staff: Staff[]) => void,
    errorCallback?: (error: Error) => void,
    branchId?: string
  ): () => void {
    // Initial fetch
    this.getStaff(companyId, branchId)
      .then(callback)
      .catch((error) => {
        console.error('Error fetching staff:', error);
        if (errorCallback) errorCallback(error);
      });

    // Poll every 15 seconds for staff data
    const interval = setInterval(() => {
      this.getStaff(companyId, branchId)
        .then(callback)
        .catch((error) => {
          console.error('Error polling staff:', error);
          if (errorCallback) errorCallback(error);
        });
    }, 15000);

    return () => clearInterval(interval);
  },

  async checkEmailExists(
    companyId: string,
    email: string,
    excludeId?: string
  ): Promise<boolean> {
    return staffApiService.checkEmailExists(email, excludeId);
  },

  async getStaffByService(companyId: string, serviceId: string): Promise<Staff[]> {
    const apiStaff = await staffApiService.getStaffByService(serviceId);
    return apiStaff.map(apiStaffToLegacy);
  },

  async getStaffWithFilters(
    companyId: string,
    filters: {
      positionId?: string;
      status?: 'active' | 'dismissed' | 'deleted';
      accessLevel?: AccessLevel;
      searchTerm?: string;
    }
  ): Promise<Staff[]> {
    const result = await staffApiService.getStaff({
      status: filters.status?.toUpperCase() as any,
      search: filters.searchTerm,
      sortBy: 'name',
      sortDirection: 'asc',
    });

    let staff = result.data.map(apiStaffToLegacy);

    // Client-side filtering for fields not supported by API query params
    if (filters.positionId) {
      staff = staff.filter(s => s.positionId === filters.positionId);
    }
    if (filters.accessLevel) {
      staff = staff.filter(s => s.access.level === filters.accessLevel);
    }

    return staff;
  },

  async sendStaffInvitation(staffId: string, contactInfo: string): Promise<void> {
    await staffApiService.sendInvitation(staffId, contactInfo.includes('@') ? 'email' : 'sms');
  },

  async updateStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
    // Get current staff to find existing services
    const currentStaff = await staffApiService.getStaffById(staffId, true);
    for (const service of currentStaff.services || []) {
      await staffApiService.unassignService(staffId, service.serviceId);
    }
    // Assign new services
    const assignments = serviceIds.map(serviceId => ({ serviceId }));
    await staffApiService.bulkAssignServices(staffId, assignments);
  },

  async syncStaffBranchAssignments(
    companyId: string,
    staffId: string,
    newBranchIds: string[]
  ): Promise<void> {
    // Branch assignments are now managed through the staff update API
    await staffApiService.updateStaff(staffId, {
      branchIds: newBranchIds,
    });
  },
};
