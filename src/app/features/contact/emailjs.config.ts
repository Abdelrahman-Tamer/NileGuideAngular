export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export const EMAILJS_CONFIG: EmailJsConfig = {
  serviceId: 'service_0qvqh7b',
  templateId: 'template_72niidd',
  publicKey: 'ebjRGK0N_i2dBBTPT'
};

export function isEmailJsConfigReady(config: EmailJsConfig): boolean {
  return Object.values(config).every((value) => value.trim() !== '' && !value.startsWith('YOUR_'));
}
