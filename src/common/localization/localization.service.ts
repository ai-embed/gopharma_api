import { Injectable } from '@nestjs/common';
import { SupportedLanguage } from '../enums/domain.enums';

type LocalizationKey =
  | 'auth.emailVerification.subject'
  | 'auth.emailVerification.body'
  | 'auth.passwordReset.subject'
  | 'auth.passwordReset.body'
  | 'assistant.disclaimer'
  | 'assistant.fallback.mock'
  | 'assistant.fallback.unavailable'
  | 'assistant.fallback.unsure'
  | 'errors.duplicate'
  | 'errors.invalidData'
  | 'errors.rateLimit'
  | 'errors.notFound'
  | 'errors.unauthorized'
  | 'errors.forbidden'
  | 'errors.conflict'
  | 'errors.unprocessable'
  | 'errors.internal'
  | 'notification.validationApproved.title'
  | 'notification.validationApproved.message'
  | 'notification.validationRejected.title'
  | 'notification.validationRejected.message'
  | 'notification.accountSuspended.title'
  | 'notification.accountSuspended.message'
  | 'notification.accountReactivated.title'
  | 'notification.accountReactivated.message'
  | 'notification.productAvailable.title'
  | 'notification.productAvailable.message'
  | 'notification.lowStock.title'
  | 'notification.lowStock.message'
  | 'notification.prescriptionReminder.title'
  | 'notification.prescriptionReminder.message';

type LocalizationParams = Record<string, string | number | boolean | undefined>;

const MESSAGES: Record<SupportedLanguage, Record<LocalizationKey, string>> = {
  [SupportedLanguage.FR]: {
    'auth.emailVerification.subject': 'Vérification de votre email GoPharma',
    'auth.emailVerification.body':
      'Utilisez ce code de vérification: {{verificationToken}}',
    'auth.passwordReset.subject': 'Réinitialisation du mot de passe GoPharma',
    'auth.passwordReset.body': 'Utilisez ce code de réinitialisation: {{resetToken}}',
    'assistant.disclaimer':
      'Avertissement: Cette réponse est informative et ne remplace pas un avis médical.',
    'assistant.fallback.mock':
      '[Mock IA] Cette réponse est générée en mode fallback. Consultez un professionnel de santé. Question reçue: {{message}}',
    'assistant.fallback.unavailable':
      'Service IA momentanément indisponible. Cette réponse ne remplace pas un avis médical.',
    'assistant.fallback.unsure':
      'Je ne peux pas répondre précisément pour le moment. Consultez un professionnel de santé.',
    'errors.duplicate': 'Cette ressource existe déjà.',
    'errors.invalidData': 'Données invalides. Vérifiez votre saisie.',
    'errors.rateLimit': 'Trop de requêtes. Veuillez réessayer plus tard.',
    'errors.notFound': 'Ressource introuvable.',
    'errors.unauthorized': 'Accès non autorisé.',
    'errors.forbidden': 'Accès interdit.',
    'errors.conflict': 'Conflit détecté. Veuillez réessayer.',
    'errors.unprocessable': 'Données invalides. Vérifiez votre saisie.',
    'errors.internal': 'Erreur interne du serveur.',
    'notification.validationApproved.title': 'Compte validé',
    'notification.validationApproved.message':
      'Votre pharmacie {{pharmacyName}} a été validée.',
    'notification.validationRejected.title': 'Validation refusée',
    'notification.validationRejected.message':
      'Votre demande de validation a été rejetée. {{comment}}',
    'notification.accountSuspended.title': 'Compte suspendu',
    'notification.accountSuspended.message':
      'Votre compte est suspendu. Raison: {{reason}}',
    'notification.accountReactivated.title': 'Compte réactivé',
    'notification.accountReactivated.message':
      'Votre compte a été réactivé par un administrateur.',
    'notification.productAvailable.title': 'Produit de nouveau disponible',
    'notification.productAvailable.message':
      '{{productName}} est maintenant disponible chez {{pharmacyName}}.',
    'notification.lowStock.title': 'Alerte stock bas',
    'notification.lowStock.message':
      'Le produit {{productName}} a un stock critique ({{stockQuantity}}).',
    'notification.prescriptionReminder.title': "Rappel d'ordonnance",
    'notification.prescriptionReminder.message':
      'Il est temps de prendre {{medicationName}}.'
  },
  [SupportedLanguage.EN]: {
    'auth.emailVerification.subject': 'Verify your GoPharma email',
    'auth.emailVerification.body': 'Use this verification code: {{verificationToken}}',
    'auth.passwordReset.subject': 'GoPharma password reset',
    'auth.passwordReset.body': 'Use this password reset code: {{resetToken}}',
    'assistant.disclaimer':
      'Disclaimer: This response is for information only and does not replace medical advice.',
    'assistant.fallback.mock':
      '[AI Mock] This response was generated in fallback mode. Consult a healthcare professional. Received question: {{message}}',
    'assistant.fallback.unavailable':
      'AI service is temporarily unavailable. This response does not replace medical advice.',
    'assistant.fallback.unsure':
      'I cannot answer precisely at the moment. Consult a healthcare professional.',
    'errors.duplicate': 'This resource already exists.',
    'errors.invalidData': 'Invalid data. Please check your input.',
    'errors.rateLimit': 'Too many requests. Please try again later.',
    'errors.notFound': 'Resource not found.',
    'errors.unauthorized': 'Unauthorized access.',
    'errors.forbidden': 'Access forbidden.',
    'errors.conflict': 'Conflict detected. Please try again.',
    'errors.unprocessable': 'Invalid data. Please check your input.',
    'errors.internal': 'Internal server error.',
    'notification.validationApproved.title': 'Account approved',
    'notification.validationApproved.message':
      'Your pharmacy {{pharmacyName}} has been approved.',
    'notification.validationRejected.title': 'Validation rejected',
    'notification.validationRejected.message':
      'Your validation request was rejected. {{comment}}',
    'notification.accountSuspended.title': 'Account suspended',
    'notification.accountSuspended.message':
      'Your account has been suspended. Reason: {{reason}}',
    'notification.accountReactivated.title': 'Account reactivated',
    'notification.accountReactivated.message':
      'Your account has been reactivated by an administrator.',
    'notification.productAvailable.title': 'Product available again',
    'notification.productAvailable.message':
      '{{productName}} is now available at {{pharmacyName}}.',
    'notification.lowStock.title': 'Low stock alert',
    'notification.lowStock.message':
      'Product {{productName}} has reached a critical stock level ({{stockQuantity}}).',
    'notification.prescriptionReminder.title': 'Prescription reminder',
    'notification.prescriptionReminder.message':
      'It is time to take {{medicationName}}.'
  }
};

@Injectable()
export class LocalizationService {
  readonly supportedLanguages = [SupportedLanguage.FR, SupportedLanguage.EN] as const;

  normalizeLanguage(language?: string | null): SupportedLanguage {
    return this.supportedLanguages.includes(language as SupportedLanguage)
      ? (language as SupportedLanguage)
      : SupportedLanguage.FR;
  }

  translate(
    key: LocalizationKey,
    language?: string | null,
    params: LocalizationParams = {}
  ): string {
    const normalizedLanguage = this.normalizeLanguage(language);
    const template =
      MESSAGES[normalizedLanguage][key] ?? MESSAGES[SupportedLanguage.FR][key] ?? key;

    return template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
      const value = params[token];
      return value === undefined || value === null ? '' : String(value);
    });
  }
}
