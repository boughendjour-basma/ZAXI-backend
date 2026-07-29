import { ISMSProvider } from './sms.provider';
import { TwilioSMSProvider } from './twilio-sms.provider';

class SMSServiceClass {
  private provider: ISMSProvider;

  constructor(provider?: ISMSProvider) {
    this.provider = provider || new TwilioSMSProvider();
  }

  /**
   * Sets a custom SMS provider (useful for testing or switching gateways).
   */
  setProvider(provider: ISMSProvider): void {
    this.provider = provider;
  }

  /**
   * Gets current provider instance.
   */
  getProvider(): ISMSProvider {
    return this.provider;
  }

  /**
   * Sends an SMS message using the configured provider.
   */
  async sendSMS(phone: string, message: string): Promise<boolean> {
    return this.provider.sendSMS(phone, message);
  }
}

export const SMSService = new SMSServiceClass();
