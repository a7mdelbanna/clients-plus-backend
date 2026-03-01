import { db } from '../config/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getBookingAppUrl } from '../config/urls';

/**
 * Fix existing booking links to use the correct booking app URL
 * This is a one-time migration to update links that were created with the wrong URL
 */
export async function fixBookingLinkUrls() {
  try {
    console.log('Starting to fix booking link URLs...');
    
    // Get all booking links
    const bookingLinksRef = collection(db, 'bookingLinks');
    const snapshot = await getDocs(bookingLinksRef);
    
    let updatedCount = 0;
    const bookingAppUrl = getBookingAppUrl();
    
    for (const linkDoc of snapshot.docs) {
      const linkData = linkDoc.data();
      const currentUrl = linkData.fullUrl;
      
      // Check if the URL needs to be updated
      if (currentUrl && !currentUrl.startsWith(bookingAppUrl)) {
        // Extract the company slug and link slug from the current URL
        const urlParts = currentUrl.split('/');
        const linkSlug = urlParts[urlParts.length - 1];
        const companySlug = urlParts[urlParts.length - 2];
        
        // Generate the correct URL
        const newUrl = `${bookingAppUrl}/book/${companySlug}/${linkSlug}`;
        
        // Update the document
        await updateDoc(doc(db, 'bookingLinks', linkDoc.id), {
          fullUrl: newUrl
        });
        
        console.log(`Updated link ${linkDoc.id}: ${currentUrl} -> ${newUrl}`);
        updatedCount++;
      }
    }
    
    console.log(`✅ Fixed ${updatedCount} booking link URLs`);
    return updatedCount;
  } catch (error) {
    console.error('Error fixing booking link URLs:', error);
    throw error;
  }
}

// Make it available in the browser console for manual execution
if (typeof window !== 'undefined') {
  (window as any).fixBookingLinkUrls = fixBookingLinkUrls;
}