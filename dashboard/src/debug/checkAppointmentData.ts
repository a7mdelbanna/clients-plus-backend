import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function checkAppointmentData(companyId: string, staffId: string, branchId: string) {
  console.log('=== CHECKING APPOINTMENT DATA ===');
  console.log(`Company: ${companyId}`);
  console.log(`Staff: ${staffId}`);
  console.log(`Branch: ${branchId}`);
  
  try {
    // 1. Get all appointments for this company
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('companyId', '==', companyId),
      orderBy('date', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    console.log(`\nFound ${snapshot.size} recent appointments`);
    
    // 2. Filter and analyze appointments
    let staffAppointments = 0;
    let branchAppointments = 0;
    let staffBranchAppointments = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const appointmentDate = data.date?.toDate?.() || data.date;
      
      // Check if this appointment matches our criteria
      const isForStaff = data.staffId === staffId;
      const isForBranch = data.branchId === branchId;
      
      if (isForStaff) staffAppointments++;
      if (isForBranch) branchAppointments++;
      if (isForStaff && isForBranch) staffBranchAppointments++;
      
      // Log appointments for our specific staff member
      if (isForStaff) {
        console.log(`\nAppointment ${doc.id}:`);
        console.log(`  Date: ${appointmentDate}`);
        console.log(`  Branch: ${data.branchId}`);
        console.log(`  Staff: ${data.staffId}`);
        console.log(`  Client: ${data.clientName}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Source: ${data.source || 'Not specified'}`);
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total appointments for staff ${staffId}: ${staffAppointments}`);
    console.log(`Total appointments for branch ${branchId}: ${branchAppointments}`);
    console.log(`Appointments for staff in this branch: ${staffBranchAppointments}`);
    
    // 3. Check specific query that the appointments page uses
    console.log('\n=== TESTING APPOINTMENT PAGE QUERY ===');
    const testQuery = query(
      appointmentsRef,
      where('companyId', '==', companyId),
      where('branchId', '==', branchId),
      where('staffId', '==', staffId)
    );
    
    const testSnapshot = await getDocs(testQuery);
    console.log(`Query result: ${testSnapshot.size} appointments found`);
    
    if (testSnapshot.size === 0) {
      // Try without branch filter
      const noBranchQuery = query(
        appointmentsRef,
        where('companyId', '==', companyId),
        where('staffId', '==', staffId)
      );
      const noBranchSnapshot = await getDocs(noBranchQuery);
      console.log(`Without branch filter: ${noBranchSnapshot.size} appointments found`);
      
      if (noBranchSnapshot.size > 0) {
        console.log('\n⚠️  Appointments exist but have different branch IDs:');
        noBranchSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  - Appointment ${doc.id}: branchId = "${data.branchId}"`);
        });
      }
    }
    
    return {
      totalStaffAppointments: staffAppointments,
      totalBranchAppointments: branchAppointments,
      staffBranchAppointments: staffBranchAppointments
    };
    
  } catch (error) {
    console.error('Error checking appointments:', error);
    throw error;
  }
}

// Check appointment date ranges
export async function checkAppointmentDateRange(companyId: string, startDate: Date, endDate: Date) {
  console.log('\n=== CHECKING APPOINTMENTS IN DATE RANGE ===');
  console.log(`From: ${startDate.toISOString()}`);
  console.log(`To: ${endDate.toISOString()}`);
  
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('companyId', '==', companyId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} appointments in range`);
    
    const byBranch: Record<string, number> = {};
    const byStaff: Record<string, number> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      byBranch[data.branchId] = (byBranch[data.branchId] || 0) + 1;
      byStaff[data.staffId] = (byStaff[data.staffId] || 0) + 1;
    });
    
    console.log('\nBy Branch:', byBranch);
    console.log('By Staff:', byStaff);
    
    return {
      total: snapshot.size,
      byBranch,
      byStaff
    };
    
  } catch (error) {
    console.error('Error checking date range:', error);
    throw error;
  }
}

// Add to window
if (typeof window !== 'undefined') {
  (window as any).checkAppointmentData = checkAppointmentData;
  (window as any).checkAppointmentDateRange = checkAppointmentDateRange;
  console.log('Appointment debug functions loaded. Use:');
  console.log('- checkAppointmentData(companyId, staffId, branchId)');
  console.log('- checkAppointmentDateRange(companyId, startDate, endDate)');
}