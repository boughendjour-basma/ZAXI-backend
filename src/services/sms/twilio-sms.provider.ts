import { ISMSProvider } from './sms.provider';

export class TwilioSMSProvider implements ISMSProvider {
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private fromPhone: string | undefined;

  // Stores sent messages in memory for test assertions
  public sentMessages: Array<{ phone: string; message: string; timestamp: Date }> = [];

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    this.sentMessages.push({ phone, message, timestamp: new Date() });

    // Mock mode if Twilio credentials are not configured (e.g. dev/test)
    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      console.log(`[TwilioSMSProvider (Mock Mode)]: SMS to ${phone} -> "${message}"`);
      return true;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: phone,
        From: this.fromPhone,
        Body: message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        console.error(`[TwilioSMSProvider Error]: HTTP ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TwilioSMSProvider Exception]:', error);
      return false;
    }
  }

  clearSentMessages() {
    this.sentMessages = [];
  }
}
