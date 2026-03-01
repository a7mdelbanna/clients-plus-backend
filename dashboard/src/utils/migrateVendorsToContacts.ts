import { contactService } from '../services/contact.service';
import { expenseService } from '../services/expense.service';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { ContactType } from '../types/contact.types';
import type { Vendor } from '../types/expense.types';
import type { Contact } from '../types/contact.types';

/**
 * Migration utility to convert existing vendors to unified contacts system
 * This ensures backward compatibility and data preservation
 */

interface MigrationResult {
  totalVendors: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
  vendorToContactMap: Record<string, string>; // vendorId -> contactId mapping
}

/**
 * Main migration function to convert all vendors to contacts
 */
export async function migrateVendorsToContacts(
  companyId: string,
  userId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalVendors: 0,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
    vendorToContactMap: {},
  };

  try {
    console.log('Starting vendor to contact migration for company:', companyId);

    // Step 1: Get all vendors from the vendor collection
    const vendorsSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'vendors')
    );

    result.totalVendors = vendorsSnapshot.size;
    console.log(`Found ${result.totalVendors} vendors to migrate`);

    // Step 2: Process each vendor
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendor = { id: vendorDoc.id, ...vendorDoc.data() } as Vendor;

      try {
        // Check if this vendor already has a corresponding contact
        const existingContact = await contactService.findContactByRelatedEntity(
          companyId,
          'vendorId',
          vendor.id!
        );

        if (existingContact) {
          console.log(`Vendor ${vendor.name} already migrated, skipping...`);
          result.skippedCount++;
          result.vendorToContactMap[vendor.id!] = existingContact.id!;
          continue;
        }

        // Map vendor type to contact type
        const contactType = mapVendorTypeToContactType(vendor.type);

        // Create contact from vendor
        const contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'code'> = {
          companyId,
          type: contactType,
          status: vendor.status === 'active' ? 'active' : 'inactive',
          displayName: vendor.name,
          nameAr: vendor.nameAr,
          companyName: vendor.name,
          companyNameAr: vendor.nameAr,
          
          // Contact information
          phones: vendor.phone ? [{
            number: vendor.phone,
            type: 'work',
            isPrimary: true,
          }] : [],
          emails: vendor.email ? [{
            email: vendor.email,
            type: 'work',
            isPrimary: true,
          }] : [],
          addresses: vendor.address ? [{
            ...vendor.address,
            type: 'work',
            isPrimary: true,
          }] : [],
          
          // Business information
          website: vendor.website,
          taxNumber: vendor.taxNumber,
          commercialRegister: vendor.commercialRegister,
          
          // Contact persons
          contactPersons: vendor.contactPerson ? [{
            name: vendor.contactPerson,
            isPrimary: true,
          }] : [],
          
          // Financial information
          financial: {
            creditDays: vendor.paymentTerms?.creditDays,
            creditLimit: vendor.paymentTerms?.creditLimit,
            defaultPaymentMethod: vendor.paymentTerms?.defaultMethod,
            totalTransactions: vendor.totalTransactions || 0,
            totalAmount: vendor.totalAmount || 0,
            bankAccounts: vendor.paymentTerms?.bankAccount ? [{
              ...vendor.paymentTerms.bankAccount,
              currency: vendor.paymentTerms.bankAccount.currency || 'EGP',
            }] : [],
          },
          
          // Tags and categories
          tags: vendor.tags || [],
          categoryId: vendor.categoryId,
          
          // Notes
          notes: vendor.notes,
          
          // Important: Store the original vendor ID for reference
          relatedEntities: {
            vendorId: vendor.id,
          },
          
          // Metadata
          createdBy: userId,
        };

        // Create the contact
        const newContactId = await contactService.createContact(contactData);
        
        console.log(`Migrated vendor ${vendor.name} to contact ${newContactId}`);
        result.migratedCount++;
        result.vendorToContactMap[vendor.id!] = newContactId;

      } catch (error) {
        console.error(`Error migrating vendor ${vendor.name}:`, error);
        result.errorCount++;
        result.errors.push(`Failed to migrate vendor ${vendor.name}: ${error}`);
      }
    }

    // Step 3: Update expense transactions to use contactId
    console.log('Updating expense transactions...');
    await updateExpenseTransactions(companyId, result.vendorToContactMap);

    console.log('Migration completed:', result);
    return result;

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Map vendor type to contact type
 */
function mapVendorTypeToContactType(vendorType?: string): ContactType {
  switch (vendorType) {
    case 'supplier':
      return ContactType.SUPPLIER;
    case 'contractor':
      return ContactType.CONTRACTOR;
    case 'service_provider':
      return ContactType.VENDOR;
    case 'utility':
      return ContactType.VENDOR;
    case 'other':
    default:
      return ContactType.VENDOR;
  }
}

/**
 * Update expense transactions to use contactId instead of vendorId
 */
async function updateExpenseTransactions(
  companyId: string,
  vendorToContactMap: Record<string, string>
): Promise<void> {
  try {
    // Get all expense transactions
    const transactionsSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'transactions')
    );

    const batch = writeBatch(db);
    let updateCount = 0;

    for (const transDoc of transactionsSnapshot.docs) {
      const transaction = transDoc.data();
      
      // Check if this is an expense transaction with a vendorId
      if (
        transaction.type === 'expense' &&
        transaction.expenseDetails?.vendorId &&
        vendorToContactMap[transaction.expenseDetails.vendorId]
      ) {
        // Update to use contactId
        const updatedExpenseDetails = {
          ...transaction.expenseDetails,
          contactId: vendorToContactMap[transaction.expenseDetails.vendorId],
          // Keep vendorId for backward compatibility during transition
          vendorId: transaction.expenseDetails.vendorId,
        };

        batch.update(
          doc(db, 'companies', companyId, 'transactions', transDoc.id),
          { expenseDetails: updatedExpenseDetails }
        );

        updateCount++;

        // Firestore batch limit is 500
        if (updateCount % 450 === 0) {
          await batch.commit();
          console.log(`Updated ${updateCount} expense transactions...`);
        }
      }
    }

    // Commit remaining updates
    if (updateCount % 450 !== 0) {
      await batch.commit();
    }

    console.log(`Updated ${updateCount} expense transactions with contact IDs`);
  } catch (error) {
    console.error('Error updating expense transactions:', error);
    throw error;
  }
}

/**
 * Verify migration status for a company
 */
export async function verifyMigrationStatus(companyId: string): Promise<{
  vendorCount: number;
  contactCount: number;
  migratedCount: number;
  pendingCount: number;
}> {
  try {
    // Count vendors
    const vendorsSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'vendors')
    );
    const vendorCount = vendorsSnapshot.size;

    // Count contacts that were migrated from vendors
    const { contacts } = await contactService.getContacts(companyId, {
      types: [ContactType.VENDOR, ContactType.SUPPLIER, ContactType.CONTRACTOR],
    });

    // Count how many have relatedEntities.vendorId
    const migratedCount = contacts.filter(c => c.relatedEntities?.vendorId).length;
    const contactCount = contacts.length;

    return {
      vendorCount,
      contactCount,
      migratedCount,
      pendingCount: vendorCount - migratedCount,
    };
  } catch (error) {
    console.error('Error verifying migration status:', error);
    throw error;
  }
}

/**
 * Rollback migration (for testing or if something goes wrong)
 */
export async function rollbackVendorMigration(
  companyId: string
): Promise<void> {
  try {
    console.log('Starting migration rollback...');

    // Get all contacts that were migrated from vendors
    const { contacts } = await contactService.getContacts(companyId, {
      types: [ContactType.VENDOR, ContactType.SUPPLIER, ContactType.CONTRACTOR],
    });

    const migratedContacts = contacts.filter(c => c.relatedEntities?.vendorId);

    // Delete migrated contacts
    for (const contact of migratedContacts) {
      if (contact.id) {
        await contactService.deleteContact(companyId, contact.id);
        console.log(`Deleted migrated contact: ${contact.displayName}`);
      }
    }

    // Revert expense transactions to use vendorId only
    const transactionsSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'transactions')
    );

    const batch = writeBatch(db);
    let revertCount = 0;

    for (const transDoc of transactionsSnapshot.docs) {
      const transaction = transDoc.data();
      
      if (
        transaction.type === 'expense' &&
        transaction.expenseDetails?.contactId
      ) {
        // Remove contactId, keep vendorId
        const updatedExpenseDetails = {
          ...transaction.expenseDetails,
        };
        delete updatedExpenseDetails.contactId;

        batch.update(
          doc(db, 'companies', companyId, 'transactions', transDoc.id),
          { expenseDetails: updatedExpenseDetails }
        );

        revertCount++;

        if (revertCount % 450 === 0) {
          await batch.commit();
        }
      }
    }

    if (revertCount % 450 !== 0) {
      await batch.commit();
    }

    console.log(`Rollback completed. Reverted ${revertCount} transactions`);
  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).migrateVendorsToContacts = migrateVendorsToContacts;
  (window as any).verifyMigrationStatus = verifyMigrationStatus;
  (window as any).rollbackVendorMigration = rollbackVendorMigration;
}