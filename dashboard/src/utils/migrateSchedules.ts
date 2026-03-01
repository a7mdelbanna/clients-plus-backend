import { collection, getDocs, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toDateSafe } from './dateUtils';
import type { Staff } from '../services/staff.service';

/**
 * Migrates existing staff schedules to add scheduleStartDate
 * For employees who have personalInfo.registrationStartDate, use that as the schedule start date
 * Otherwise, calculate from scheduledUntil date
 */
export async function migrateStaffSchedules(companyId: string) {
  try {
    console.log('Starting schedule migration for company:', companyId);
    
    // Get all staff with schedules
    const q = query(
      collection(db, 'staff'),
      where('companyId', '==', companyId),
      where('schedule.isScheduled', '==', true)
    );
    
    const snapshot = await getDocs(q);
    let migrated = 0;
    
    for (const staffDoc of snapshot.docs) {
      const staff = staffDoc.data() as Staff;
      
      // Check if this staff needs migration
      if (staff.schedule?.isScheduled && !staff.schedule.scheduleStartDate) {
        console.log(`Migrating schedule for ${staff.name}`);
        
        let startDate: Date;
        
        // First check if employee has a registration start date
        if (staff.personalInfo?.registrationStartDate) {
          startDate = toDateSafe(staff.personalInfo.registrationStartDate);
          console.log(`Using registration start date for ${staff.name}: ${startDate.toDateString()}`);
        } else if (staff.schedule.scheduledUntil) {
          // Fallback: Calculate from end date
          const endDate = toDateSafe(staff.schedule.scheduledUntil);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 14); // Default 2 weeks back
          console.log(`Calculated start date for ${staff.name}: ${startDate.toDateString()}`);
        } else {
          // If no dates available, use today
          startDate = new Date();
          console.log(`Using today as start date for ${staff.name}`);
        }
        
        // Update the document
        await updateDoc(doc(db, 'staff', staffDoc.id), {
          'schedule.scheduleStartDate': Timestamp.fromDate(startDate)
        });
        
        migrated++;
      }
    }
    
    console.log(`Migration complete. Updated ${migrated} staff schedules`);
    return migrated;
  } catch (error) {
    console.error('Error migrating schedules:', error);
    throw error;
  }
}

/**
 * Fix a specific employee's schedule start date
 * Useful for debugging specific employees
 */
export async function fixEmployeeScheduleStartDate(
  employeeId: string, 
  startDate: Date
): Promise<void> {
  try {
    console.log(`Fixing schedule start date for employee ${employeeId}`);
    
    await updateDoc(doc(db, 'staff', employeeId), {
      'schedule.scheduleStartDate': Timestamp.fromDate(startDate)
    });
    
    console.log(`Successfully updated schedule start date to ${startDate.toDateString()}`);
  } catch (error) {
    console.error('Error fixing employee schedule:', error);
    throw error;
  }
}

// Add to window for manual execution if needed
if (typeof window !== 'undefined') {
  (window as any).migrateStaffSchedules = migrateStaffSchedules;
  (window as any).fixEmployeeScheduleStartDate = fixEmployeeScheduleStartDate;
}