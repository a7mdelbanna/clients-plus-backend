import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Sync staff assignments from staff documents to branch documents
 * This ensures the branch.staff array reflects the actual staff assignments
 */
export async function syncStaffBranches(companyId: string) {
  console.log('=== SYNCING STAFF-BRANCH ASSIGNMENTS ===');
  console.log(`Company ID: ${companyId}`);
  
  try {
    // 1. Get all branches
    const branchesRef = collection(db, 'companies', companyId, 'branches');
    const branchSnapshot = await getDocs(branchesRef);
    
    const branches = new Map<string, any>();
    branchSnapshot.docs.forEach(doc => {
      branches.set(doc.id, {
        ref: doc.ref,
        data: doc.data(),
        newStaff: [] as string[]
      });
    });
    
    console.log(`Found ${branches.size} branches`);
    
    // 2. Get all staff members from the global staff collection
    const staffRef = collection(db, 'staff');
    const staffQuery = query(staffRef, where('companyId', '==', companyId));
    const staffSnapshot = await getDocs(staffQuery);
    
    console.log(`Found ${staffSnapshot.size} staff members`);
    
    // 3. Build the correct staff arrays for each branch
    let staffWithBranches = 0;
    staffSnapshot.docs.forEach(doc => {
      const staffData = doc.data();
      const staffId = doc.id;
      
      // Check both new branchIds array and legacy branchId field
      const assignedBranches: string[] = [];
      
      if (staffData.branchIds && Array.isArray(staffData.branchIds)) {
        assignedBranches.push(...staffData.branchIds);
      } else if (staffData.branchId) {
        assignedBranches.push(staffData.branchId);
      }
      
      if (assignedBranches.length > 0) {
        staffWithBranches++;
        assignedBranches.forEach(branchId => {
          const branch = branches.get(branchId);
          if (branch) {
            branch.newStaff.push(staffId);
          }
        });
      }
    });
    
    console.log(`${staffWithBranches} staff members have branch assignments`);
    
    // 4. Update branches with correct staff arrays
    const batch = writeBatch(db);
    let updatesNeeded = 0;
    
    branches.forEach((branch, branchId) => {
      const currentStaff = branch.data.staff || [];
      const newStaff = branch.newStaff;
      
      // Check if update is needed
      const currentSet = new Set(currentStaff);
      const newSet = new Set(newStaff);
      
      const needsUpdate = currentStaff.length !== newStaff.length ||
        !currentStaff.every((id: string) => newSet.has(id));
      
      if (needsUpdate) {
        console.log(`\nBranch ${branchId} (${branch.data.name}):`);
        console.log(`  Current staff: [${currentStaff.join(', ')}]`);
        console.log(`  New staff: [${newStaff.join(', ')}]`);
        
        batch.update(branch.ref, {
          staff: newStaff,
          updatedAt: new Date()
        });
        updatesNeeded++;
      }
    });
    
    if (updatesNeeded > 0) {
      await batch.commit();
      console.log(`\n✅ Updated ${updatesNeeded} branches with correct staff assignments`);
    } else {
      console.log('\n✅ All branches already have correct staff assignments');
    }
    
    // 5. Return summary
    const summary: any = {
      branchCount: branches.size,
      staffCount: staffSnapshot.size,
      staffWithBranches,
      updatesApplied: updatesNeeded,
      branches: {}
    };
    
    branches.forEach((branch, branchId) => {
      summary.branches[branchId] = {
        name: branch.data.name,
        staffCount: branch.newStaff.length,
        staff: branch.newStaff
      };
    });
    
    return summary;
    
  } catch (error) {
    console.error('Error syncing staff branches:', error);
    throw error;
  }
}

/**
 * Check staff-branch assignment consistency
 */
export async function checkStaffBranchConsistency(companyId: string) {
  console.log('=== CHECKING STAFF-BRANCH CONSISTENCY ===');
  
  try {
    // Get all branches with their staff arrays
    const branchesRef = collection(db, 'companies', companyId, 'branches');
    const branchSnapshot = await getDocs(branchesRef);
    
    const branchStaff = new Map<string, Set<string>>();
    branchSnapshot.docs.forEach(doc => {
      const data = doc.data();
      branchStaff.set(doc.id, new Set(data.staff || []));
    });
    
    // Get all staff with their branch assignments
    const staffRef = collection(db, 'staff');
    const staffQuery = query(staffRef, where('companyId', '==', companyId));
    const staffSnapshot = await getDocs(staffQuery);
    
    const issues: string[] = [];
    
    staffSnapshot.docs.forEach(doc => {
      const staffData = doc.data();
      const staffId = doc.id;
      const staffName = staffData.name;
      
      // Get assigned branches
      const assignedBranches: string[] = [];
      if (staffData.branchIds && Array.isArray(staffData.branchIds)) {
        assignedBranches.push(...staffData.branchIds);
      } else if (staffData.branchId) {
        assignedBranches.push(staffData.branchId);
      }
      
      // Check each assigned branch
      assignedBranches.forEach(branchId => {
        const branchStaffSet = branchStaff.get(branchId);
        if (!branchStaffSet || !branchStaffSet.has(staffId)) {
          issues.push(`Staff "${staffName}" (${staffId}) is assigned to branch ${branchId} but not in branch's staff array`);
        }
      });
      
      // Check if staff appears in branches they're not assigned to
      branchStaff.forEach((staffSet, branchId) => {
        if (staffSet.has(staffId) && !assignedBranches.includes(branchId)) {
          issues.push(`Staff "${staffName}" (${staffId}) appears in branch ${branchId}'s staff array but is not assigned to it`);
        }
      });
    });
    
    if (issues.length > 0) {
      console.log('\n❌ Found consistency issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log(`\nRun syncStaffBranches('${companyId}') to fix these issues`);
    } else {
      console.log('\n✅ All staff-branch assignments are consistent');
    }
    
    return {
      consistent: issues.length === 0,
      issues
    };
    
  } catch (error) {
    console.error('Error checking consistency:', error);
    throw error;
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).syncStaffBranches = syncStaffBranches;
  (window as any).checkStaffBranchConsistency = checkStaffBranchConsistency;
  console.log('Staff-branch sync utilities loaded. Use:');
  console.log('- syncStaffBranches(companyId) to sync staff assignments');
  console.log('- checkStaffBranchConsistency(companyId) to check for issues');
}