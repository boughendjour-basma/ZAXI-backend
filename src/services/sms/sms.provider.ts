/**
 * ISMSProvider — Interface for SMS Gateway abstraction.
 *
 * Implementations (Twilio, Vonage, Firebase, Algerian local providers)
 * must implement this contract.
 */
export interface ISMSProvider {
  /**
   * Sends an SMS message to a phone number.
   * @param phone Normalized E.164 phone number
   * @param message Text message content
   * @returns Promise resolving to true if sent successfully, false otherwise
   */
  sendSMS(phone: string, message: string): Promise<boolean>;
}
