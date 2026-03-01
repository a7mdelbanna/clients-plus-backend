import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Location Settings interfaces
export interface LocationBasicSettings {
  locationName: string;
  businessName: string;
  category: string;
  city: string;
  notificationLanguage: string;
  dateFormat: string;
  logoUrl?: string;
}

export interface LocationContactDetails {
  address: string;
  postalCode?: string;
  phones: Array<{
    countryCode: string;
    number: string;
  }>;
  website?: string;
  businessHours?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface LocationDescription {
  content: string;
  plainText?: string;
}

export interface LocationPhotos {
  banner?: {
    url: string;
    caption?: string;
  };
  photos: Array<{
    url: string;
    caption?: string;
    order: number;
  }>;
}

export interface CompanyLegalDetails {
  type: 'legal_entity' | 'sole_proprietor' | 'partnership' | 'other';
  businessName: string;
  legalAddress?: string;
  actualAddress?: string;
  taxId?: string;
  industryCode?: string;
  bankCode?: string;
  bankName?: string;
  correspondentAccount?: string;
  cardPaymentAccount?: string;
}

export interface LocationSettings {
  id?: string;
  companyId: string;
  branchId?: string;
  basic: LocationBasicSettings;
  contact: LocationContactDetails;
  description?: LocationDescription;
  photos?: LocationPhotos;
  legal?: CompanyLegalDetails;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  active: boolean;
  isMain: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class LocationService {
  private getBranchEndpoint(companyId: string, branchId?: string): string {
    if (branchId) {
      return `/companies/${companyId}/branches/${branchId}`;
    }
    return `/companies/${companyId}`;
  }

  private getDefaultLocationSettings(
    companyId: string,
    branchId?: string,
    branchData?: { name?: string; address?: string; phone?: string; businessName?: string }
  ): LocationSettings {
    let phones = [{ countryCode: '+20', number: '' }];
    if (branchData?.phone) {
      const phoneMatch = branchData.phone.match(/^(\+\d+)(.*)$/);
      if (phoneMatch) {
        phones = [{ countryCode: phoneMatch[1], number: phoneMatch[2].trim() }];
      }
    }

    return {
      companyId,
      branchId,
      basic: {
        locationName: branchData?.name || 'الفرع الرئيسي',
        businessName: branchData?.businessName || '',
        category: '',
        city: '',
        notificationLanguage: 'ar',
        dateFormat: 'DD.MM.YYYY, HH:mm',
      },
      contact: {
        address: branchData?.address || '',
        phones,
      },
      active: true,
      isMain: !branchId,
    };
  }

  async getLocationSettings(companyId: string, branchId?: string): Promise<LocationSettings | null> {
    try {
      if (branchId) {
        const response = await apiClient.get<ApiResponse<any>>(
          `/companies/${companyId}/branches/${branchId}`
        );
        if (response.data.success && response.data.data) {
          const branch = response.data.data;
          return this.branchToLocationSettings(companyId, branchId, branch);
        }
      } else {
        const response = await apiClient.get<ApiResponse<any>>('/company/profile');
        if (response.data.success && response.data.data) {
          return this.companyToLocationSettings(companyId, response.data.data);
        }
      }
      return this.getDefaultLocationSettings(companyId, branchId, undefined);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return this.getDefaultLocationSettings(companyId, branchId, undefined);
      }
      console.error('Error getting location settings:', error);
      throw error;
    }
  }

  private branchToLocationSettings(companyId: string, branchId: string, branch: any): LocationSettings {
    return {
      id: branch.id,
      companyId,
      branchId,
      basic: {
        locationName: branch.name || '',
        businessName: branch.businessName || '',
        category: branch.category || '',
        city: branch.city || '',
        notificationLanguage: branch.notificationLanguage || 'ar',
        dateFormat: branch.dateFormat || 'DD.MM.YYYY, HH:mm',
        logoUrl: branch.logoUrl,
      },
      contact: {
        address: branch.address || '',
        postalCode: branch.postalCode,
        phones: branch.phones || [{ countryCode: '+20', number: branch.phone || '' }],
        website: branch.website,
        businessHours: branch.businessHours,
        coordinates: branch.coordinates,
      },
      description: branch.description ? { content: branch.description, plainText: branch.plainText } : undefined,
      photos: branch.photos,
      legal: branch.legal,
      socialMedia: branch.socialMedia,
      seo: branch.seo,
      active: branch.active !== false,
      isMain: branch.isDefault || false,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  private companyToLocationSettings(companyId: string, company: any): LocationSettings {
    return {
      id: company.id,
      companyId,
      basic: {
        locationName: company.name || '',
        businessName: company.name || '',
        category: company.category || company.businessType || '',
        city: company.city || '',
        notificationLanguage: company.notificationLanguage || 'ar',
        dateFormat: company.dateFormat || 'DD.MM.YYYY, HH:mm',
        logoUrl: company.logoUrl,
      },
      contact: {
        address: company.address || '',
        phones: company.phones || [{ countryCode: '+20', number: company.phone || '' }],
        website: company.website,
      },
      description: company.description ? { content: company.description } : undefined,
      socialMedia: company.socialMedia,
      active: true,
      isMain: true,
    };
  }

  async saveLocationSettings(
    companyId: string,
    settings: Partial<LocationSettings>,
    branchId?: string
  ): Promise<void> {
    try {
      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`,
          this.locationSettingsToUpdatePayload(settings)
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile',
          this.locationSettingsToUpdatePayload(settings)
        );
      }
    } catch (error) {
      console.error('Error saving location settings:', error);
      throw error;
    }
  }

  private locationSettingsToUpdatePayload(settings: Partial<LocationSettings>): any {
    const payload: any = {};
    if (settings.basic) {
      payload.name = settings.basic.locationName;
      payload.businessName = settings.basic.businessName;
      payload.category = settings.basic.category;
      payload.city = settings.basic.city;
      payload.notificationLanguage = settings.basic.notificationLanguage;
      payload.dateFormat = settings.basic.dateFormat;
      payload.logoUrl = settings.basic.logoUrl;
    }
    if (settings.contact) {
      payload.address = settings.contact.address;
      payload.postalCode = settings.contact.postalCode;
      payload.phones = settings.contact.phones;
      payload.website = settings.contact.website;
      payload.businessHours = settings.contact.businessHours;
      payload.coordinates = settings.contact.coordinates;
    }
    if (settings.description) payload.description = settings.description.content;
    if (settings.photos) payload.photos = settings.photos;
    if (settings.legal) payload.legal = settings.legal;
    if (settings.socialMedia) payload.socialMedia = settings.socialMedia;
    if (settings.seo) payload.seo = settings.seo;
    return payload;
  }

  async updateBasicSettings(
    companyId: string,
    basicSettings: Partial<LocationBasicSettings>,
    branchId?: string
  ): Promise<void> {
    try {
      const payload: any = {};
      if (basicSettings.locationName !== undefined) payload.name = basicSettings.locationName;
      if (basicSettings.businessName !== undefined) payload.businessName = basicSettings.businessName;
      if (basicSettings.category !== undefined) payload.category = basicSettings.category;
      if (basicSettings.city !== undefined) payload.city = basicSettings.city;
      if (basicSettings.notificationLanguage !== undefined) payload.notificationLanguage = basicSettings.notificationLanguage;
      if (basicSettings.dateFormat !== undefined) payload.dateFormat = basicSettings.dateFormat;
      if (basicSettings.logoUrl !== undefined) payload.logoUrl = basicSettings.logoUrl;

      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`, payload
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile', payload);
      }

      // Sync business name with company profile if changed
      if (basicSettings.businessName && branchId) {
        await this.updateCompanyBusinessName(companyId, basicSettings.businessName);
      }
    } catch (error) {
      console.error('Error updating basic settings:', error);
      throw error;
    }
  }

  async updateContactDetails(
    companyId: string,
    contactDetails: Partial<LocationContactDetails>,
    branchId?: string
  ): Promise<void> {
    try {
      const payload: any = {};
      if (contactDetails.address !== undefined) payload.address = contactDetails.address;
      if (contactDetails.postalCode !== undefined) payload.postalCode = contactDetails.postalCode;
      if (contactDetails.phones) payload.phones = contactDetails.phones;
      if (contactDetails.website !== undefined) payload.website = contactDetails.website;
      if (contactDetails.businessHours !== undefined) payload.businessHours = contactDetails.businessHours;
      if (contactDetails.coordinates) payload.coordinates = contactDetails.coordinates;

      // Derive phone string for branch
      if (contactDetails.phones?.length) {
        const primary = contactDetails.phones[0];
        payload.phone = `${primary.countryCode}${primary.number}`;
      }

      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`, payload
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile', payload);
      }
    } catch (error) {
      console.error('Error updating contact details:', error);
      throw error;
    }
  }

  async updateDescription(
    companyId: string,
    description: LocationDescription,
    branchId?: string
  ): Promise<void> {
    try {
      const payload = { description: description.content, plainText: description.plainText };
      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`, payload
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile', payload);
      }
    } catch (error) {
      console.error('Error updating description:', error);
      throw error;
    }
  }

  async updatePhotos(
    companyId: string,
    photos: LocationPhotos,
    branchId?: string
  ): Promise<void> {
    try {
      const payload = { photos };
      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`, payload
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile', payload);
      }
    } catch (error) {
      console.error('Error updating photos:', error);
      throw error;
    }
  }

  async updateLegalDetails(
    companyId: string,
    legalDetails: Partial<CompanyLegalDetails>,
    branchId?: string
  ): Promise<void> {
    try {
      const payload = { legal: legalDetails };
      if (branchId) {
        await apiClient.put<ApiResponse<void>>(
          `/companies/${companyId}/branches/${branchId}`, payload
        );
      } else {
        await apiClient.put<ApiResponse<void>>('/company/profile', payload);
      }
    } catch (error) {
      console.error('Error updating legal details:', error);
      throw error;
    }
  }

  subscribeToLocationSettings(
    companyId: string,
    onUpdate: (settings: LocationSettings | null) => void,
    onError?: (error: Error) => void,
    branchId?: string
  ): () => void {
    // Initial fetch
    this.getLocationSettings(companyId, branchId)
      .then(onUpdate)
      .catch((error) => {
        console.error('Error fetching location settings:', error);
        if (onError) onError(error);
      });

    // Poll every 30 seconds
    const interval = setInterval(() => {
      this.getLocationSettings(companyId, branchId)
        .then(onUpdate)
        .catch((error) => {
          console.error('Error polling location settings:', error);
          if (onError) onError(error);
        });
    }, 30000);

    return () => clearInterval(interval);
  }

  validatePhoneNumber(countryCode: string, phoneNumber: string): boolean {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    switch (countryCode) {
      case '+20': return cleanNumber.length === 10 || cleanNumber.length === 11;
      case '+1': return cleanNumber.length === 10;
      case '+44': return cleanNumber.length === 10 || cleanNumber.length === 11;
      default: return cleanNumber.length >= 7 && cleanNumber.length <= 15;
    }
  }

  formatBusinessHours(hours: string): string {
    return hours.trim();
  }

  getCities(): string[] {
    return [
      'القاهرة', 'الإسكندرية', 'الجيزة', 'شرم الشيخ', 'الغردقة',
      'الأقصر', 'أسوان', 'بورسعيد', 'السويس', 'المنصورة',
      'طنطا', 'أسيوط', 'الفيوم', 'الإسماعيلية', 'الزقازيق',
      'دمياط', 'المنيا', 'بني سويف', 'قنا', 'سوهاج',
    ];
  }

  getCitiesWithTranslation(): Array<{ value: string; labelAr: string; labelEn: string }> {
    return [
      { value: 'cairo', labelAr: 'القاهرة', labelEn: 'Cairo' },
      { value: 'alexandria', labelAr: 'الإسكندرية', labelEn: 'Alexandria' },
      { value: 'giza', labelAr: 'الجيزة', labelEn: 'Giza' },
      { value: 'sharm_el_sheikh', labelAr: 'شرم الشيخ', labelEn: 'Sharm El-Sheikh' },
      { value: 'hurghada', labelAr: 'الغردقة', labelEn: 'Hurghada' },
      { value: 'luxor', labelAr: 'الأقصر', labelEn: 'Luxor' },
      { value: 'aswan', labelAr: 'أسوان', labelEn: 'Aswan' },
      { value: 'port_said', labelAr: 'بورسعيد', labelEn: 'Port Said' },
      { value: 'suez', labelAr: 'السويس', labelEn: 'Suez' },
      { value: 'mansoura', labelAr: 'المنصورة', labelEn: 'Mansoura' },
      { value: 'tanta', labelAr: 'طنطا', labelEn: 'Tanta' },
      { value: 'asyut', labelAr: 'أسيوط', labelEn: 'Asyut' },
      { value: 'fayoum', labelAr: 'الفيوم', labelEn: 'Fayoum' },
      { value: 'ismailia', labelAr: 'الإسماعيلية', labelEn: 'Ismailia' },
      { value: 'zagazig', labelAr: 'الزقازيق', labelEn: 'Zagazig' },
      { value: 'damietta', labelAr: 'دمياط', labelEn: 'Damietta' },
      { value: 'minya', labelAr: 'المنيا', labelEn: 'Minya' },
      { value: 'beni_suef', labelAr: 'بني سويف', labelEn: 'Beni Suef' },
      { value: 'qena', labelAr: 'قنا', labelEn: 'Qena' },
      { value: 'sohag', labelAr: 'سوهاج', labelEn: 'Sohag' },
    ];
  }

  getBusinessCategories(): Array<{ value: string; labelAr: string; labelEn: string }> {
    return [
      { value: 'beauty_salon', labelAr: 'صالون تجميل', labelEn: 'Beauty Salon' },
      { value: 'barbershop', labelAr: 'صالون حلاقة', labelEn: 'Barbershop' },
      { value: 'spa_wellness', labelAr: 'سبا ومركز عافية', labelEn: 'Spa & Wellness' },
      { value: 'medical_clinic', labelAr: 'عيادة طبية', labelEn: 'Medical Clinic' },
      { value: 'dental_clinic', labelAr: 'عيادة أسنان', labelEn: 'Dental Clinic' },
      { value: 'fitness_center', labelAr: 'مركز لياقة بدنية', labelEn: 'Fitness Center' },
      { value: 'restaurant', labelAr: 'مطعم', labelEn: 'Restaurant' },
      { value: 'retail_store', labelAr: 'متجر بيع بالتجزئة', labelEn: 'Retail Store' },
      { value: 'professional_services', labelAr: 'خدمات مهنية', labelEn: 'Professional Services' },
      { value: 'educational_center', labelAr: 'مركز تعليمي', labelEn: 'Educational Center' },
      { value: 'photography_studio', labelAr: 'استوديو تصوير', labelEn: 'Photography Studio' },
      { value: 'event_planning', labelAr: 'تنظيم فعاليات', labelEn: 'Event Planning' },
      { value: 'automotive_services', labelAr: 'خدمات السيارات', labelEn: 'Automotive Services' },
      { value: 'pet_services', labelAr: 'خدمات الحيوانات الأليفة', labelEn: 'Pet Services' },
      { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
    ];
  }

  getBusinessCategoriesSimple(): string[] {
    return this.getBusinessCategories().map(cat => cat.labelAr);
  }

  mapBusinessTypeToCategory(businessType: string): string {
    const mappings: Record<string, string> = {
      'barbershop': 'صالون حلاقة',
      'beauty-salon': 'صالون تجميل',
      'beauty-center': 'سبا ومركز عافية',
      'hair-salon': 'صالون تجميل',
      'nail-salon': 'صالون تجميل',
      'gym': 'مركز لياقة بدنية',
      'spa': 'سبا ومركز عافية',
      'wellness-center': 'سبا ومركز عافية',
      'clinic': 'عيادة طبية',
      'dental': 'عيادة أسنان',
      'restaurant': 'مطعم',
      'cafe': 'مطعم',
      'retail': 'متجر بيع بالتجزئة',
      'professional': 'خدمات مهنية',
      'educational': 'مركز تعليمي',
      'other': 'أخرى',
    };
    return mappings[businessType] || 'أخرى';
  }

  private async updateCompanyBusinessName(companyId: string, businessName: string): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>('/company/profile', {
        name: businessName,
        businessName,
      });
    } catch (error) {
      console.error('Error updating company business name:', error);
    }
  }
}

export const locationService = new LocationService();
