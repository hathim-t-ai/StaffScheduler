const cron = require('node-cron');
const emailService = require('./emailService');

/**
 * Email Scheduler Service
 * Manages automatic email reminders based on configured schedule
 */
class EmailScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.currentSettings = null;
  }

  /**
   * Update the email schedule based on settings
   */
  updateSchedule(emailSettings) {
    // Stop existing jobs
    this.stopAllJobs();
    
    // Store current settings
    this.currentSettings = emailSettings;
    
    if (!emailSettings.enabled) {
      console.log('Email reminders disabled - no scheduled jobs created');
      return;
    }

    // Create cron pattern based on day and time
    const cronPattern = this.createCronPattern(emailSettings.reminderDay, emailSettings.reminderTime);
    
    if (!cronPattern) {
      console.error('Invalid email schedule configuration');
      return;
    }

    // Schedule the job
    const job = cron.schedule(cronPattern, async () => {
      console.log(`Running scheduled email reminders - ${new Date().toISOString()}`);
      try {
        const result = await emailService.sendAutomaticReminders(emailSettings.thresholdHours);
        console.log(`Scheduled email reminders completed:`, result);
      } catch (error) {
        console.error('Scheduled email reminders failed:', error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'UTC' // Use UTC to avoid timezone issues
    });

    // Store and start the job
    this.scheduledJobs.set('emailReminders', job);
    job.start();
    
    console.log(`Email reminders scheduled for ${emailSettings.reminderDay} at ${emailSettings.reminderTime} UTC`);
    console.log(`Cron pattern: ${cronPattern}`);
  }

  /**
   * Create cron pattern from day and time
   */
  createCronPattern(day, time) {
    // Parse time (format: "HH:mm")
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      console.error('Invalid time format:', time);
      return null;
    }

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error('Invalid time values:', time);
      return null;
    }

    // Map day names to cron day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    const dayNumber = dayMap[day.toLowerCase()];
    if (dayNumber === undefined) {
      console.error('Invalid day:', day);
      return null;
    }

    // Return cron pattern: "minute hour * * dayOfWeek"
    return `${minutes} ${hours} * * ${dayNumber}`;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    this.scheduledJobs.forEach((job, name) => {
      job.destroy();
      console.log(`Stopped scheduled job: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Check if email reminders are currently scheduled
   */
  isScheduled() {
    return this.scheduledJobs.has('emailReminders') && this.currentSettings?.enabled;
  }

  /**
   * Get current schedule information
   */
  getScheduleInfo() {
    if (!this.currentSettings || !this.currentSettings.enabled) {
      return { enabled: false, scheduled: false };
    }

    return {
      enabled: true,
      scheduled: this.isScheduled(),
      day: this.currentSettings.reminderDay,
      time: this.currentSettings.reminderTime,
      thresholdHours: this.currentSettings.thresholdHours,
      cronPattern: this.createCronPattern(this.currentSettings.reminderDay, this.currentSettings.reminderTime)
    };
  }

  /**
   * Force run email reminders immediately (for testing)
   */
  async runNow() {
    if (!this.currentSettings) {
      throw new Error('No email settings configured');
    }

    console.log('Running email reminders manually...');
    const result = await emailService.sendAutomaticReminders(this.currentSettings.thresholdHours);
    console.log('Manual email reminders completed:', result);
    return result;
  }
}

module.exports = new EmailScheduler(); 