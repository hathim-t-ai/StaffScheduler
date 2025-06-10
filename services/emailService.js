const nodemailer = require('nodemailer');
const supabase = require('../supabaseClient');

/**
 * Email Service for Staff Scheduler
 * Handles both scheduled reminders and on-demand email notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter with Gmail SMTP configuration
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter verification failed:', error);
        } else {
          console.log('Email service ready');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured() {
    return !!(
      this.transporter &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.EMAIL_FROM
    );
  }

  /**
   * Send email to specific recipients
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      throw new Error('Email service is not properly configured');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Simple HTML to text conversion
   */
  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  /**
   * Get staff members with incomplete schedules for the following week
   */
  async getStaffWithIncompleteSchedules(thresholdHours = 40) {
    try {
      // Calculate next week's date range with improved logic
      const today = new Date();
      const nextMonday = new Date(today);
      
      // Find next Monday more reliably
      const daysUntilNextMonday = (8 - today.getDay()) % 7 || 7; // 0=Sunday, 1=Monday, etc.
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);
      
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6); // Next Sunday (6 days after Monday)

      const fromDate = nextMonday.toISOString().split('T')[0];
      const toDate = nextSunday.toISOString().split('T')[0];

      // Get all staff with valid email addresses
      const { data: allStaff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, department, grade')
        .not('email', 'is', null)
        .neq('email', '');

      if (staffError) {
        throw new Error('Failed to fetch staff: ' + staffError.message);
      }

      const incompleteStaff = [];

      for (const staff of allStaff) {
        // Get assignments for next week
        const { data: assignments, error: assignError } = await supabase
          .from('assignments')
          .select('hours')
          .eq('staff_id', staff.id)
          .gte('date', fromDate)
          .lte('date', toDate);

        if (assignError) {
          console.error(`Error fetching assignments for ${staff.name}:`, assignError);
          continue;
        }

        // Calculate total hours assigned
        const totalHours = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);

        if (totalHours < thresholdHours) {
          incompleteStaff.push({
            ...staff,
            assignedHours: totalHours,
            missingHours: thresholdHours - totalHours,
            weekStart: fromDate,
            weekEnd: toDate,
          });
        }
      }

      return incompleteStaff;
    } catch (error) {
      console.error('Error getting staff with incomplete schedules:', error);
      throw error;
    }
  }

  /**
   * Generate email template for schedule reminder
   */
  generateReminderTemplate(staffMember, isCustom = false) {
    const { name, assignedHours, missingHours, weekStart, weekEnd } = staffMember;
    
    const isComplete = assignedHours >= 40;
    const subject = isCustom 
      ? `Schedule Reminder - ${isComplete ? 'Weekly Schedule Review' : 'Please Complete Your Weekly Schedule'}`
      : `Weekly Schedule Reminder - Action Required`;

    // Dynamic content based on completion status
    let statusMessage, actionMessage, buttonText, alertColor, alertBorderColor, alertTextColor;
    
    if (isComplete) {
      statusMessage = `Your schedule for the week of <strong>${weekStart}</strong> to <strong>${weekEnd}</strong> 
        appears to be complete with <strong>${assignedHours} hours</strong> assigned. This is a friendly reminder 
        to review your schedule and make any necessary adjustments.`;
      actionMessage = 'Please review your schedule and make any necessary updates or adjustments.';
      buttonText = 'Review Your Schedule';
      alertColor = '#d1ecf1';
      alertBorderColor = '#bee5eb';
      alertTextColor = '#0c5460';
    } else {
      statusMessage = `Your schedule for the week of <strong>${weekStart}</strong> to <strong>${weekEnd}</strong> 
        is incomplete. You currently have <strong>${assignedHours} hours</strong> assigned, 
        but need <strong>${missingHours} more hours</strong> to reach the required 40 hours.`;
      actionMessage = 'Please log into the Staff Scheduler system and complete your schedule for the upcoming week.';
      buttonText = 'Complete Your Schedule';
      alertColor = '#fff3cd';
      alertBorderColor = '#ffeaa7';
      alertTextColor = '#856404';
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin: 0 0 10px 0;">Staff Scheduler Reminder</h2>
          <p style="color: #6c757d; margin: 0;">${isComplete ? 'Weekly Schedule Review' : 'Weekly Schedule Update Required'}</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <h3 style="color: #495057; margin-top: 0;">Hello ${name},</h3>
          
          <p style="color: #6c757d; line-height: 1.6;">
            ${statusMessage}
          </p>
          
          <div style="background-color: ${alertColor}; border: 1px solid ${alertBorderColor}; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h4 style="color: ${alertTextColor}; margin: 0 0 10px 0;">${isComplete ? '📋 Review Requested' : '📋 Action Required'}</h4>
            <p style="color: ${alertTextColor}; margin: 0; line-height: 1.5;">
              ${actionMessage}
            </p>
          </div>
          
          <div style="margin: 25px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              ${buttonText}
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
            If you have any questions or need assistance, please contact your supervisor or the scheduling team.
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
          <p style="color: #6c757d; font-size: 12px; margin: 0; text-align: center;">
            This is an automated message from the Staff Scheduler system. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Send reminder to a specific staff member
   */
  async sendStaffReminder(staffMember, isCustom = false) {
    if (!staffMember.email) {
      throw new Error(`No email address found for ${staffMember.name}`);
    }

    const { subject, html } = this.generateReminderTemplate(staffMember, isCustom);

    try {
      const result = await this.sendEmail({
        to: staffMember.email,
        subject,
        html,
      });

      console.log(`Reminder sent to ${staffMember.name} (${staffMember.email})`);
      return result;
    } catch (error) {
      console.error(`Failed to send reminder to ${staffMember.name}:`, error);
      throw error;
    }
  }

  /**
   * Send reminders to all staff with incomplete schedules
   */
  async sendAutomaticReminders(thresholdHours = 40) {
    try {
      const incompleteStaff = await this.getStaffWithIncompleteSchedules(thresholdHours);
      
      if (incompleteStaff.length === 0) {
        console.log('No staff members need schedule reminders');
        return { success: true, count: 0, staff: [] };
      }

      const results = [];
      
      for (const staff of incompleteStaff) {
        try {
          await this.sendStaffReminder(staff, false);
          results.push({ name: staff.name, email: staff.email, success: true });
        } catch (error) {
          console.error(`Failed to send reminder to ${staff.name}:`, error);
          results.push({ name: staff.name, email: staff.email, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Sent ${successCount}/${incompleteStaff.length} reminder emails`);
      
      return {
        success: true,
        count: successCount,
        total: incompleteStaff.length,
        staff: incompleteStaff.map(s => ({ name: s.name, email: s.email, assignedHours: s.assignedHours })),
        results
      };
    } catch (error) {
      console.error('Error sending automatic reminders:', error);
      throw error;
    }
  }

  /**
   * Find staff member by name for chatbot functionality
   */
  async findStaffByName(staffName) {
    try {
      const { data: staff, error } = await supabase
        .from('staff')
        .select('id, name, email, department, grade')
        .ilike('name', `%${staffName}%`)
        .not('email', 'is', null)
        .neq('email', '');

      if (error) {
        throw new Error('Failed to find staff: ' + error.message);
      }

      return staff;
    } catch (error) {
      console.error('Error finding staff by name:', error);
      throw error;
    }
  }

  /**
   * Get actual assigned hours for a specific staff member for next week
   */
  async getStaffAssignedHours(staffId, thresholdHours = 40) {
    try {
      // Calculate next week's date range with improved logic
      const today = new Date();
      const nextMonday = new Date(today);
      
      // Find next Monday more reliably
      const daysUntilNextMonday = (8 - today.getDay()) % 7 || 7; // 0=Sunday, 1=Monday, etc.
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);
      
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6); // Next Sunday (6 days after Monday)

      const fromDate = nextMonday.toISOString().split('T')[0];
      const toDate = nextSunday.toISOString().split('T')[0];

      console.log(`Checking assignments for staff ${staffId} from ${fromDate} to ${toDate}`);

      // Get assignments for next week for this specific staff member
      const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('hours')
        .eq('staff_id', staffId)
        .gte('date', fromDate)
        .lte('date', toDate);

      if (assignError) {
        throw new Error(`Failed to fetch assignments: ${assignError.message}`);
      }

      // Calculate total hours assigned
      const totalHours = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);
      
      console.log(`Staff ${staffId} has ${totalHours} hours assigned for next week (${fromDate} to ${toDate})`);
      
      return {
        assignedHours: totalHours,
        missingHours: Math.max(0, thresholdHours - totalHours),
        weekStart: fromDate,
        weekEnd: toDate,
      };
    } catch (error) {
      console.error('Error getting staff assigned hours:', error);
      throw error;
    }
  }

  /**
   * Send custom reminder via chatbot
   */
  async sendCustomReminder(staffName) {
    try {
      const staffMembers = await this.findStaffByName(staffName);
      
      if (staffMembers.length === 0) {
        throw new Error(`No staff member found with name "${staffName}" or they don't have an email address`);
      }

      if (staffMembers.length > 1) {
        throw new Error(`Multiple staff members found with name "${staffName}". Please be more specific.`);
      }

      const staff = staffMembers[0];
      
      // Get actual assigned hours for this staff member
      const scheduleData = await this.getStaffAssignedHours(staff.id, 40);
      
      // Build complete staff schedule info with actual data
      const staffScheduleInfo = {
        ...staff,
        assignedHours: scheduleData.assignedHours,
        missingHours: scheduleData.missingHours,
        weekStart: scheduleData.weekStart,
        weekEnd: scheduleData.weekEnd,
      };

      await this.sendStaffReminder(staffScheduleInfo, true);
      
      return {
        success: true,
        staffName: staff.name,
        email: staff.email,
        assignedHours: staffScheduleInfo.assignedHours,
      };
    } catch (error) {
      console.error('Error sending custom reminder:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 