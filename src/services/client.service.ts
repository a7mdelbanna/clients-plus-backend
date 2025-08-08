import { PrismaClient, Client, Prisma, ClientStatus, Gender, CommunicationMethod } from '@prisma/client';
import { logger } from '../config/logger';
import { wsIntegration } from '../websocket/websocket.integration';

const prisma = new PrismaClient();

// Extended interfaces to match Firebase functionality
export interface ClientPhone {
  number: string;
  type: 'mobile' | 'home' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveSMS?: boolean;
  notes?: string;
}

export interface ClientEmail {
  address: string;
  type: 'personal' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveEmails?: boolean;
  bounced?: boolean;
}

export interface ClientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

export interface ClientSocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface ClientPreferences {
  // Service preferences
  preferredStaff?: string[];
  preferredDays?: string[];
  preferredTimes?: string[];
  roomPreferences?: string;
  
  // Communication preferences
  communicationLanguage?: string;
  communicationStyle?: 'silent' | 'minimal' | 'chatty' | 'very_social';
  
  // Lifestyle preferences
  favoriteDrinks?: string[];
  musicPreferences?: {
    genres?: string[];
    artists?: string[];
    volume?: 'quiet' | 'moderate' | 'loud';
    preference?: 'no_music' | 'background' | 'engaged';
  };
  
  // Comfort preferences
  temperaturePreference?: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';
  aromatherapy?: string[];
  refreshments?: {
    beverageTemperature?: 'ice_cold' | 'cold' | 'room_temp' | 'warm' | 'hot';
    snackPreferences?: string[];
  };
  
  // Special requests
  specialRequests?: string;
}

export interface ClientMedical {
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  notes?: string;
  lastUpdated?: Date;
}

export interface ClientMarketing {
  acceptsSMS: boolean;
  acceptsEmail: boolean;
  acceptsPromotions: boolean;
  acceptsPushNotifications?: boolean;
}

export interface ExtendedClient {
  id?: string;
  
  // Basic Information
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  age?: number;
  photo?: string;
  
  // Legacy fields for backward compatibility
  name?: string;
  nameAr?: string;
  
  // Contact Information
  phones?: ClientPhone[];
  emails?: ClientEmail[];
  address?: ClientAddress;
  socialMedia?: ClientSocialMedia;
  
  // Legacy contact fields
  phone?: string;
  email?: string;
  mobile?: string;
  
  // Additional Information
  nationality?: string;
  idNumber?: string;
  occupation?: string;
  employer?: string;
  referralSource?: string;
  referredBy?: string;
  emergencyContact?: EmergencyContact;
  
  // Preferences
  preferences?: ClientPreferences;
  medical?: ClientMedical;
  marketing?: ClientMarketing;
  
  // Business Information
  website?: string;
  industry?: string;
  taxNumber?: string;
  
  // Status and Categories
  status: ClientStatus;
  categoryId?: string;
  tags?: string[];
  notes?: string;
  
  // Financial Information
  currentBalance?: number;
  creditLimit?: number;
  paymentTerms?: number;
  
  // Statistics (calculated fields)
  totalVisits?: number;
  completedVisits?: number;
  cancelledVisits?: number;
  noShows?: number;
  noShowRate?: number;
  lastVisit?: Date;
  nextVisit?: Date;
  averageVisitFrequency?: number;
  favoriteService?: string;
  favoriteStaff?: string;
  totalRevenue?: number;
  averageTicket?: number;
  lifetimeValue?: number;
  projectsCount?: number;
  lastContactDate?: Date;
  
  // Loyalty
  loyaltyPoints?: number;
  loyaltyTier?: string;
  memberSince?: Date;
  
  // System Information
  companyId: string;
  branchId?: string;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
  importedFrom?: string;
  
  // Portal Access
  portalEnabled?: boolean;
  portalLastAccess?: Date;
  
  // Custom Fields
  customFields?: Record<string, any>;
}

export interface ClientsFilter {
  // Quick filters
  quickFilter?: 'all' | 'new_this_month' | 'vip' | 'birthday_this_month' | 'with_balance' | 'inactive' | 'recent_visits';
  
  // Basic filters
  status?: ClientStatus | 'all';
  searchTerm?: string;
  tags?: string[];
  
  // Personal info filters
  ageRange?: { min?: number; max?: number };
  gender?: Gender[];
  birthday?: {
    month?: number;
    upcomingDays?: number;
  };
  location?: {
    city?: string;
    zipCode?: string;
    radius?: number;
  };
  
  // Visit history filters
  lastVisitDate?: { from?: Date; to?: Date };
  visitCount?: { min?: number; max?: number };
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'rarely';
  specificService?: string[];
  specificStaff?: string[];
  noShowRate?: { min?: number; max?: number };
  
  // Financial filters
  currentBalance?: { min?: number; max?: number };
  lifetimeSpend?: { min?: number; max?: number };
  averageTicket?: { min?: number; max?: number };
  hasPackages?: boolean;
  hasMembership?: boolean;
  hasDebt?: boolean;
  
  // Category filters
  includeCategories?: string[];
  excludeCategories?: string[];
  
  // Communication filters
  acceptsSMS?: boolean;
  acceptsEmail?: boolean;
  hasValidEmail?: boolean;
  hasValidPhone?: boolean;
  lastContactDate?: { from?: Date; to?: Date };
  
  // Source filters
  referralSource?: string[];
  referredByClient?: boolean;
  registrationDate?: { from?: Date; to?: Date };
  registrationMethod?: 'online' | 'in-person' | 'phone' | 'import';
  
  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalRevenue' | 'lastVisit' | 'totalVisits' | 'balance';
  sortDirection?: 'asc' | 'desc';
  
  // Custom field filters
  customFields?: Record<string, any>;
  
  // Branch filtering
  branchId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string; // For cursor-based pagination
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
  };
}

export interface DuplicateMatch {
  client: ExtendedClient;
  matchScore: number;
  matchedFields: string[];
  matchType: 'exact' | 'possible';
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  suggestedAction: 'block' | 'warn' | 'allow';
}

export interface ClientStats {
  totalClients: number;
  newThisMonth: number;
  activeClients: number;
  inactiveClients: number;
  totalRevenue: number;
  averageLifetimeValue: number;
}

export class ClientService {
  /**
   * Normalize phone number (Egyptian format)
   */
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    
    // Handle Egyptian numbers
    if (normalized.startsWith('20')) {
      normalized = normalized.substring(2);
    }
    
    // If the normalized phone doesn't start with 0, add it
    if (normalized && !normalized.startsWith('0') && normalized.length >= 10) {
      normalized = '0' + normalized;
    }
    
    return normalized;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Ensure backward compatibility with legacy fields
   */
  private ensureBackwardCompatibility(clientData: Partial<ExtendedClient>): Partial<ExtendedClient> {
    const data = { ...clientData };
    
    // If using new structure, create legacy fields
    if (data.firstName || data.lastName) {
      data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    
    // If using legacy structure, create new fields
    if (data.name && !data.firstName && !data.lastName) {
      const parts = data.name.split(' ');
      data.firstName = parts[0] || '';
      data.lastName = parts.slice(1).join(' ');
    }
    
    // Handle primary phone/email
    if (data.phones && data.phones.length > 0) {
      const primary = data.phones.find(p => p.isPrimary) || data.phones[0];
      data.phone = this.normalizePhone(primary.number);
    } else if (data.phone) {
      data.phone = this.normalizePhone(data.phone);
    }
    
    if (data.emails && data.emails.length > 0) {
      const primary = data.emails.find(e => e.isPrimary) || data.emails[0];
      data.email = primary.address;
    }
    
    // Calculate age if DOB is provided
    if (data.dateOfBirth) {
      const dob = data.dateOfBirth instanceof Date ? data.dateOfBirth : new Date(data.dateOfBirth);
      const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      data.age = age;
    }
    
    return data;
  }

  /**
   * Convert extended client to Prisma client data
   */
  private convertToPrismaData(clientData: Partial<ExtendedClient>): Prisma.ClientCreateInput | Prisma.ClientUpdateInput {
    const data = this.ensureBackwardCompatibility(clientData);
    
    // Extract Prisma fields
    const prismaData: any = {
      firstName: data.firstName,
      lastName: data.lastName || '',
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      status: data.status || ClientStatus.ACTIVE,
      isActive: data.status !== ClientStatus.INACTIVE,
      marketingConsent: data.marketing?.acceptsPromotions || false,
      preferredLanguage: data.preferences?.communicationLanguage || null,
      preferredCommunication: CommunicationMethod.EMAIL,
      notes: data.notes || null,
    };

    // Store extended data in JSON fields
    if (data.address) {
      prismaData.address = data.address;
    }

    if (data.preferences || data.medical || data.marketing || data.phones || data.emails || data.socialMedia || data.emergencyContact || data.customFields) {
      prismaData.reminderPreferences = {
        preferences: data.preferences,
        medical: data.medical,
        marketing: data.marketing,
        phones: data.phones,
        emails: data.emails,
        socialMedia: data.socialMedia,
        emergencyContact: data.emergencyContact,
        customFields: data.customFields,
        tags: data.tags,
        // Statistics
        totalVisits: data.totalVisits,
        completedVisits: data.completedVisits,
        cancelledVisits: data.cancelledVisits,
        noShows: data.noShows,
        noShowRate: data.noShowRate,
        lastVisit: data.lastVisit,
        nextVisit: data.nextVisit,
        averageVisitFrequency: data.averageVisitFrequency,
        favoriteService: data.favoriteService,
        favoriteStaff: data.favoriteStaff,
        totalRevenue: data.totalRevenue,
        averageTicket: data.averageTicket,
        lifetimeValue: data.lifetimeValue,
        projectsCount: data.projectsCount,
        lastContactDate: data.lastContactDate,
        loyaltyPoints: data.loyaltyPoints,
        loyaltyTier: data.loyaltyTier,
        memberSince: data.memberSince,
        // Business info
        website: data.website,
        industry: data.industry,
        taxNumber: data.taxNumber,
        nationality: data.nationality,
        idNumber: data.idNumber,
        occupation: data.occupation,
        employer: data.employer,
        referralSource: data.referralSource,
        referredBy: data.referredBy,
        categoryId: data.categoryId,
        currentBalance: data.currentBalance,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
        importedFrom: data.importedFrom,
        portalEnabled: data.portalEnabled,
        portalLastAccess: data.portalLastAccess,
        // Legacy fields
        name: data.name,
        nameAr: data.nameAr,
        mobile: data.mobile,
        middleName: data.middleName,
        preferredName: data.preferredName,
        photo: data.photo,
        age: data.age,
      };
    }

    return prismaData;
  }

  /**
   * Convert Prisma client to extended client
   */
  private convertToExtendedClient(prismaClient: Client): ExtendedClient {
    const reminderData = prismaClient.reminderPreferences as any || {};
    
    return {
      id: prismaClient.id,
      firstName: prismaClient.firstName,
      lastName: prismaClient.lastName,
      email: prismaClient.email || undefined,
      phone: prismaClient.phone || undefined,
      dateOfBirth: prismaClient.dateOfBirth || undefined,
      gender: prismaClient.gender || undefined,
      status: prismaClient.status,
      companyId: prismaClient.companyId,
      createdById: prismaClient.createdById,
      createdAt: prismaClient.createdAt,
      updatedAt: prismaClient.updatedAt,
      // isActive: prismaClient.isActive, // This is stored in the database, not part of ExtendedClient interface
      // marketingConsent: prismaClient.marketingConsent, // This is stored in the database, not part of ExtendedClient interface
      // preferredLanguage: prismaClient.preferredLanguage || undefined, // This is stored in the database, not part of ExtendedClient interface
      notes: prismaClient.notes || undefined,
      address: prismaClient.address as ClientAddress || undefined,
      
      // Extended fields from JSON
      preferences: reminderData.preferences,
      medical: reminderData.medical,
      marketing: reminderData.marketing,
      phones: reminderData.phones,
      emails: reminderData.emails,
      socialMedia: reminderData.socialMedia,
      emergencyContact: reminderData.emergencyContact,
      customFields: reminderData.customFields,
      tags: reminderData.tags,
      
      // Statistics
      totalVisits: reminderData.totalVisits || 0,
      completedVisits: reminderData.completedVisits || 0,
      cancelledVisits: reminderData.cancelledVisits || 0,
      noShows: reminderData.noShows || 0,
      noShowRate: reminderData.noShowRate || 0,
      lastVisit: reminderData.lastVisit,
      nextVisit: reminderData.nextVisit,
      averageVisitFrequency: reminderData.averageVisitFrequency,
      favoriteService: reminderData.favoriteService,
      favoriteStaff: reminderData.favoriteStaff,
      totalRevenue: reminderData.totalRevenue || 0,
      averageTicket: reminderData.averageTicket || 0,
      lifetimeValue: reminderData.lifetimeValue || 0,
      projectsCount: reminderData.projectsCount || 0,
      lastContactDate: reminderData.lastContactDate,
      loyaltyPoints: reminderData.loyaltyPoints || 0,
      loyaltyTier: reminderData.loyaltyTier,
      memberSince: reminderData.memberSince,
      
      // Business info
      website: reminderData.website,
      industry: reminderData.industry,
      taxNumber: reminderData.taxNumber,
      nationality: reminderData.nationality,
      idNumber: reminderData.idNumber,
      occupation: reminderData.occupation,
      employer: reminderData.employer,
      referralSource: reminderData.referralSource,
      referredBy: reminderData.referredBy,
      categoryId: reminderData.categoryId,
      currentBalance: reminderData.currentBalance || 0,
      creditLimit: reminderData.creditLimit,
      paymentTerms: reminderData.paymentTerms,
      importedFrom: reminderData.importedFrom,
      portalEnabled: reminderData.portalEnabled,
      portalLastAccess: reminderData.portalLastAccess,
      
      // Legacy fields
      name: reminderData.name,
      nameAr: reminderData.nameAr,
      mobile: reminderData.mobile,
      middleName: reminderData.middleName,
      preferredName: reminderData.preferredName,
      photo: reminderData.photo,
      age: reminderData.age,
    };
  }

  /**
   * Create a new client
   */
  async createClient(clientData: Omit<ExtendedClient, 'id'>, userId: string): Promise<string> {
    try {
      const compatibleData = this.ensureBackwardCompatibility(clientData);
      const prismaData = this.convertToPrismaData({
        ...compatibleData,
        status: clientData.status || ClientStatus.ACTIVE,
        marketing: clientData.marketing || {
          acceptsSMS: true,
          acceptsEmail: true,
          acceptsPromotions: true,
        },
        // Initialize statistics
        totalRevenue: 0,
        projectsCount: 0,
        totalVisits: 0,
        completedVisits: 0,
        cancelledVisits: 0,
        noShows: 0,
        noShowRate: 0,
        currentBalance: 0,
        loyaltyPoints: 0,
        memberSince: new Date(),
      }) as Prisma.ClientCreateInput;

      // Set company and creator
      prismaData.company = { connect: { id: clientData.companyId } };
      prismaData.createdBy = { connect: { id: userId } };

      const client = await prisma.client.create({
        data: prismaData,
      });

      // Check for duplicates after creation (warning only)
      this.checkForDuplicates({ ...clientData, id: client.id }).then(result => {
        if (result.hasDuplicates && result.suggestedAction === 'warn') {
          logger.warn('Possible duplicate client created:', { clientId: client.id, matches: result.matches });
        }
      }).catch(logger.error);

      logger.info(`Client created successfully: ${client.id}`);

      // Emit WebSocket event for real-time updates
      try {
        const extendedClient = this.convertToExtendedClient(client);
        wsIntegration.emitClientCreated(extendedClient as any);
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket event for client creation:', wsError);
      }

      return client.id;
    } catch (error) {
      logger.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string, companyId: string): Promise<ExtendedClient | null> {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId,
          isActive: true,
        },
      });

      if (!client) {
        return null;
      }

      return this.convertToExtendedClient(client);
    } catch (error) {
      logger.error('Error getting client:', error);
      throw error;
    }
  }

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<ExtendedClient>, companyId: string): Promise<void> {
    try {
      const compatibleData = this.ensureBackwardCompatibility(updates);
      const prismaData = this.convertToPrismaData(compatibleData) as Prisma.ClientUpdateInput;

      await prisma.client.updateMany({
        where: {
          id: clientId,
          companyId,
          isActive: true,
        },
        data: prismaData,
      });

      logger.info(`Client updated successfully: ${clientId}`);

      // Emit WebSocket event for real-time updates
      try {
        const updatedClient = await this.getClient(clientId, companyId);
        if (updatedClient) {
          wsIntegration.emitClientUpdated(updatedClient as any);
        }
      } catch (wsError) {
        logger.warn('Failed to emit WebSocket event for client update:', wsError);
      }
    } catch (error) {
      logger.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete a client (soft delete)
   */
  async deleteClient(clientId: string, companyId: string): Promise<void> {
    try {
      await prisma.client.updateMany({
        where: {
          id: clientId,
          companyId,
        },
        data: {
          isActive: false,
          status: ClientStatus.ARCHIVED,
        },
      });

      logger.info(`Client soft deleted successfully: ${clientId}`);
    } catch (error) {
      logger.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Get clients with filtering and pagination
   */
  async getClients(
    companyId: string,
    filter?: ClientsFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ExtendedClient>> {
    try {
      const page = pagination?.page || 1;
      const limit = Math.min(pagination?.limit || 10, 100);
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ClientWhereInput = {
        companyId,
        isActive: true,
      };

      // Apply filters
      if (filter) {
        // Status filter
        if (filter.status && filter.status !== 'all') {
          where.status = filter.status as ClientStatus;
        }

        // Search filter
        if (filter.searchTerm) {
          const searchTerm = filter.searchTerm.toLowerCase();
          where.OR = [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: filter.searchTerm } },
          ];
        }

        // Gender filter
        if (filter.gender && filter.gender.length > 0) {
          where.gender = { in: filter.gender };
        }

        // Date filters
        if (filter.registrationDate?.from || filter.registrationDate?.to) {
          where.createdAt = {};
          if (filter.registrationDate.from) {
            where.createdAt.gte = filter.registrationDate.from;
          }
          if (filter.registrationDate.to) {
            where.createdAt.lte = filter.registrationDate.to;
          }
        }

        // Branch filter
        if (filter.branchId) {
          // This will be implemented when we add branchId to the schema
          // For now, we'll store it in the reminderPreferences JSON
        }
      }

      // Build orderBy
      const orderBy: Prisma.ClientOrderByWithRelationInput = {};
      if (filter?.sortBy) {
        switch (filter.sortBy) {
          case 'name':
            orderBy.firstName = filter.sortDirection || 'asc';
            break;
          case 'createdAt':
            orderBy.createdAt = filter.sortDirection || 'desc';
            break;
          case 'updatedAt':
            orderBy.updatedAt = filter.sortDirection || 'desc';
            break;
          default:
            orderBy.createdAt = 'desc';
        }
      } else {
        orderBy.createdAt = 'desc';
      }

      // Execute queries
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.client.count({ where }),
      ]);

      const extendedClients = clients.map(client => this.convertToExtendedClient(client));

      // Apply client-side filters that can't be done in the database
      let filteredClients = extendedClients;

      if (filter) {
        // Age range filter
        if (filter.ageRange?.min !== undefined || filter.ageRange?.max !== undefined) {
          filteredClients = filteredClients.filter(client => {
            if (!client.age) return false;
            if (filter.ageRange!.min !== undefined && client.age < filter.ageRange!.min) return false;
            if (filter.ageRange!.max !== undefined && client.age > filter.ageRange!.max) return false;
            return true;
          });
        }

        // Birthday filter
        if (filter.birthday) {
          const now = new Date();
          filteredClients = filteredClients.filter(client => {
            if (!client.dateOfBirth) return false;
            
            const dob = new Date(client.dateOfBirth);
            
            if (filter.birthday!.month !== undefined) {
              return dob.getMonth() === filter.birthday!.month - 1;
            }
            
            if (filter.birthday!.upcomingDays !== undefined) {
              const dayOfYear = Math.floor((dob.getTime() - new Date(dob.getFullYear(), 0, 0).getTime()) / 86400000);
              const todayDayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
              const daysUntil = (dayOfYear - todayDayOfYear + 365) % 365;
              return daysUntil <= filter.birthday!.upcomingDays;
            }
            
            return true;
          });
        }

        // Communication preferences filter
        if (filter.acceptsSMS !== undefined) {
          filteredClients = filteredClients.filter(client => 
            client.marketing?.acceptsSMS === filter.acceptsSMS
          );
        }

        if (filter.acceptsEmail !== undefined) {
          filteredClients = filteredClients.filter(client => 
            client.marketing?.acceptsEmail === filter.acceptsEmail
          );
        }

        // Tags filter
        if (filter.tags && filter.tags.length > 0) {
          filteredClients = filteredClients.filter(client =>
            client.tags?.some(tag => filter.tags?.includes(tag))
          );
        }

        // Quick filters
        if (filter.quickFilter) {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          
          switch (filter.quickFilter) {
            case 'new_this_month':
              filteredClients = filteredClients.filter(client => {
                if (!client.createdAt) return false;
                return new Date(client.createdAt) >= monthStart;
              });
              break;
              
            case 'birthday_this_month':
              filteredClients = filteredClients.filter(client => {
                if (!client.dateOfBirth) return false;
                const dob = new Date(client.dateOfBirth);
                return dob.getMonth() === now.getMonth();
              });
              break;
              
            case 'with_balance':
              filteredClients = filteredClients.filter(client => 
                client.currentBalance !== undefined && client.currentBalance !== 0
              );
              break;
              
            case 'inactive':
              filteredClients = filteredClients.filter(client => client.status === ClientStatus.INACTIVE);
              break;
          }
        }
      }

      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      return {
        data: filteredClients,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      logger.error('Error getting clients:', error);
      throw error;
    }
  }

  /**
   * Get all clients for a company (for autocomplete)
   */
  async getAllClients(companyId: string): Promise<ExtendedClient[]> {
    try {
      const clients = await prisma.client.findMany({
        where: {
          companyId,
          isActive: true,
        },
        orderBy: {
          firstName: 'asc',
        },
      });

      return clients.map(client => this.convertToExtendedClient(client));
    } catch (error) {
      logger.error('Error getting all clients:', error);
      throw error;
    }
  }

  /**
   * Get client suggestions for autocomplete
   */
  async getClientSuggestions(companyId: string, searchTerm: string): Promise<ExtendedClient[]> {
    try {
      if (!searchTerm) {
        return (await this.getAllClients(companyId)).slice(0, 10);
      }

      const clients = await prisma.client.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm } },
          ],
        },
        orderBy: {
          firstName: 'asc',
        },
        take: 10,
      });

      return clients.map(client => this.convertToExtendedClient(client));
    } catch (error) {
      logger.error('Error getting client suggestions:', error);
      return [];
    }
  }

  /**
   * Check for duplicate clients
   */
  async checkForDuplicates(clientData: Partial<ExtendedClient>): Promise<DuplicateCheckResult> {
    try {
      const { companyId } = clientData;
      if (!companyId) {
        return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
      }

      const matches: DuplicateMatch[] = [];
      
      // Get all clients for comparison
      const allClients = await this.getAllClients(companyId);
      
      for (const existingClient of allClients) {
        // Skip if it's the same client (during update)
        if (clientData.id && clientData.id === existingClient.id) continue;
        
        let matchScore = 0;
        const matchedFields: string[] = [];
        
        // Check phone match (exact)
        if (clientData.phone && existingClient.phone) {
          const normalizedNew = this.normalizePhone(clientData.phone);
          const normalizedExisting = this.normalizePhone(existingClient.phone);
          if (normalizedNew === normalizedExisting) {
            matchScore += 40;
            matchedFields.push('phone');
          }
        }
        
        // Check email match (exact, case-insensitive)
        if (clientData.email && existingClient.email) {
          if (clientData.email.toLowerCase() === existingClient.email.toLowerCase()) {
            matchScore += 30;
            matchedFields.push('email');
          }
        }
        
        // Check name match (fuzzy)
        const newName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
        const existingName = `${existingClient.firstName || ''} ${existingClient.lastName || ''}`.trim();
        if (newName && existingName) {
          const nameSimilarity = this.calculateStringSimilarity(newName, existingName);
          if (nameSimilarity > 0.8) {
            matchScore += 20;
            matchedFields.push('name');
          }
        }
        
        // Check DOB match
        if (clientData.dateOfBirth && existingClient.dateOfBirth) {
          const newDOB = new Date(clientData.dateOfBirth);
          const existingDOB = new Date(existingClient.dateOfBirth);
          
          if (newDOB.getTime() === existingDOB.getTime()) {
            matchScore += 10;
            matchedFields.push('dateOfBirth');
          }
        }
        
        // If score is high enough, it's a match
        if (matchScore >= 40) {
          matches.push({
            client: existingClient,
            matchScore,
            matchedFields,
            matchType: matchScore >= 70 ? 'exact' : 'possible'
          });
        }
      }
      
      // Determine suggested action
      let suggestedAction: 'block' | 'warn' | 'allow' = 'allow';
      if (matches.some(m => m.matchType === 'exact')) {
        suggestedAction = 'block';
      } else if (matches.length > 0) {
        suggestedAction = 'warn';
      }
      
      return {
        hasDuplicates: matches.length > 0,
        matches,
        suggestedAction
      };
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(companyId: string, branchId?: string): Promise<ClientStats> {
    try {
      const where: Prisma.ClientWhereInput = {
        companyId,
        isActive: true,
      };

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalClients,
        newThisMonth,
        activeClients,
        inactiveClients,
      ] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.count({
          where: {
            ...where,
            createdAt: { gte: monthStart },
          },
        }),
        prisma.client.count({
          where: {
            ...where,
            status: ClientStatus.ACTIVE,
          },
        }),
        prisma.client.count({
          where: {
            ...where,
            status: ClientStatus.INACTIVE,
          },
        }),
      ]);

      // Calculate revenue stats from extended client data
      const allClients = await this.getAllClients(companyId);
      const totalRevenue = allClients.reduce((sum, client) => sum + (client.totalRevenue || 0), 0);
      const averageLifetimeValue = totalClients > 0 ? totalRevenue / totalClients : 0;

      return {
        totalClients,
        newThisMonth,
        activeClients,
        inactiveClients,
        totalRevenue,
        averageLifetimeValue,
      };
    } catch (error) {
      logger.error('Error getting client stats:', error);
      throw error;
    }
  }

  /**
   * Update client statistics (called after appointments, invoices, etc.)
   */
  async updateClientStats(clientId: string, companyId: string): Promise<void> {
    try {
      // This would typically be called from other services (appointment, invoice)
      // For now, we'll implement a basic version that can be expanded

      // Get current client
      const client = await this.getClient(clientId, companyId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Calculate stats from appointments and invoices
      // This would be implemented when we have appointment and invoice services
      const stats = {
        totalVisits: client.totalVisits || 0,
        completedVisits: client.completedVisits || 0,
        cancelledVisits: client.cancelledVisits || 0,
        noShows: client.noShows || 0,
        totalRevenue: client.totalRevenue || 0,
        projectsCount: client.projectsCount || 0,
        lastContactDate: new Date(),
      };

      // Update client with new stats
      await this.updateClient(clientId, stats, companyId);

      logger.info(`Client stats updated: ${clientId}`);
    } catch (error) {
      logger.error('Error updating client stats:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Bulk operations
   */
  async bulkUpdateClients(
    clientIds: string[],
    updates: Partial<ExtendedClient>,
    companyId: string
  ): Promise<{ updated: number; failed: number }> {
    try {
      let updated = 0;
      let failed = 0;

      for (const clientId of clientIds) {
        try {
          await this.updateClient(clientId, updates, companyId);
          updated++;
        } catch (error) {
          logger.error(`Failed to update client ${clientId}:`, error);
          failed++;
        }
      }

      logger.info(`Bulk update completed: ${updated} updated, ${failed} failed`);
      return { updated, failed };
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  /**
   * Search clients with advanced filters
   */
  async searchClients(
    companyId: string,
    searchTerm: string,
    filters?: Omit<ClientsFilter, 'searchTerm'>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ExtendedClient>> {
    const combinedFilter: ClientsFilter = {
      ...filters,
      searchTerm,
    };

    return this.getClients(companyId, combinedFilter, pagination);
  }
}

export const clientService = new ClientService();