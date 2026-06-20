import { environment } from '../../../environments/environment';

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export const EMAILJS_CONFIG: EmailJsConfig = environment.emailJs;

export function isEmailJsConfigReady(config: EmailJsConfig): boolean {
  return Object.values(config).every((value) => value.trim() !== '' && !value.startsWith('YOUR_'));
}
