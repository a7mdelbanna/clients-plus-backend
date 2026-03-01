import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';

// Utility to check and fix client branch assignments
export async function analyzeClientBranches(companyId: string) {
  try {
    console.log('=== Analyzing Client Branch Assignments ===');
    console.log('Company ID:', companyId);
    
    // Get all clients for the company
    const q = query(
      collection(db, 'clients'),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Total clients found:', clients.length);
    
    // Group clients by branch
    const clientsByBranch: { [key: string]: any[] } = {
      'no-branch': []
    };
    
    clients.forEach(client => {
      const branchId = client.branchId || 'no-branch';
      if (!clientsByBranch[branchId]) {
        clientsByBranch[branchId] = [];
      }
      clientsByBranch[branchId].push({
        id: client.id,
        name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        phone: client.phone || client.phoneNumbers?.[0]?.number || 'No phone',
        createdAt: client.createdAt?.toDate?.() || 'Unknown',
        branchId: client.branchId
      });
    });
    
    // Display results
    console.log('\n=== Clients by Branch ===');
    Object.entries(clientsByBranch).forEach(([branchId, branchClients]) => {
      console.log(`\nBranch: ${branchId}`);
      console.log(`Count: ${branchClients.length}`);
      console.log('Clients:', branchClients);
    });
    
    return {
      total: clients.length,
      byBranch: clientsByBranch,
      noBranchCount: clientsByBranch['no-branch'].length
    };
  } catch (error) {
    console.error('Error analyzing clients:', error);
    throw error;
  }
}

// Fix clients without branch by assigning them to the main branch
export async function fixClientsWithoutBranch(companyId: string, targetBranchId: string = 'main') {
  try {
    console.log('=== Fixing Clients Without Branch ===');
    console.log('Company ID:', companyId);
    console.log('Target Branch ID:', targetBranchId);
    
    // Get all clients without branchId
    const q = query(
      collection(db, 'clients'),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    const clientsToFix: any[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.branchId) {
        clientsToFix.push({
          id: doc.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          phone: data.phone || data.phoneNumbers?.[0]?.number || 'No phone'
        });
      }
    });
    
    console.log(`Found ${clientsToFix.length} clients without branch ID`);
    
    if (clientsToFix.length === 0) {
      console.log('No clients need fixing');
      return { fixed: 0 };
    }
    
    // Update each client
    let fixed = 0;
    for (const client of clientsToFix) {
      try {
        await updateDoc(doc(db, 'clients', client.id), {
          branchId: targetBranchId
        });
        console.log(`Fixed client: ${client.name} (${client.id})`);
        fixed++;
      } catch (error) {
        console.error(`Error fixing client ${client.id}:`, error);
      }
    }
    
    console.log(`\nFixed ${fixed} out of ${clientsToFix.length} clients`);
    return { fixed, total: clientsToFix.length };
  } catch (error) {
    console.error('Error fixing clients:', error);
    throw error;
  }
}

// Get current branch info
export async function getCurrentBranchInfo(companyId: string) {
  try {
    console.log('=== Getting Branch Information ===');
    
    // Get all branches for the company
    const branchesSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'branches')
    );
    
    const branches = branchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Branches found:', branches);
    
    return branches;
  } catch (error) {
    console.error('Error getting branches:', error);
    throw error;
  }
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).analyzeClientBranches = analyzeClientBranches;
  (window as any).fixClientsWithoutBranch = fixClientsWithoutBranch;
  (window as any).getCurrentBranchInfo = getCurrentBranchInfo;
}