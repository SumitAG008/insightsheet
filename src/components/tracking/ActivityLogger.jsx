// components/tracking/ActivityLogger.jsx - Update last_activity_date on every page view
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '@/api/entities';
import { UserActivity } from '@/api/entities';

// Get IP address and location
const getIPAndLocation = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ip: data.ip || 'Unknown',
      location: `${data.city || 'Unknown'}, ${data.country_name || 'Unknown'}`,
      country_code: data.country_code
    };
  } catch (error) {
    return {
      ip: 'Unknown',
      location: 'Unknown',
      country_code: 'XX'
    };
  }
};

// Get browser info
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  return browser;
};

export default function ActivityLogger({ children }) {
  const location = useLocation();

  const logPageView = useCallback(async () => {
    try {
      const currentUser = await User.me();
      const ipData = await getIPAndLocation();
      const browser = getBrowserInfo();
      
      // Log activity
      await UserActivity.create({
        user_email: currentUser.email,
        activity_type: 'page_view',
        page_name: location.pathname,
        details: JSON.stringify({ timestamp: new Date().toISOString() }),
        ip_address: ipData.ip,
        browser: browser
      });

      // Update last_activity_date in User entity
      await User.update(currentUser.id, {
        last_activity_date: new Date().toISOString()
      });
    } catch (error) {
      // User not logged in or error logging activity
      // Silently fail - activity logging should never break the app
      console.warn('Activity logging skipped:', error.message);
    }
  }, [location.pathname]);

  useEffect(() => {
    logPageView();
  }, [logPageView]);

  return children;
}

// Export logging functions for manual use
export const logActivity = async (activityType, details = {}) => {
  try {
    const currentUser = await User.me();
    const ipData = await getIPAndLocation();
    const browser = getBrowserInfo();
    
    await UserActivity.create({
      user_email: currentUser.email,
      activity_type: activityType,
      page_name: window.location.pathname,
      details: JSON.stringify(details),
      ip_address: ipData.ip,
      browser: browser
    });

    // Update last_activity_date
    await User.update(currentUser.id, {
      last_activity_date: new Date().toISOString()
    });
  } catch (error) {
    // Silently fail - activity logging should never break the app
    console.warn('Activity logging skipped:', error.message);
  }
};

export { getIPAndLocation, getBrowserInfo };