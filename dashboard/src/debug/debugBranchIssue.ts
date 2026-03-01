import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function debugBranchIssue(companyId: string) {
  console.log('=== COMPREHENSIVE BRANCH DEBUG ===');
  
  try {
    // 1. Get all branches
    console.log('\n1. ALL BRANCHES:');
    const branchesRef = collection(db, 'companies', companyId, 'branches');
    const branchSnapshot = await getDocs(branchesRef);
    
    const branches: any[] = [];
    branchSnapshot.docs.forEach(doc => {
      const data = doc.data();
      branches.push({
        id: doc.id,
        ...data
      });
      console.log(`Branch ${doc.id}:`, JSON.stringify(data, null, 2));
    });
    
    // 2. Get all appointments
    console.log('\n2. ALL APPOINTMENTS:');
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsQuery = query(appointmentsRef, where('companyId', '==', companyId));
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    
    const branchCounts: Record<string, number> = {};
    appointmentSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const branchId = data.branchId || 'NO_BRANCH';
      branchCounts[branchId] = (branchCounts[branchId] || 0) + 1;
    });
    
    console.log('Appointments by branch:', branchCounts);
    
    // 3. Check localStorage and React state
    console.log('\n3. CURRENT STATE:');
    console.log('localStorage selectedBranchId:', localStorage.getItem('selectedBranchId'));
    
    // 4. Test queries for each branch
    console.log('\n4. TESTING QUERIES FOR EACH BRANCH:');
    for (const branch of branches) {
      const testQuery = query(
        appointmentsRef,
        where('companyId', '==', companyId),
        where('branchId', '==', branch.id)
      );
      const testSnapshot = await getDocs(testQuery);
      console.log(`Branch ${branch.id} (${branch.name}): ${testSnapshot.size} appointments found`);
    }
    
    // 5. Check for appointments with branch ID '1' vs 'main'
    console.log('\n5. CHECKING SPECIAL BRANCH IDS:');
    const mainIds = ['1', 'main', undefined];
    for (const id of mainIds) {
      const testQuery = id === undefined 
        ? query(appointmentsRef, where('companyId', '==', companyId))
        : query(appointmentsRef, where('companyId', '==', companyId), where('branchId', '==', id));
      const testSnapshot = await getDocs(testQuery);
      console.log(`Branch ID "${id}": ${testSnapshot.size} appointments`);
    }
    
    // 6. Sample appointments to see exact branchId values
    console.log('\n6. SAMPLE APPOINTMENT BRANCH IDS:');
    let count = 0;
    appointmentSnapshot.docs.forEach(doc => {
      if (count < 5) {
        const data = doc.data();
        console.log(`Appointment ${doc.id}: branchId = "${data.branchId}" (type: ${typeof data.branchId})`);
        count++;
      }
    });
    
    return {
      branches,
      branchCounts,
      totalAppointments: appointmentSnapshot.size
    };
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Check what the appointments page is actually querying
export function debugAppointmentPageState() {
  console.log('\n=== APPOINTMENT PAGE STATE DEBUG ===');
  
  // Try to access React DevTools to get the actual state
  const reactRoot = document.getElementById('root');
  if (reactRoot && (reactRoot as any)._reactRootContainer) {
    console.log('React root found, checking for appointment page state...');
    
    // Log all branch-related items from localStorage
    console.log('\nLocalStorage items:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('branch')) {
        console.log(`${key}: ${localStorage.getItem(key)}`);
      }
    }
  }
  
  // Check window location
  console.log('\nCurrent URL:', window.location.href);
  console.log('URL includes branch param?', window.location.href.includes('branch'));
}

// Add to window
if (typeof window !== 'undefined') {
  (window as any).debugBranchIssue = debugBranchIssue;
  (window as any).debugAppointmentPageState = debugAppointmentPageState;
}