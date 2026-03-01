import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function debugCheckAppointmentQueries(companyId: string, branchId: string, date: Date) {
  try {
    console.log('=== DEBUG: Checking appointment queries ===');
    console.log('Company ID:', companyId);
    console.log('Branch ID:', branchId);
    console.log('Branch ID type:', typeof branchId);
    console.log('Date:', date);
    
    // Set date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Date range:', startOfDay, 'to', endOfDay);
    
    // Query 1: All appointments for company on this date
    console.log('\n--- Query 1: All appointments for company on date ---');
    const q1 = query(
      collection(db, 'appointments'),
      where('companyId', '==', companyId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );
    const snapshot1 = await getDocs(q1);
    console.log('Total appointments found:', snapshot1.size);
    
    snapshot1.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ID: ${doc.id}, Branch: ${data.branchId}, Staff: ${data.staffId}, Time: ${data.startTime}`);
    });
    
    // Query 2: Appointments for specific branch
    console.log('\n--- Query 2: Appointments for specific branch ---');
    const q2 = query(
      collection(db, 'appointments'),
      where('companyId', '==', companyId),
      where('branchId', '==', branchId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );
    const snapshot2 = await getDocs(q2);
    console.log('Branch appointments found:', snapshot2.size);
    
    snapshot2.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ID: ${doc.id}, Staff: ${data.staffId}, Time: ${data.startTime}`);
    });
    
    // Query 3: Check different branchId values
    console.log('\n--- Query 3: Checking all unique branch IDs in appointments ---');
    const q3 = query(
      collection(db, 'appointments'),
      where('companyId', '==', companyId)
    );
    const snapshot3 = await getDocs(q3);
    const branchIds = new Set<string>();
    
    snapshot3.docs.forEach(doc => {
      const data = doc.data();
      if (data.branchId) {
        branchIds.add(data.branchId);
      }
    });
    
    console.log('Unique branch IDs found in appointments:', Array.from(branchIds));
    
    return {
      totalAppointments: snapshot1.size,
      branchAppointments: snapshot2.size,
      uniqueBranchIds: Array.from(branchIds)
    };
  } catch (error) {
    console.error('Error checking appointment queries:', error);
  }
}

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugCheckAppointmentQueries = debugCheckAppointmentQueries;
}