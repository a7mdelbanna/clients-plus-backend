import { collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fix missing clients from online booking appointments
 * This will create client records for appointments that don't have associated clients
 */
export async function fixMissingClientsFromOnlineBooking(companyId: string) {
  console.log('=== FIXING MISSING CLIENTS FROM ONLINE BOOKING ===');
  console.log(`Company ID: ${companyId}`);
  
  try {
    // 1. Get all appointments from online booking
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('companyId', '==', companyId),
      where('source', '==', 'online')
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} online booking appointments`);
    
    // 2. Get all existing clients
    const clientsRef = collection(db, 'clients');
    const clientsQuery = query(clientsRef, where('companyId', '==', companyId));
    const clientsSnapshot = await getDocs(clientsQuery);
    
    const existingClients = new Map<string, any>();
    const existingPhones = new Set<string>();
    
    clientsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      existingClients.set(doc.id, { id: doc.id, ...data });
      if (data.phone) {
        existingPhones.add(data.phone);
      }
    });
    
    console.log(`Found ${existingClients.size} existing clients`);
    
    // 3. Check each appointment and create missing clients
    const missingClients: any[] = [];
    const appointmentsToUpdate: any[] = [];
    const phoneToClientId = new Map<string, string>();
    
    for (const appointmentDoc of snapshot.docs) {
      const appointment = appointmentDoc.data();
      
      // Skip if appointment already has a valid clientId
      if (appointment.clientId && existingClients.has(appointment.clientId)) {
        continue;
      }
      
      // Check if we need to create a client
      if (appointment.clientPhone && !existingPhones.has(appointment.clientPhone)) {
        // Check if we already plan to create this client (duplicate phone in appointments)
        if (!phoneToClientId.has(appointment.clientPhone)) {
          const clientData = {
            companyId: companyId,
            branchId: appointment.branchId,
            name: appointment.clientName || 'عميل من الحجز الإلكتروني',
            phone: appointment.clientPhone,
            email: appointment.clientEmail,
            source: 'online_booking',
            active: true,
            createdAt: appointment.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          // Remove undefined fields
          Object.keys(clientData).forEach(key => {
            if (clientData[key as keyof typeof clientData] === undefined) {
              delete clientData[key as keyof typeof clientData];
            }
          });
          
          missingClients.push(clientData);
          phoneToClientId.set(appointment.clientPhone, ''); // Will be updated after creation
        }
        
        appointmentsToUpdate.push({
          id: appointmentDoc.id,
          phone: appointment.clientPhone,
          appointment
        });
      }
    }
    
    console.log(`\nNeed to create ${missingClients.length} new clients`);
    console.log(`Need to update ${appointmentsToUpdate.length} appointments`);
    
    // 4. Create missing clients
    const createdClientIds = new Map<string, string>();
    
    for (const clientData of missingClients) {
      try {
        const docRef = await addDoc(collection(db, 'clients'), clientData);
        createdClientIds.set(clientData.phone, docRef.id);
        console.log(`Created client: ${clientData.name} (${clientData.phone}) - ID: ${docRef.id}`);
      } catch (error) {
        console.error(`Failed to create client for ${clientData.phone}:`, error);
      }
    }
    
    // 5. Update appointments with client IDs
    let updatedCount = 0;
    for (const { id, phone, appointment } of appointmentsToUpdate) {
      const clientId = createdClientIds.get(phone) || existingClients.get(phone)?.id;
      
      if (clientId) {
        try {
          await updateDoc(doc(db, 'appointments', id), {
            clientId: clientId,
            updatedAt: Timestamp.now()
          });
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update appointment ${id}:`, error);
        }
      }
    }
    
    console.log(`\n✅ Created ${createdClientIds.size} new clients`);
    console.log(`✅ Updated ${updatedCount} appointments with client IDs`);
    
    return {
      clientsCreated: createdClientIds.size,
      appointmentsUpdated: updatedCount,
      totalOnlineAppointments: snapshot.size
    };
    
  } catch (error) {
    console.error('Error fixing missing clients:', error);
    throw error;
  }
}

/**
 * Check how many appointments are missing clients
 */
export async function checkMissingClients(companyId: string) {
  console.log('=== CHECKING FOR MISSING CLIENTS ===');
  
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('companyId', '==', companyId),
      where('source', '==', 'online')
    );
    
    const snapshot = await getDocs(q);
    
    let missingClientCount = 0;
    let hasClientCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.clientId || data.clientId === '') {
        missingClientCount++;
        console.log(`Appointment ${doc.id} missing client - Name: ${data.clientName}, Phone: ${data.clientPhone}`);
      } else {
        hasClientCount++;
      }
    });
    
    console.log(`\nTotal online appointments: ${snapshot.size}`);
    console.log(`Appointments with clients: ${hasClientCount}`);
    console.log(`Appointments missing clients: ${missingClientCount}`);
    
    return {
      total: snapshot.size,
      withClient: hasClientCount,
      missingClient: missingClientCount
    };
    
  } catch (error) {
    console.error('Error checking missing clients:', error);
    throw error;
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).fixMissingClientsFromOnlineBooking = fixMissingClientsFromOnlineBooking;
  (window as any).checkMissingClients = checkMissingClients;
  console.log('Missing clients fix utilities loaded. Use:');
  console.log('- checkMissingClients(companyId) to see how many appointments are missing clients');
  console.log('- fixMissingClientsFromOnlineBooking(companyId) to create missing clients');
}