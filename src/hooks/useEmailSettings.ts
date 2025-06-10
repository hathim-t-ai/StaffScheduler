import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { RootState } from '../store';
import { updateEmailSettings } from '../store/slices/settingsSlice';

/**
 * Custom hook for managing email settings and scheduler
 */
export const useEmailSettings = () => {
  const dispatch = useDispatch();
  const emailSettings = useSelector((state: RootState) => state.settings.emailSettings || {
    enabled: false,
    reminderDay: 'thursday' as const,
    reminderTime: '14:00',
    fromEmail: 'hathimamirb@gmail.com',
    thresholdHours: 40
  });

  /**
   * Update email settings and sync with scheduler
   */
  const updateSettings = async (newSettings: Partial<typeof emailSettings>) => {
    try {
      // Update Redux state
      dispatch(updateEmailSettings(newSettings));
      
      // Sync with email scheduler
      const updatedSettings = { ...emailSettings, ...newSettings };
      await axios.post('/api/email/update-schedule', { emailSettings: updatedSettings });
      
      console.log('Email settings updated and synced with scheduler');
    } catch (error) {
      console.error('Failed to update email settings:', error);
      throw error;
    }
  };

  /**
   * Send email reminders immediately
   */
  const sendRemindersNow = async () => {
    try {
      const response = await axios.post('/api/email/send-now');
      return response.data;
    } catch (error) {
      console.error('Failed to send reminders now:', error);
      throw error;
    }
  };

  /**
   * Get email service status
   */
  const getEmailStatus = async () => {
    try {
      const response = await axios.get('/api/email/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get email status:', error);
      throw error;
    }
  };

  /**
   * Get staff with incomplete schedules
   */
  const getIncompleteStaff = async (thresholdHours = 40) => {
    try {
      const response = await axios.get(`/api/email/incomplete-staff?thresholdHours=${thresholdHours}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get incomplete staff:', error);
      throw error;
    }
  };

  /**
   * Get schedule information
   */
  const getScheduleInfo = async () => {
    try {
      const response = await axios.get('/api/email/schedule-info');
      return response.data;
    } catch (error) {
      console.error('Failed to get schedule info:', error);
      throw error;
    }
  };

  /**
   * Initialize scheduler on settings change
   */
  useEffect(() => {
    const syncScheduler = async () => {
      try {
        await axios.post('/api/email/update-schedule', { emailSettings });
      } catch (error) {
        console.error('Failed to sync email scheduler:', error);
      }
    };

    // Only sync if email settings are enabled and properly defined
    if (emailSettings && emailSettings.enabled) {
      syncScheduler();
    }
  }, [emailSettings?.enabled, emailSettings?.reminderDay, emailSettings?.reminderTime, emailSettings?.thresholdHours]);

  return {
    emailSettings,
    updateSettings,
    sendRemindersNow,
    getEmailStatus,
    getIncompleteStaff,
    getScheduleInfo,
  };
}; 