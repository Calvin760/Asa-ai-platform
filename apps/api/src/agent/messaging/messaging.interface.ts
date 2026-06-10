// src/agent/messaging/messaging.interface.ts

export interface SendMessageResult {
  success: boolean;
  providerMsgId: string;
  error?: string;
}

export interface IMessagingProvider {
  sendSms(to: string, body: string): Promise<SendMessageResult>;
  sendWhatsApp(to: string, body: string): Promise<SendMessageResult>;
}