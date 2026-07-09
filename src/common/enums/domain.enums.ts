export enum Role {
  PATIENT = 'PATIENT',
  PHARMACY_MANAGER = 'PHARMACY_MANAGER',
  ADMIN = 'ADMIN'
}

export enum AccountStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  SUSPENDU = 'SUSPENDU'
}

export enum ValidationStatus {
  VALIDE = 'VALIDE',
  REJETE = 'REJETE',
  SUSPENDU = 'SUSPENDU',
  EN_ATTENTE = 'EN_ATTENTE'
}

export enum NotificationType {
  PRODUIT_DISPONIBLE = 'PRODUIT_DISPONIBLE',
  STOCK_BAS = 'STOCK_BAS',
  VALIDATION_COMPTE = 'VALIDATION_COMPTE',
  SUSPENSION = 'SUSPENSION',
  RAPPEL_ORDONNANCE = 'RAPPEL_ORDONNANCE'
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH'
}

export enum SupportedLanguage {
  FR = 'fr',
  EN = 'en'
}

export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum StockMovementType {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
  AJUSTEMENT = 'AJUSTEMENT',
  CREER = 'CREER',
  SUPPRIMER = 'SUPPRIMER',
  MODIFIER = 'MODIFIER'
}

export enum SearchType {
  PRODUIT = 'PRODUIT',
  PHARMACIE = 'PHARMACIE'
}

export enum FavoriteTargetType {
  PHARMACY = 'PHARMACY',
  PRODUCT = 'PRODUCT'
}

export enum ReminderFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}
