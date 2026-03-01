import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

export const storageService = {
  async uploadCompanyLogo(
    file: File,
    companyId: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/company-logo',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading company logo:', error);
      throw new Error(error.response?.data?.message || 'حدث خطأ في رفع الشعار. يرجى المحاولة مرة أخرى.');
    }
  },

  async uploadServiceImage(
    companyId: string,
    serviceId: string,
    file: File,
    _imageName?: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceId', serviceId);

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/service-images',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading service image:', error);
      throw new Error(error.response?.data?.message || 'حدث خطأ في رفع الصورة. يرجى المحاولة مرة أخرى.');
    }
  },

  async deleteServiceImage(imageUrl: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>('/upload/service-images', {
        data: { url: imageUrl },
      });
    } catch (error) {
      console.error('Error deleting service image:', error);
      // Don't throw error as image might already be deleted
    }
  },

  async uploadMultipleServiceImages(
    companyId: string,
    serviceId: string,
    files: File[]
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map(file =>
        this.uploadServiceImage(companyId, serviceId, file)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple service images:', error);
      throw error;
    }
  },

  async uploadBusinessPhoto(
    file: File,
    companyId: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'business_photo');

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/business-photos',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading business photo:', error);
      throw new Error(error.response?.data?.message || 'حدث خطأ في رفع الصورة. يرجى المحاولة مرة أخرى.');
    }
  },

  async uploadBusinessBanner(
    file: File,
    companyId: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/business-banner',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading business banner:', error);
      throw new Error(error.response?.data?.message || 'حدث خطأ في رفع صورة الغلاف. يرجى المحاولة مرة أخرى.');
    }
  },

  /**
   * Generic file upload. Determines the upload type from the path hint.
   * Supports: avatar, service, document, logo, invoice.
   */
  async uploadFile(
    file: File,
    path: string
  ): Promise<string> {
    try {
      // Determine upload type from path
      let type = 'document';
      const lowerPath = path.toLowerCase();
      if (lowerPath.includes('avatar') || lowerPath.includes('staff') || lowerPath.includes('profile')) {
        type = 'avatar';
      } else if (lowerPath.includes('service')) {
        type = 'service';
      } else if (lowerPath.includes('logo')) {
        type = 'logo';
      } else if (lowerPath.includes('invoice')) {
        type = 'invoice';
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({ path }));

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        `/upload/${type}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw new Error(error.response?.data?.message || 'حدث خطأ في رفع الملف. يرجى المحاولة مرة أخرى.');
    }
  }
};
