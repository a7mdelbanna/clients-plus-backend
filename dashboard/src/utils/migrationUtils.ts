import { contactService } from '../services/contact.service';
import { expenseService } from '../services/expense.service';
import { staffService } from '../services/staff.service';
import { clientService } from '../services/client.service';
import { Vendor } from '../types/expense.types';
import { Staff } from '../types/staff.types';
import { Client } from '../types/client.types';

export class ContactMigrationUtils {
  /**
   * Migrate all vendors to contacts
   */
  static async migrateVendorsToContacts(companyId: string, userId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ vendorId: string; error: string }>;
  }> {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ vendorId: string; error: string }>,
    };

    try {
      // Get all vendors
      const vendors = await expenseService.getVendors(companyId);
      results.total = vendors.length;

      // Migrate each vendor
      for (const vendor of vendors) {
        try {
          // Check if contact already exists
          const existingContact = await contactService.findContactByRelatedEntity(
            companyId,
            'vendorId',
            vendor.id!
          );

          if (!existingContact) {
            await contactService.createContactFromVendor(companyId, vendor, userId);
            results.successful++;
          } else {
            results.successful++; // Already migrated
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            vendorId: vendor.id!,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Error migrating vendors:', error);
      throw error;
    }

    return results;
  }

  /**
   * Migrate all staff to contacts
   */
  static async migrateStaffToContacts(companyId: string, userId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ staffId: string; error: string }>;
  }> {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ staffId: string; error: string }>,
    };

    try {
      // Get all staff
      const staff = await staffService.getStaff(companyId);
      results.total = staff.length;

      // Migrate each staff member
      for (const member of staff) {
        try {
          // Check if contact already exists
          const existingContact = await contactService.findContactByRelatedEntity(
            companyId,
            'staffId',
            member.id!
          );

          if (!existingContact) {
            await contactService.createContactFromStaff(companyId, member, userId);
            results.successful++;
          } else {
            results.successful++; // Already migrated
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            staffId: member.id!,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Error migrating staff:', error);
      throw error;
    }

    return results;
  }

  /**
   * Migrate all clients to contacts
   */
  static async migrateClientsToContacts(companyId: string, userId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ clientId: string; error: string }>;
  }> {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ clientId: string; error: string }>,
    };

    try {
      // Get all clients
      const { clients } = await clientService.getClients(companyId);
      results.total = clients.length;

      // Migrate each client
      for (const client of clients) {
        try {
          // Check if contact already exists
          const existingContact = await contactService.findContactByRelatedEntity(
            companyId,
            'clientId',
            client.id!
          );

          if (!existingContact) {
            await contactService.createContactFromClient(companyId, client, userId);
            results.successful++;
          } else {
            results.successful++; // Already migrated
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            clientId: client.id!,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Error migrating clients:', error);
      throw error;
    }

    return results;
  }

  /**
   * Migrate all entities to contacts
   */
  static async migrateAllToContacts(companyId: string, userId: string): Promise<{
    vendors: { total: number; successful: number; failed: number };
    staff: { total: number; successful: number; failed: number };
    clients: { total: number; successful: number; failed: number };
  }> {
    const results = {
      vendors: { total: 0, successful: 0, failed: 0 },
      staff: { total: 0, successful: 0, failed: 0 },
      clients: { total: 0, successful: 0, failed: 0 },
    };

    try {
      // Migrate vendors
      console.log('Starting vendor migration...');
      const vendorResults = await this.migrateVendorsToContacts(companyId, userId);
      results.vendors = {
        total: vendorResults.total,
        successful: vendorResults.successful,
        failed: vendorResults.failed,
      };
      console.log(`Vendor migration complete: ${vendorResults.successful}/${vendorResults.total} successful`);

      // Migrate staff
      console.log('Starting staff migration...');
      const staffResults = await this.migrateStaffToContacts(companyId, userId);
      results.staff = {
        total: staffResults.total,
        successful: staffResults.successful,
        failed: staffResults.failed,
      };
      console.log(`Staff migration complete: ${staffResults.successful}/${staffResults.total} successful`);

      // Migrate clients
      console.log('Starting client migration...');
      const clientResults = await this.migrateClientsToContacts(companyId, userId);
      results.clients = {
        total: clientResults.total,
        successful: clientResults.successful,
        failed: clientResults.failed,
      };
      console.log(`Client migration complete: ${clientResults.successful}/${clientResults.total} successful`);

      console.log('All migrations complete!', results);
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }

    return results;
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).ContactMigrationUtils = ContactMigrationUtils;
  (window as any).migrateAllToContacts = async () => {
    const user = (window as any).__currentUser;
    if (!user?.companyId || !user?.uid) {
      console.error('User not authenticated or missing companyId');
      return;
    }
    return ContactMigrationUtils.migrateAllToContacts(user.companyId, user.uid);
  };
}