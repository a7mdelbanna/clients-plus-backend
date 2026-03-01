import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toDate } from '../utils/dateUtils';

export async function debugCheckAppointment(appointmentId: string) {
  try {
    console.log('=== DEBUG: Checking appointment ===');
    console.log('Appointment ID:', appointmentId);
    
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    
    if (!appointmentDoc.exists()) {
      console.error('Appointment not found!');
      return;
    }
    
    const data = appointmentDoc.data();
    console.log('Appointment data:', data);
    console.log('Branch ID:', data.branchId);
    console.log('Branch ID type:', typeof data.branchId);
    console.log('Company ID:', data.companyId);
    console.log('Staff ID:', data.staffId);
    console.log('Date:', toDate(data.date));
    console.log('Status:', data.status);
    console.log('Source:', data.source);
    
    return data;
  } catch (error) {
    console.error('Error checking appointment:', error);
  }
}

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugCheckAppointment = debugCheckAppointment;
}