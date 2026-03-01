import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function checkStaffAssignments(companyId: string, branchId: string) {
  console.log('=== CHECKING STAFF ASSIGNMENTS ===');
  console.log(`Company ID: ${companyId}`);
  console.log(`Branch ID: ${branchId}`);
  
  try {
    // 1. Get the branch document to see its staff array
    console.log('\n1. BRANCH DOCUMENT:');
    const branchRef = doc(db, 'companies', companyId, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    
    if (branchDoc.exists()) {
      const branchData = branchDoc.data();
      console.log('Branch data:', JSON.stringify(branchData, null, 2));
      console.log('Staff array in branch:', branchData.staff || 'NO STAFF ARRAY');
    } else {
      console.log('Branch document not found!');
    }
    
    // 2. Get all staff members
    console.log('\n2. ALL STAFF MEMBERS:');
    const staffRef = collection(db, 'companies', companyId, 'staff');
    const staffSnapshot = await getDocs(staffRef);
    
    const staffByBranch: Record<string, any[]> = {};
    staffSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\nStaff ${doc.id}:`);
      console.log('- Name:', data.name);
      console.log('- Branch IDs:', data.branchIds || 'NO BRANCH IDS');
      console.log('- Available for online booking:', data.availableForOnlineBooking);
      console.log('- Active:', data.active);
      console.log('- Full data:', JSON.stringify(data, null, 2));
      
      // Group by branch
      if (data.branchIds && Array.isArray(data.branchIds)) {
        data.branchIds.forEach((bid: string) => {
          if (!staffByBranch[bid]) staffByBranch[bid] = [];
          staffByBranch[bid].push({
            id: doc.id,
            name: data.name,
            availableForOnlineBooking: data.availableForOnlineBooking,
            active: data.active
          });
        });
      }
    });
    
    // 3. Show staff grouped by branch
    console.log('\n3. STAFF GROUPED BY BRANCH:');
    Object.entries(staffByBranch).forEach(([bid, staff]) => {
      console.log(`\nBranch ${bid}:`);
      staff.forEach(s => {
        console.log(`  - ${s.id}: ${s.name} (online: ${s.availableForOnlineBooking}, active: ${s.active})`);
      });
    });
    
    // 4. Specifically check the two staff IDs mentioned
    console.log('\n4. CHECKING SPECIFIC STAFF IDS:');
    const staffIds = ['JkV1c68UaWf8a7CWD2Gw', 'xbLNUKf8KhGa3YelU5HB'];
    
    for (const staffId of staffIds) {
      const staffDocRef = doc(db, 'companies', companyId, 'staff', staffId);
      const staffDoc = await getDoc(staffDocRef);
      
      if (staffDoc.exists()) {
        const data = staffDoc.data();
        console.log(`\nStaff ${staffId}:`);
        console.log('- Name:', data.name);
        console.log('- Branch IDs:', data.branchIds);
        console.log('- Available for online booking:', data.availableForOnlineBooking);
        console.log('- Works in branch', branchId, '?', data.branchIds?.includes(branchId));
      } else {
        console.log(`\nStaff ${staffId}: NOT FOUND`);
      }
    }
    
    // 5. Check how the staff service queries staff
    console.log('\n5. TESTING STAFF SERVICE QUERY:');
    // This mimics what the staff service does
    let staffQuery = query(staffRef);
    
    // The staff service filters by active status
    staffQuery = query(staffQuery, where('active', '==', true));
    
    const filteredSnapshot = await getDocs(staffQuery);
    console.log(`Active staff count: ${filteredSnapshot.size}`);
    
    // Check which staff would be returned for this branch
    const staffForBranch: any[] = [];
    filteredSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.branchIds?.includes(branchId)) {
        staffForBranch.push({
          id: doc.id,
          name: data.name,
          branchIds: data.branchIds
        });
      }
    });
    
    console.log(`\nStaff that should show for branch ${branchId}:`, staffForBranch);
    
    return {
      branchStaffArray: branchDoc.exists() ? branchDoc.data().staff : null,
      staffByBranch,
      staffForBranch
    };
    
  } catch (error) {
    console.error('Error checking staff assignments:', error);
    throw error;
  }
}

// Check staff field structure
export async function checkStaffFieldStructure(companyId: string) {
  console.log('\n=== CHECKING STAFF FIELD STRUCTURE ===');
  
  try {
    const staffRef = collection(db, 'companies', companyId, 'staff');
    const snapshot = await getDocs(staffRef);
    
    console.log(`Total staff documents: ${snapshot.size}`);
    
    // Check field variations
    const fieldVariations: Record<string, number> = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check for different field names that might store branch info
      const possibleFields = ['branchIds', 'branchId', 'branches', 'branch'];
      possibleFields.forEach(field => {
        if (data[field] !== undefined) {
          fieldVariations[field] = (fieldVariations[field] || 0) + 1;
          console.log(`\nStaff ${doc.id} has ${field}:`, data[field]);
        }
      });
    });
    
    console.log('\nField variations found:', fieldVariations);
    
  } catch (error) {
    console.error('Error checking staff structure:', error);
  }
}

// Fix staff assignments for a specific branch
export async function fixBranchStaffAssignments(companyId: string, branchId: string) {
  console.log('\n=== FIXING BRANCH STAFF ASSIGNMENTS ===');
  console.log(`Company: ${companyId}, Branch: ${branchId}`);
  
  try {
    // Get all staff members from the global staff collection
    const staffRef = collection(db, 'staff');
    const staffQuery = query(staffRef, where('companyId', '==', companyId));
    const staffSnapshot = await getDocs(staffQuery);
    
    // Find staff that should be in this branch
    const staffForBranch: string[] = [];
    staffSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if staff is assigned to this branch
      let isAssigned = false;
      if (data.branchIds && Array.isArray(data.branchIds)) {
        isAssigned = data.branchIds.includes(branchId);
      } else if (data.branchId === branchId) {
        isAssigned = true;
      }
      
      if (isAssigned && data.active !== false) {
        staffForBranch.push(doc.id);
        console.log(`- Staff ${data.name} (${doc.id}) should be in branch`);
      }
    });
    
    // Update the branch document
    const branchRef = doc(db, 'companies', companyId, 'branches', branchId);
    await updateDoc(branchRef, {
      staff: staffForBranch,
      updatedAt: new Date()
    });
    
    console.log(`\n✅ Updated branch with ${staffForBranch.length} staff members`);
    console.log('Staff IDs:', staffForBranch);
    
    return {
      branchId,
      staffCount: staffForBranch.length,
      staffIds: staffForBranch
    };
    
  } catch (error) {
    console.error('Error fixing branch staff:', error);
    throw error;
  }
}

// Add to window
if (typeof window !== 'undefined') {
  (window as any).checkStaffAssignments = checkStaffAssignments;
  (window as any).checkStaffFieldStructure = checkStaffFieldStructure;
  (window as any).fixBranchStaffAssignments = fixBranchStaffAssignments;
  console.log('Staff debug functions loaded. Use:');
  console.log('- checkStaffAssignments(companyId, branchId)');
  console.log('- checkStaffFieldStructure(companyId)');
  console.log('- fixBranchStaffAssignments(companyId, branchId)');
}