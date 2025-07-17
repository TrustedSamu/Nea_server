import { NextResponse } from 'next/server';
import { logEmail, getNotificationSettings } from '@/app/lib/firebase';
import { readFileSync } from 'fs';
import { join } from 'path';

// Function to encode UTF-8 string for email headers
function encodeEmailHeader(text: string) {
  return `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`;
}

// Function to create multipart message
function createEmailWithEmbeddedImages(to: string, from: string, subject: string, htmlContent: string, images: { id: string, path: string }[]) {
  // Read and encode the images
  const imageData = images.map(img => ({
    ...img,
    base64: readFileSync(img.path).toString('base64')
  }));
  
  // Generate a boundary string
  const boundary = `----=_Part_${Math.random().toString(36).substr(2)}`;
  
  // Construct the multipart message
  const message = [
    `Content-Type: multipart/related; boundary="${boundary}"`,
    'MIME-Version: 1.0',
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodeEmailHeader(subject)}`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent,
    ''
  ];

  // Add each image
  imageData.forEach(img => {
    message.push(
      `--${boundary}`,
      'Content-Type: image/png',
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${img.id}>`,
      '',
      img.base64,
      ''
    );
  });

  message.push(`--${boundary}--`);

  return Buffer.from(message.join('\r\n')).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(request: Request) {
  let subject = 'Unknown';
  let body = 'Unknown';
  
  try {
    console.log('📧 Starting email send process...');
    
    ({ subject, body } = await request.json());
    console.log('📧 Received request with subject:', subject);

    // Get the configured notification email
    console.log('📧 Fetching notification settings...');
    const settings = await getNotificationSettings();
    const notificationEmail = settings.notificationEmail;
    console.log('📧 Will send to:', notificationEmail);

    // Get a new access token using the refresh token
    console.log('📧 Requesting new access token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('📧 Failed to get access token:', errorData);
      throw new Error(`Token request failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('📧 Successfully obtained new access token');

    if (!tokenData.access_token) {
      console.error('📧 No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    // Create the email with embedded images
    const images = [
      {
        id: 's2-logo',
        path: join(process.cwd(), 'public', 'New_Full_Black-Red.png')
      }
    ];

    const raw = createEmailWithEmbeddedImages(
      notificationEmail,
      `NEA GmbH <${process.env.GOOGLE_EMAIL}>`,
      subject,
      body,
      images
    );

    // Send the email via Gmail API
    console.log('📧 Sending email via Gmail API...');
    const emailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('📧 Gmail API error:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log('📧 Email sent successfully:', emailResult);

    // Log the email
    console.log('📧 Logging successful email to Firebase...');
    await logEmail({
      to: notificationEmail,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'success'
    });

    console.log('📧 Email process completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('📧 Error in email process:', error);
    
    // Log the error details
    if (error instanceof Error) {
      console.error('📧 Error name:', error.name);
      console.error('📧 Error message:', error.message);
      console.error('📧 Error stack:', error.stack);
    }
    
    try {
      // Get the configured notification email for logging
      console.log('📧 Attempting to log failed email...');
      const settings = await getNotificationSettings().catch(() => ({ notificationEmail: 'Unknown' }));
      
      // Log the failed attempt
      await logEmail({
        to: settings.notificationEmail,
        subject,
        body,
        sentAt: new Date().toISOString(),
        status: 'failed'
      });
      console.log('📧 Failed email logged to Firebase');
    } catch (logError) {
      console.error('📧 Failed to log error to Firebase:', logError);
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 