# Email Agent Setup Guide

This guide explains how to set up and configure the new Email Agent functionality in the Staff Scheduler application.

## Features

The Email Agent provides the following capabilities:

1. **Email Reminder Toggle**: Toggle on/off email reminders from the Schedule page
2. **Automatic Scheduled Reminders**: Send weekly reminders to staff with incomplete schedules
3. **On-demand Email Reminders**: Send custom reminders via chatbot commands
4. **Configurable Schedule**: Customize when automatic reminders are sent (day and time)
5. **Threshold Configuration**: Set minimum hours required for complete schedules

## Setup Instructions

### 1. Gmail App Password Setup

Since the system uses Gmail for sending emails, you'll need to create a Gmail App Password:

1. Go to your Google Account settings
2. Navigate to Security > 2-Step Verification
3. Enable 2-Step Verification if not already enabled
4. Go to App passwords
5. Generate a new app password for "Staff Scheduler" or "Mail"
6. Copy the generated 16-character password

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Email Configuration for Email Agent
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hathimamirb@gmail.com
SMTP_PASSWORD=your_gmail_app_password_here
EMAIL_FROM=hathimamirb@gmail.com
APP_URL=http://localhost:3000
```

Replace `your_gmail_app_password_here` with the Gmail App Password you generated.

### 3. Email Settings Configuration

1. Start the application
2. Navigate to **Settings > Email Settings**
3. Configure the following:
   - **Enable Email Reminders**: Toggle to activate email functionality
   - **Reminder Day**: Choose which day of the week to send automatic reminders (default: Thursday)
   - **Reminder Time**: Set the time for sending reminders (default: 14:00 / 2:00 PM)
   - **Minimum Required Hours**: Set threshold for incomplete schedules (default: 40 hours)
   - **From Email Address**: Confirm the sending email address

### 4. Schedule Page Toggle

On the **Schedule page**, you'll see a new **Email Reminders** toggle switch:
- Turn it ON to enable automatic email reminders
- Turn it OFF to disable automatic reminders
- This works in conjunction with the Email Settings configuration

## Usage

### Automatic Reminders

Once configured and enabled:
- The system automatically checks staff schedules every week on the configured day/time
- Staff with less than the threshold hours (default: 40) for the following week receive email reminders
- Only staff with valid email addresses in their profiles will receive reminders

### Manual Reminders via Chatbot

You can send custom reminders using the chatbot with commands like:
- "Send a reminder to John to fill in the scheduler"
- "Can you send a reminder to Sarah"
- "Send reminder to John"

The system will:
1. Find the staff member by name
2. Check their current schedule status
3. Send a personalized email reminder
4. Confirm the action in the chat

### Email Content

The email reminders include:
- Staff member's name
- Current assigned hours vs. required hours
- Week dates for the schedule
- Direct link to the Staff Scheduler application
- Professional formatting with company branding

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Ensure all email environment variables are correctly set
2. **Gmail App Password**: Verify the Gmail App Password is correct and hasn't expired
3. **Email Status**: Check `/api/email/status` endpoint or the application logs
4. **Staff Email Addresses**: Ensure staff have valid email addresses in their profiles

### Schedule Not Updating

1. **Email Settings**: Verify email settings are saved properly
2. **Toggle State**: Check that email reminders are enabled on the Schedule page
3. **Scheduler Service**: Check application logs for scheduler errors

### Common Error Messages

- **"Email service not configured"**: Missing or incorrect environment variables
- **"No staff member found"**: Staff name not found or no email address
- **"SMTP authentication failed"**: Incorrect Gmail credentials

## API Endpoints

The Email Agent adds the following API endpoints:

- `GET /api/email/status` - Check email service configuration
- `POST /api/email/send-reminders` - Send automatic reminders
- `POST /api/email/send-custom-reminder` - Send custom reminder to specific staff
- `GET /api/email/incomplete-staff` - Get staff with incomplete schedules
- `GET /api/email/schedule-info` - Get current schedule information
- `POST /api/email/update-schedule` - Update email schedule
- `POST /api/email/send-now` - Manually trigger reminders

## Security Considerations

- Gmail App Passwords are more secure than regular passwords
- Email addresses are validated before sending
- Staff can only receive reminders if they have email addresses in the system
- All email communications are logged for auditing

## Support

If you encounter issues:
1. Check the application logs for error messages
2. Verify your Gmail App Password is still valid
3. Test email configuration using the manual "Send Now" feature
4. Ensure staff profiles have valid email addresses

This email agent enhances the Staff Scheduler by automating communication with staff about incomplete schedules, improving schedule completion rates and operational efficiency. 