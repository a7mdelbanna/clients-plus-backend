import React from 'react';
import { useParams } from 'react-router-dom';

const PublicBookingWrapper: React.FC = () => {
  const { companySlug, linkSlug } = useParams<{ companySlug: string; linkSlug: string }>();
  
  // For now, redirect to the booking app
  React.useEffect(() => {
    window.location.href = `http://localhost:5174/book/${companySlug}/${linkSlug}`;
  }, [companySlug, linkSlug]);
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>جاري التحويل إلى صفحة الحجز...</h2>
        <p>Redirecting to booking page...</p>
      </div>
    </div>
  );
};

export default PublicBookingWrapper;