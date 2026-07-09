import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  AccountStatus,
  NotificationChannel,
  Role,
  SupportedLanguage,
  ThemePreference
} from '../common/enums/domain.enums';

type SeedPharmacy = {
  ifu: string;
  name: string;
  city: string;
  address: string;
  email: string;
  description: string;
  services: string[];
  operationalStatus: 'OUVERT' | 'FERME';
  location: { type: 'Point'; coordinates: [number, number] };
};

type SeedProduct = {
  barcode: string;
  name: string;
  scientificName: string;
  form: string;
  strength: string;
  laboratory: string;
  atcCode: string;
  country: string;
  source: string;
  description: string;
  noticeUrl: string;
  isMedicine: boolean;
  category: string;
};

const PROFILE_ASSETS = [
  '/seed-assets/profiles/profile-1.svg',
  '/seed-assets/profiles/profile-2.svg',
  '/seed-assets/profiles/profile-3.svg',
  '/seed-assets/profiles/profile-4.svg',
  '/seed-assets/profiles/profile-5.svg',
  '/seed-assets/profiles/profile-6.svg'
];

const PHARMACY_PHOTO_ASSETS = [
  '/seed-assets/pharmacies/pharmacy-1.svg',
  '/seed-assets/pharmacies/pharmacy-2.svg',
  '/seed-assets/pharmacies/pharmacy-3.svg',
  '/seed-assets/pharmacies/pharmacy-4.svg',
  '/seed-assets/pharmacies/pharmacy-5.svg',
  '/seed-assets/pharmacies/pharmacy-6.svg'
];

const PHARMACY_BANNER_ASSETS = [
  '/seed-assets/banners/banner-1.svg',
  '/seed-assets/banners/banner-2.svg',
  '/seed-assets/banners/banner-3.svg',
  '/seed-assets/banners/banner-4.svg',
  '/seed-assets/banners/banner-5.svg',
  '/seed-assets/banners/banner-6.svg'
];

function buildProfilePhotoUrl(label: string, index: number) {
  void label;
  return PROFILE_ASSETS[index % PROFILE_ASSETS.length];
}

function buildPharmacyPhotoUrl(name: string, index: number) {
  void name;
  return PHARMACY_PHOTO_ASSETS[index % PHARMACY_PHOTO_ASSETS.length];
}

function buildPharmacyBannerUrl(name: string, city: string, index: number) {
  void name;
  void city;
  return PHARMACY_BANNER_ASSETS[index % PHARMACY_BANNER_ASSETS.length];
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPhoneNumber(index: number) {
  return `+22901${String(10000000 + index).padStart(8, '0')}`;
}

function buildNoticeUrl(barcode: string) {
  return `https://docs.gopharma.local/notices/${barcode.toLowerCase()}.pdf`;
}

function productSeed(input: Omit<SeedProduct, 'country' | 'source' | 'noticeUrl'>): SeedProduct {
  return {
    ...input,
    country: 'BJ',
    source: 'Catalogue GoPharma Seed 2026',
    noticeUrl: buildNoticeUrl(input.barcode)
  };
}

function buildWeeklySchedule(index: number, isOnDuty: boolean) {
  const weekdayOpen = index % 3 === 0 ? '07:30' : index % 3 === 1 ? '08:00' : '08:30';
  const weekdayClose = index % 4 === 0 ? '21:00' : index % 4 === 1 ? '20:30' : '20:00';
  const saturdayClose = isOnDuty ? '21:30' : '18:30';

  return [
    { dayOfWeek: 0, openTime: isOnDuty ? '09:00' : undefined, closeTime: isOnDuty ? '13:00' : undefined, isClosed: !isOnDuty, onDuty: isOnDuty },
    { dayOfWeek: 1, openTime: weekdayOpen, closeTime: weekdayClose, isClosed: false, onDuty: isOnDuty && index % 2 === 0 },
    { dayOfWeek: 2, openTime: weekdayOpen, closeTime: weekdayClose, isClosed: false, onDuty: false },
    { dayOfWeek: 3, openTime: weekdayOpen, closeTime: weekdayClose, isClosed: false, onDuty: isOnDuty && index % 3 === 0 },
    { dayOfWeek: 4, openTime: weekdayOpen, closeTime: weekdayClose, isClosed: false, onDuty: false },
    { dayOfWeek: 5, openTime: weekdayOpen, closeTime: weekdayClose, isClosed: false, onDuty: false },
    { dayOfWeek: 6, openTime: '09:00', closeTime: saturdayClose, isClosed: false, onDuty: isOnDuty }
  ];
}

function buildScheduleExceptions(now: Date, index: number, isOnDuty: boolean) {
  const monthlyAuditDay = addDays(now, 5 + index);
  const guardNightDay = addDays(now, 18 + index);

  const exceptions: Array<{
    startDate: Date;
    endDate: Date;
    isClosed: boolean;
    onDuty: boolean;
    label: string;
    openTime?: string;
    closeTime?: string;
  }> = [
    {
      startDate: monthlyAuditDay,
      endDate: monthlyAuditDay,
      isClosed: true,
      onDuty: false,
      label: 'Inventaire mensuel'
    }
  ];

  if (isOnDuty) {
    exceptions.push({
      startDate: guardNightDay,
      endDate: guardNightDay,
      isClosed: false,
      onDuty: true,
      openTime: '19:00',
      closeTime: '23:30',
      label: 'Service de garde'
    });
  }

  return exceptions;
}

function computePrice(product: SeedProduct, pharmacyIndex: number, slotIndex: number) {
  const basePrices: Record<string, number> = {
    Antalgique: 550,
    Antibiotique: 1800,
    Complément: 2200,
    Antiallergique: 1450,
    Antiulcéreux: 1650,
    Antidiabétique: 4200,
    Antihypertenseur: 3900,
    Hypocholestérolémiant: 4600,
    Dermatologie: 3200,
    Hygiène: 1500,
    Pédiatrie: 2600,
    Équipement: 8900,
    Pansement: 1200,
    Maternité: 3100,
    Respiratoire: 3400
  };

  return (basePrices[product.category] ?? 1800) + pharmacyIndex * 70 + slotIndex * 95;
}

function computeStockQuantity(pharmacyIndex: number, slotIndex: number) {
  const raw = 7 + ((pharmacyIndex + 2) * (slotIndex + 3) * 3) % 34;
  if ((pharmacyIndex + slotIndex) % 11 === 0) {
    return 0;
  }

  return raw;
}

async function run() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(mongodbUri);

  const userSchema = new mongoose.Schema(
    {
      firstName: String,
      lastName: String,
      email: String,
      passwordHash: String,
      role: String,
      accountStatus: String,
      isActive: Boolean,
      country: String,
      phoneNumber: String,
      emailVerifiedAt: Date,
      profilePhotoUrl: String,
      preferences: Object
    },
    { collection: 'users', strict: false }
  );

  const pharmacySchema = new mongoose.Schema(
    {
      name: String,
      address: String,
      email: String,
      description: String,
      services: [String],
      location: Object,
      ifu: String,
      photoUrl: String,
      bannerUrl: String,
      ownerId: mongoose.Schema.Types.ObjectId,
      accountStatus: String,
      operationalStatus: String,
      validationDate: Date
    },
    { collection: 'pharmacies', strict: false }
  );

  const productSchema = new mongoose.Schema(
    {
      name: String,
      scientificName: String,
      form: String,
      strength: String,
      laboratory: String,
      atcCode: String,
      country: String,
      source: String,
      barcode: String,
      description: String,
      noticeUrl: String,
      isMedicine: Boolean,
      category: String
    },
    { collection: 'products', strict: false }
  );

  const inventoryItemSchema = new mongoose.Schema(
    {
      pharmacyId: mongoose.Schema.Types.ObjectId,
      productId: mongoose.Schema.Types.ObjectId,
      price: Number,
      stockQuantity: Number,
      alertThreshold: Number,
      isAvailable: Boolean,
      expiryDate: Date,
      lastUpdatedAt: Date
    },
    { collection: 'inventory_items', strict: false }
  );

  const scheduleSchema = new mongoose.Schema(
    {
      pharmacyId: mongoose.Schema.Types.ObjectId,
      weekly: Array,
      exceptions: Array,
      updatedBy: mongoose.Schema.Types.ObjectId
    },
    { collection: 'schedules', strict: false }
  );

  const User = mongoose.model('UserSeed', userSchema);
  const Pharmacy = mongoose.model('PharmacySeed', pharmacySchema);
  const Product = mongoose.model('ProductSeed', productSchema);
  const InventoryItem = mongoose.model('InventoryItemSeed', inventoryItemSchema);
  const Schedule = mongoose.model('ScheduleSeed', scheduleSchema);

  const adminEmail = 'admin@gopharma.local';
  const patientEmail = 'patient@gopharma.local';
  const managerEmail = 'manager@gopharma.local';
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const emailVerifiedAt = new Date();
  const seedStartedAt = new Date();

  const userPreferences = {
    language: SupportedLanguage.FR,
    timezone: 'Africa/Porto-Novo',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    alertsEnabled: true,
    theme: ThemePreference.LIGHT
  };

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        firstName: 'Super',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        accountStatus: AccountStatus.VALIDE,
        isActive: true,
        country: 'Benin',
        phoneNumber: '+2290100000000',
        emailVerifiedAt,
        profilePhotoUrl: buildProfilePhotoUrl('Super Admin', 0),
        preferences: userPreferences
      }
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: patientEmail },
    {
      $set: {
        firstName: 'Jean',
        lastName: 'Patient',
        email: patientEmail,
        passwordHash,
        role: Role.PATIENT,
        accountStatus: AccountStatus.VALIDE,
        isActive: true,
        country: 'Benin',
        phoneNumber: '+2290100000002',
        emailVerifiedAt,
        profilePhotoUrl: buildProfilePhotoUrl('Jean Patient', 1),
        preferences: userPreferences
      }
    },
    { upsert: true }
  );

  const rootManager = await User.findOneAndUpdate(
    { email: managerEmail },
    {
      $set: {
        firstName: 'Sarah',
        lastName: 'Manager',
        email: managerEmail,
        passwordHash,
        role: Role.PHARMACY_MANAGER,
        accountStatus: AccountStatus.VALIDE,
        isActive: true,
        country: 'Benin',
        phoneNumber: '+2290100000001',
        emailVerifiedAt,
        profilePhotoUrl: buildProfilePhotoUrl('Sarah Manager', 2),
        preferences: userPreferences
      }
    },
    { upsert: true, new: true }
  );

  const additionalPatients = [
    { firstName: 'Marie', lastName: 'Kouassi', email: 'marie.kouassi@gopharma.local' },
    { firstName: 'Paul', lastName: 'Adjoua', email: 'paul.adjoua@gopharma.local' },
    { firstName: 'Aicha', lastName: 'Diallo', email: 'aicha.diallo@gopharma.local' },
    { firstName: 'Jean-Baptiste', lastName: 'Koffi', email: 'jb.koffi@gopharma.local' },
    { firstName: 'Fatou', lastName: 'Ndiaye', email: 'fatou.ndiaye@gopharma.local' },
    { firstName: 'Emmanuel', lastName: 'Mensah', email: 'emmanuel.mensah@gopharma.local' },
    { firstName: 'Grace', lastName: 'Adeyemi', email: 'grace.adeyemi@gopharma.local' },
    { firstName: 'Kofi', lastName: 'Osei', email: 'kofi.osei@gopharma.local' },
    { firstName: 'Adama', lastName: 'Traore', email: 'adama.traore@gopharma.local' },
    { firstName: 'Mariama', lastName: 'Sow', email: 'mariama.sow@gopharma.local' },
    { firstName: 'Christian', lastName: 'Kouame', email: 'christian.kouame@gopharma.local' },
    { firstName: 'Nadia', lastName: 'Bamba', email: 'nadia.bamba@gopharma.local' }
  ];

  for (const [index, patient] of additionalPatients.entries()) {
    await User.findOneAndUpdate(
      { email: patient.email },
      {
        $set: {
          ...patient,
          passwordHash,
          role: Role.PATIENT,
          accountStatus: AccountStatus.VALIDE,
          isActive: true,
          country: 'Benin',
          phoneNumber: buildPhoneNumber(30 + index),
          emailVerifiedAt,
          profilePhotoUrl: buildProfilePhotoUrl(`${patient.firstName} ${patient.lastName}`, 3 + index),
          preferences: userPreferences
        }
      },
      { upsert: true }
    );
  }

  const pharmacies: SeedPharmacy[] = [
    {
      ifu: 'IFU-DEMO-001',
      name: 'Pharmacie Demo',
      city: 'Cotonou',
      address: '123 Rue Exemple, Cotonou',
      email: 'contact@pharmacie-demo.bj',
      description: 'Pharmacie de reference pour les soins du quotidien, la prevention et l accompagnement patient.',
      services: ['Conseil', 'Livraison', 'Parapharmacie', 'Vaccination'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4342, 6.3654] }
    },
    {
      ifu: 'IFU-CTN-002',
      name: 'Pharmacie du Centre',
      city: 'Cotonou',
      address: 'Avenue Jean-Paul II, Centre-ville, Cotonou',
      email: 'centre@pharmacie.bj',
      description: 'Equipe officinale complete, suivi des ordonnances et accompagnement des patients chroniques.',
      services: ['Ordonnance', 'Vaccination', 'Tension', 'Conseil'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4219, 6.3668] }
    },
    {
      ifu: 'IFU-CTN-003',
      name: 'Pharmacie des Cocotiers',
      city: 'Cotonou',
      address: 'Quartier Cocotiers, Cotonou',
      email: 'cocotiers@pharmacie.bj',
      description: 'Pharmacie moderne avec drive, suivi patient et livraison express sur les quartiers voisins.',
      services: ['Livraison', 'Drive', 'Suivi patient', 'Produits bebe'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4087, 6.3604] }
    },
    {
      ifu: 'IFU-CTN-004',
      name: 'Pharmacie Zongo',
      city: 'Cotonou',
      address: 'Marche Zongo, Cotonou',
      email: 'zongo@pharmacie.bj',
      description: 'Officine de quartier avec forte rotation sur les produits famille, hygiene et dermocosmetique.',
      services: ['Parapharmacie', 'Conseil', 'Produits bebe', 'Dermocosmetique'],
      operationalStatus: 'FERME',
      location: { type: 'Point', coordinates: [2.4294, 6.3721] }
    },
    {
      ifu: 'IFU-CTN-005',
      name: 'Pharmacie Fidjrosse',
      city: 'Cotonou',
      address: 'Fidjrosse Plage, Cotonou',
      email: 'fidjrosse@pharmacie.bj',
      description: 'Pharmacie de garde tres frequentee en soiree, avec prevention sante, vaccination et urgence legere.',
      services: ['Vaccination', 'Garde', 'Prevention', 'Conseil'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.3766, 6.3531] }
    },
    {
      ifu: 'IFU-CTN-006',
      name: 'Pharmacie Gbegamey',
      city: 'Cotonou',
      address: 'Quartier Gbegamey, Cotonou',
      email: 'gbegamey@pharmacie.bj',
      description: 'Pharmacie de proximite complete, forte demande en vaccination, ordonnances et soins chroniques.',
      services: ['Vaccination', 'Conseil', 'Ordonnance', 'Diabete'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4123, 6.3789] }
    },
    {
      ifu: 'IFU-CTN-007',
      name: 'Pharmacie Saint-Michel',
      city: 'Cotonou',
      address: 'Boulevard de la Marina, Cotonou',
      email: 'saintmichel@pharmacie.bj',
      description: 'Reference pour les traitements chroniques, la cardiologie de ville et les conseils personnalises.',
      services: ['Ordonnance', 'Soins chroniques', 'Conseil', 'Cardio'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4456, 6.3578] }
    },
    {
      ifu: 'IFU-PTN-001',
      name: 'Pharmacie de Porto-Novo',
      city: 'Porto-Novo',
      address: 'Avenue de la Republique, Porto-Novo',
      email: 'portonovo@pharmacie.bj',
      description: 'Grande pharmacie centrale avec stock profond, suivi des patients et livraison urbaine.',
      services: ['Ordonnance', 'Parapharmacie', 'Livraison', 'Maternite'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.6323, 6.4833] }
    },
    {
      ifu: 'IFU-PTN-002',
      name: 'Pharmacie Djidje',
      city: 'Porto-Novo',
      address: 'Quartier Djidje, Porto-Novo',
      email: 'djidje@pharmacie.bj',
      description: 'Pharmacie familiale, service de garde, vaccination et conseils du quotidien pour toute la famille.',
      services: ['Garde', 'Vaccination', 'Conseil', 'Pediatrie'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.6156, 6.4912] }
    },
    {
      ifu: 'IFU-PK-001',
      name: 'Pharmacie de Parakou',
      city: 'Parakou',
      address: 'Avenue du General de Gaulle, Parakou',
      email: 'parakou@pharmacie.bj',
      description: 'Plateforme officinale du nord avec stock large, traitements chroniques et materiel de sante.',
      services: ['Ordonnance', 'Parapharmacie', 'Vaccination', 'Equipement'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.6189, 9.3478] }
    },
    {
      ifu: 'IFU-PK-002',
      name: 'Pharmacie Tchaourou',
      city: 'Tchaourou',
      address: 'Centre-ville, Tchaourou',
      email: 'tchaourou@pharmacie.bj',
      description: 'Pharmacie regionale avec accompagnement des patients et livraison sur les axes principaux.',
      services: ['Ordonnance', 'Conseil', 'Livraison', 'Suivi patient'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4567, 9.1234] }
    },
    {
      ifu: 'IFU-ABO-001',
      name: 'Pharmacie d Abomey',
      city: 'Abomey',
      address: 'Route de Bohicon, Abomey',
      email: 'abomey@pharmacie.bj',
      description: 'Pharmacie historique avec forte activite ordonnance et conseil de ville.',
      services: ['Ordonnance', 'Parapharmacie', 'Conseil', 'Dermocosmetique'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.0567, 7.1845] }
    },
    {
      ifu: 'IFU-BH-001',
      name: 'Pharmacie de Bohicon',
      city: 'Bohicon',
      address: 'Avenue du Marche, Bohicon',
      email: 'bohicon@pharmacie.bj',
      description: 'Pharmacie moderne avec drive, livraison, stock rapide et suivi des ordonnances.',
      services: ['Drive', 'Livraison', 'Ordonnance', 'Conseil'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.0789, 7.1789] }
    },
    {
      ifu: 'IFU-L-001',
      name: 'Pharmacie de Lokossa',
      city: 'Lokossa',
      address: 'Boulevard de la Liberte, Lokossa',
      email: 'lokossa@pharmacie.bj',
      description: 'Pharmacie polyvalente avec accent sur la prevention et la prise en charge tropicale.',
      services: ['Ordonnance', 'Conseil', 'Parapharmacie', 'Prevention'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [1.7123, 6.6012] }
    },
    {
      ifu: 'IFU-O-001',
      name: 'Pharmacie d Ouidah',
      city: 'Ouidah',
      address: 'Route de la Cote, Ouidah',
      email: 'ouidah@pharmacie.bj',
      description: 'Pharmacie touristique et familiale, services multilingues et produits de voyage.',
      services: ['Ordonnance', 'Conseil', 'Parapharmacie', 'Voyage'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.089, 6.3634] }
    },
    {
      ifu: 'IFU-N-001',
      name: 'Pharmacie de Natitingou',
      city: 'Natitingou',
      address: 'Centre-ville, Natitingou',
      email: 'natitingou@pharmacie.bj',
      description: 'Pharmacie de reference de l Atacora, orientation patient, soins chroniques et prevention.',
      services: ['Ordonnance', 'Conseil', 'Livraison', 'Soins chroniques'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [1.3789, 10.3234] }
    },
    {
      ifu: 'IFU-D-001',
      name: 'Pharmacie de Djougou',
      city: 'Djougou',
      address: 'Avenue de l Independence, Djougou',
      email: 'djougou@pharmacie.bj',
      description: 'Officine centrale avec forte disponibilite de vaccins, ordonnance et produits famille.',
      services: ['Ordonnance', 'Parapharmacie', 'Vaccination', 'Pediatrie'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [1.7345, 9.7123] }
    },
    {
      ifu: 'IFU-K-001',
      name: 'Pharmacie de Kandi',
      city: 'Kandi',
      address: 'Route de Malanville, Kandi',
      email: 'kandi@pharmacie.bj',
      description: 'Pharmacie de l Alibori avec conseil, stock regional et accompagnement pathologies saisonnieres.',
      services: ['Ordonnance', 'Conseil', 'Parapharmacie', 'Respiratoire'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.9345, 11.1234] }
    },
    {
      ifu: 'IFU-M-001',
      name: 'Pharmacie de Malanville',
      city: 'Malanville',
      address: 'Frontiere Niger, Malanville',
      email: 'malanville@pharmacie.bj',
      description: 'Pharmacie frontaliere avec flux important, stock de passage et produits de premiere necessite.',
      services: ['Ordonnance', 'Parapharmacie', 'Livraison', 'Urgence legere'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [3.3789, 11.8567] }
    },
    {
      ifu: 'IFU-CTN-008',
      name: 'Pharmacie Ganhi',
      city: 'Cotonou',
      address: 'Quartier Ganhi, Cotonou',
      email: 'ganhi@pharmacie.bj',
      description: 'Pharmacie de quartier avec garde 24h, rotation rapide et conseil express.',
      services: ['Garde', 'Ordonnance', 'Conseil', 'Livraison'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.3987, 6.3456] }
    },
    {
      ifu: 'IFU-CTN-009',
      name: 'Pharmacie Akpakpa Horizon',
      city: 'Cotonou',
      address: 'Boulevard Akpakpa, Cotonou',
      email: 'akpakpa.horizon@pharmacie.bj',
      description: 'Pharmacie urbaine avec offre complete, maternite, pediatrie et parapharmacie premium.',
      services: ['Maternite', 'Pediatrie', 'Parapharmacie', 'Conseil'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4538, 6.3572] }
    },
    {
      ifu: 'IFU-ALL-001',
      name: 'Pharmacie du Lac Aheme',
      city: 'Possotome',
      address: 'Route du Lac Aheme, Possotome',
      email: 'lac.aheme@pharmacie.bj',
      description: 'Pharmacie de destination avec conseil, prevention, dermocosmetique et offre voyage.',
      services: ['Conseil', 'Prevention', 'Voyage', 'Dermocosmetique'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [1.9404, 6.5657] }
    },
    {
      ifu: 'IFU-APA-001',
      name: 'Pharmacie Apapa Sante',
      city: 'Porto-Novo',
      address: 'Carrefour Apapa, Porto-Novo',
      email: 'apapa.sante@pharmacie.bj',
      description: 'Pharmacie de quartier moderne avec suivi des ordonnances, livraison et vaccination.',
      services: ['Ordonnance', 'Livraison', 'Vaccination', 'Conseil'],
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.6228, 6.5008] }
    }
  ];

  const managerFirstNames = [
    'Clarisse',
    'Lionel',
    'Mireille',
    'Jonas',
    'Esther',
    'Cedric',
    'Naomi',
    'Brice',
    'Prisca',
    'Hervé',
    'Meline',
    'Ulrich',
    'Sonia',
    'Arnold',
    'Brigitte',
    'Kevin',
    'Diane',
    'Roland',
    'Nora',
    'Frederic',
    'Adele',
    'Hugues'
  ];

  const managerLastNames = [
    'Houngbedji',
    'Dossou',
    'Attiogbe',
    'Zannou',
    'Ahouandjinou',
    'Kiki',
    'Akindes',
    'Toure',
    'Sounon',
    'Degbey',
    'Ogou',
    'Ayi',
    'Medehouenou',
    'Biaou',
    'Sodjinou',
    'Adjibade',
    'Azon',
    'Kounde',
    'Gandaho',
    'Mensah',
    'Ahonon',
    'Dahito'
  ];

  const pharmacyManagers = await Promise.all(
    pharmacies.map((pharmacy, index) =>
      User.findOneAndUpdate(
        { email: `manager.${slugify(pharmacy.ifu)}@gopharma.local` },
        {
          $set: {
            firstName: managerFirstNames[index % managerFirstNames.length],
            lastName: managerLastNames[index % managerLastNames.length],
            email: `manager.${slugify(pharmacy.ifu)}@gopharma.local`,
            passwordHash,
            role: Role.PHARMACY_MANAGER,
            accountStatus: AccountStatus.VALIDE,
            isActive: true,
            country: 'Benin',
            phoneNumber: buildPhoneNumber(index + 1),
            emailVerifiedAt,
            profilePhotoUrl: buildProfilePhotoUrl(
              `${managerFirstNames[index % managerFirstNames.length]} ${managerLastNames[index % managerLastNames.length]}`,
              index + 10
            ),
            preferences: userPreferences
          }
        },
        { upsert: true, new: true }
      )
    )
  );

  const ownersByIfu = new Map(
    pharmacyManagers
      .filter((manager): manager is NonNullable<typeof manager> => Boolean(manager))
      .map((manager, index) => [pharmacies[index].ifu, manager])
  );

  // Ensure the documented demo manager account owns at least one pharmacy.
  if (pharmacies.length > 0) {
    ownersByIfu.set(pharmacies[0].ifu, rootManager);
  }

  const seededPharmacies = await Promise.all(
    pharmacies.map((pharmacy, index) =>
      Pharmacy.findOneAndUpdate(
        { ifu: pharmacy.ifu },
        {
          $set: {
            ...pharmacy,
            isSeeded: true,
            photoUrl: buildPharmacyPhotoUrl(pharmacy.name, index),
            bannerUrl: buildPharmacyBannerUrl(pharmacy.name, pharmacy.city, index),
            ownerId: ownersByIfu.get(pharmacy.ifu)?._id ?? rootManager._id,
            accountStatus: AccountStatus.VALIDE,
            validationDate: addDays(seedStartedAt, -(90 - index))
          }
        },
        { upsert: true, new: true }
      )
    )
  );

  const pharmaciesByIfu = new Map(
    seededPharmacies
      .filter((pharmacy): pharmacy is NonNullable<typeof pharmacy> => Boolean(pharmacy))
      .map((pharmacy) => [String(pharmacy.ifu), pharmacy])
  );

  const products: SeedProduct[] = [
    productSeed({
      barcode: 'GP-340101',
      name: 'Paracetamol 500 mg',
      scientificName: 'Paracetamol',
      form: 'Comprime',
      strength: '500 mg',
      laboratory: 'Sanofi',
      atcCode: 'N02BE01',
      description: 'Analgésique et antipyrétique pour douleurs et fièvre.',
      isMedicine: true,
      category: 'Antalgique'
    }),
    productSeed({
      barcode: 'GP-340102',
      name: 'Ibuprofene 400 mg',
      scientificName: 'Ibuprofen',
      form: 'Comprime pellicule',
      strength: '400 mg',
      laboratory: 'Abbott',
      atcCode: 'M01AE01',
      description: 'Anti-inflammatoire non stéroidien pour douleurs et inflammations.',
      isMedicine: true,
      category: 'Antalgique'
    }),
    productSeed({
      barcode: 'GP-340103',
      name: 'Amoxicilline 500 mg',
      scientificName: 'Amoxicillin',
      form: 'Gelule',
      strength: '500 mg',
      laboratory: 'GSK',
      atcCode: 'J01CA04',
      description: 'Antibiotique a large spectre pour infections bactériennes sensibles.',
      isMedicine: true,
      category: 'Antibiotique'
    }),
    productSeed({
      barcode: 'GP-340104',
      name: 'Vitamine C 1000 mg',
      scientificName: 'Ascorbic acid',
      form: 'Comprime effervescent',
      strength: '1000 mg',
      laboratory: 'Bayer',
      atcCode: 'A11GA01',
      description: 'Complément vitaminique pour fatigue passagère et soutien immunitaire.',
      isMedicine: false,
      category: 'Complément'
    }),
    productSeed({
      barcode: 'GP-340105',
      name: 'Loratadine 10 mg',
      scientificName: 'Loratadine',
      form: 'Comprime',
      strength: '10 mg',
      laboratory: 'MSD',
      atcCode: 'R06AX13',
      description: 'Antihistaminique utilisé pour les rhinites et allergies cutanées.',
      isMedicine: true,
      category: 'Antiallergique'
    }),
    productSeed({
      barcode: 'GP-340106',
      name: 'Omeprazole 20 mg',
      scientificName: 'Omeprazole',
      form: 'Gelule gastro-resistante',
      strength: '20 mg',
      laboratory: 'AstraZeneca',
      atcCode: 'A02BC01',
      description: 'Inhibiteur de la pompe a protons pour reflux et brûlures gastriques.',
      isMedicine: true,
      category: 'Antiulcéreux'
    }),
    productSeed({
      barcode: 'GP-340107',
      name: 'Metformine 850 mg',
      scientificName: 'Metformin',
      form: 'Comprime',
      strength: '850 mg',
      laboratory: 'Merck',
      atcCode: 'A10BA02',
      description: 'Antidiabetique oral de premiere intention dans le diabete de type 2.',
      isMedicine: true,
      category: 'Antidiabétique'
    }),
    productSeed({
      barcode: 'GP-340108',
      name: 'Amlodipine 5 mg',
      scientificName: 'Amlodipine',
      form: 'Comprime',
      strength: '5 mg',
      laboratory: 'Pfizer',
      atcCode: 'C08CA01',
      description: 'Antihypertenseur de la famille des inhibiteurs calciques.',
      isMedicine: true,
      category: 'Antihypertenseur'
    }),
    productSeed({
      barcode: 'GP-340109',
      name: 'Atorvastatine 20 mg',
      scientificName: 'Atorvastatin',
      form: 'Comprime pellicule',
      strength: '20 mg',
      laboratory: 'Pfizer',
      atcCode: 'C10AA05',
      description: 'Hypocholestérolémiant pour la prévention cardiovasculaire.',
      isMedicine: true,
      category: 'Hypocholestérolémiant'
    }),
    productSeed({
      barcode: 'GP-340110',
      name: 'Cetirizine 10 mg',
      scientificName: 'Cetirizine',
      form: 'Comprime',
      strength: '10 mg',
      laboratory: 'UCB',
      atcCode: 'R06AE07',
      description: 'Antihistaminique de seconde generation pour allergies saisonnières.',
      isMedicine: true,
      category: 'Antiallergique'
    }),
    productSeed({
      barcode: 'GP-340111',
      name: 'Azithromycine 500 mg',
      scientificName: 'Azithromycin',
      form: 'Comprime pellicule',
      strength: '500 mg',
      laboratory: 'Pfizer',
      atcCode: 'J01FA10',
      description: 'Antibiotique macrolide a prise courte pour infections bactériennes.',
      isMedicine: true,
      category: 'Antibiotique'
    }),
    productSeed({
      barcode: 'GP-340112',
      name: 'Doxycycline 100 mg',
      scientificName: 'Doxycycline',
      form: 'Gelule',
      strength: '100 mg',
      laboratory: 'Viatris',
      atcCode: 'J01AA02',
      description: 'Antibiotique tetracycline pour infections et prise en charge ciblée.',
      isMedicine: true,
      category: 'Antibiotique'
    }),
    productSeed({
      barcode: 'GP-340113',
      name: 'Salbutamol 100 mcg',
      scientificName: 'Salbutamol',
      form: 'Inhalateur doseur',
      strength: '100 mcg',
      laboratory: 'GSK',
      atcCode: 'R03AC02',
      description: 'Bronchodilatateur de secours pour asthme et gêne respiratoire.',
      isMedicine: true,
      category: 'Respiratoire'
    }),
    productSeed({
      barcode: 'GP-340114',
      name: 'Montelukast 10 mg',
      scientificName: 'Montelukast',
      form: 'Comprime pellicule',
      strength: '10 mg',
      laboratory: 'MSD',
      atcCode: 'R03DC03',
      description: 'Traitement de fond des allergies respiratoires et de l asthme.',
      isMedicine: true,
      category: 'Respiratoire'
    }),
    productSeed({
      barcode: 'GP-340115',
      name: 'Insuline glargine',
      scientificName: 'Insulin glargine',
      form: 'Stylo injecteur',
      strength: '100 UI/ml',
      laboratory: 'Sanofi',
      atcCode: 'A10AE04',
      description: 'Insuline basale a action prolongée pour diabete insulinotraité.',
      isMedicine: true,
      category: 'Antidiabétique'
    }),
    productSeed({
      barcode: 'GP-340116',
      name: 'Losartan 50 mg',
      scientificName: 'Losartan',
      form: 'Comprime pellicule',
      strength: '50 mg',
      laboratory: 'MSD',
      atcCode: 'C09CA01',
      description: 'Antihypertenseur antagoniste des récepteurs de l angiotensine II.',
      isMedicine: true,
      category: 'Antihypertenseur'
    }),
    productSeed({
      barcode: 'GP-340117',
      name: 'Enalapril 10 mg',
      scientificName: 'Enalapril',
      form: 'Comprime',
      strength: '10 mg',
      laboratory: 'Novartis',
      atcCode: 'C09AA02',
      description: 'Inhibiteur de l enzyme de conversion pour hypertension et insuffisance cardiaque.',
      isMedicine: true,
      category: 'Antihypertenseur'
    }),
    productSeed({
      barcode: 'GP-340118',
      name: 'Creme hydratante reparatrice',
      scientificName: 'Glycerin and ceramides',
      form: 'Tube',
      strength: '200 ml',
      laboratory: 'La Roche-Posay',
      atcCode: 'D02AX',
      description: 'Soin dermocosmetique pour peau sèche et sensible.',
      isMedicine: false,
      category: 'Dermatologie'
    }),
    productSeed({
      barcode: 'GP-340119',
      name: 'Ecran solaire SPF 50',
      scientificName: 'Sunscreen broad spectrum',
      form: 'Lotion',
      strength: '150 ml',
      laboratory: 'Bioderma',
      atcCode: 'D02BB',
      description: 'Protection solaire haute couvrance pour exposition quotidienne.',
      isMedicine: false,
      category: 'Dermatologie'
    }),
    productSeed({
      barcode: 'GP-340120',
      name: 'Gel hydroalcoolique 500 ml',
      scientificName: 'Alcohol-based hand rub',
      form: 'Flacon pompe',
      strength: '500 ml',
      laboratory: 'GoPharma Care',
      atcCode: 'D08AX',
      description: 'Solution hydroalcoolique pour désinfection rapide des mains.',
      isMedicine: false,
      category: 'Hygiène'
    }),
    productSeed({
      barcode: 'GP-340121',
      name: 'Masques chirurgicaux x50',
      scientificName: 'Surgical mask type II',
      form: 'Boite',
      strength: '50 unites',
      laboratory: '3M',
      atcCode: 'V20AA',
      description: 'Masques a usage unique pour protection et prévention.',
      isMedicine: false,
      category: 'Hygiène'
    }),
    productSeed({
      barcode: 'GP-340122',
      name: 'Thermometre digital',
      scientificName: 'Digital thermometer',
      form: 'Appareil',
      strength: 'Unite',
      laboratory: 'Omron',
      atcCode: 'V04',
      description: 'Thermometre electronique pour mesure rapide de la temperature.',
      isMedicine: false,
      category: 'Équipement'
    }),
    productSeed({
      barcode: 'GP-340123',
      name: 'Tensiometre bras',
      scientificName: 'Blood pressure monitor',
      form: 'Appareil',
      strength: 'Unite',
      laboratory: 'Omron',
      atcCode: 'V05',
      description: 'Appareil de surveillance tensionnelle pour domicile et cabinet.',
      isMedicine: false,
      category: 'Équipement'
    }),
    productSeed({
      barcode: 'GP-340124',
      name: 'Pansements steriles x20',
      scientificName: 'Sterile dressings',
      form: 'Boite',
      strength: '20 unites',
      laboratory: 'Hartmann',
      atcCode: 'D09AA',
      description: 'Pansements prêts a l emploi pour petites plaies du quotidien.',
      isMedicine: false,
      category: 'Pansement'
    }),
    productSeed({
      barcode: 'GP-340125',
      name: 'Bandes elastiques de maintien',
      scientificName: 'Elastic bandage',
      form: 'Rouleau',
      strength: '4 m',
      laboratory: 'Urgo',
      atcCode: 'D09AB',
      description: 'Bandage elastique pour maintien et compression légère.',
      isMedicine: false,
      category: 'Pansement'
    }),
    productSeed({
      barcode: 'GP-340126',
      name: 'Vitamine D3 1000 UI',
      scientificName: 'Cholecalciferol',
      form: 'Capsule',
      strength: '1000 UI',
      laboratory: 'Arkopharma',
      atcCode: 'A11CC05',
      description: 'Complément vitaminique pour soutien osseux et immunitaire.',
      isMedicine: false,
      category: 'Complément'
    }),
    productSeed({
      barcode: 'GP-340127',
      name: 'Fer 200 mg',
      scientificName: 'Ferrous sulfate',
      form: 'Comprime',
      strength: '200 mg',
      laboratory: 'Pierre Fabre',
      atcCode: 'B03AA07',
      description: 'Complément en fer pour prévention et correction de carence.',
      isMedicine: false,
      category: 'Complément'
    }),
    productSeed({
      barcode: 'GP-340128',
      name: 'Omega 3 1000 mg',
      scientificName: 'Fish oil',
      form: 'Capsule molle',
      strength: '1000 mg',
      laboratory: 'Solgar',
      atcCode: 'A11JC',
      description: 'Complément nutritionnel pour équilibre cardiovasculaire.',
      isMedicine: false,
      category: 'Complément'
    }),
    productSeed({
      barcode: 'GP-340129',
      name: 'Lait infantile 1er age',
      scientificName: 'Infant formula 0-6 months',
      form: 'Boite',
      strength: '400 g',
      laboratory: 'Nestle',
      atcCode: 'V06DF',
      description: 'Nutrition infantile pour les premiers mois selon besoin du nourrisson.',
      isMedicine: false,
      category: 'Pédiatrie'
    }),
    productSeed({
      barcode: 'GP-340130',
      name: 'Serum physiologique unidoses',
      scientificName: 'Sodium chloride 0.9%',
      form: 'Boite',
      strength: '40 unidoses',
      laboratory: 'Gilbert',
      atcCode: 'B05XA03',
      description: 'Solution saline sterile pour hygiene nasale et oculaire.',
      isMedicine: false,
      category: 'Pédiatrie'
    }),
    productSeed({
      barcode: 'GP-340131',
      name: 'Creme vergetures grossesse',
      scientificName: 'Pregnancy stretch mark cream',
      form: 'Tube',
      strength: '150 ml',
      laboratory: 'Mustela',
      atcCode: 'D02AX',
      description: 'Soin dermocosmetique pour femmes enceintes et post-partum.',
      isMedicine: false,
      category: 'Maternité'
    }),
    productSeed({
      barcode: 'GP-340132',
      name: 'Vitamines prenatales',
      scientificName: 'Prenatal multivitamins',
      form: 'Comprime',
      strength: '30 unites',
      laboratory: 'Bayer',
      atcCode: 'A11AA',
      description: 'Complément multivitamine pour grossesse et preconception.',
      isMedicine: false,
      category: 'Maternité'
    }),
    productSeed({
      barcode: 'GP-340133',
      name: 'Ciprofloxacine 500 mg',
      scientificName: 'Ciprofloxacin',
      form: 'Comprime pellicule',
      strength: '500 mg',
      laboratory: 'Bayer',
      atcCode: 'J01MA02',
      description: 'Antibiotique fluoroquinolone utilise dans certaines infections sensibles.',
      isMedicine: true,
      category: 'Antibiotique'
    }),
    productSeed({
      barcode: 'GP-340134',
      name: 'Prednisone 20 mg',
      scientificName: 'Prednisone',
      form: 'Comprime',
      strength: '20 mg',
      laboratory: 'Pfizer',
      atcCode: 'H02AB07',
      description: 'Corticoïde oral pour inflammations et réactions allergiques sévères.',
      isMedicine: true,
      category: 'Respiratoire'
    }),
    productSeed({
      barcode: 'GP-340135',
      name: 'Magnesium 400 mg',
      scientificName: 'Magnesium citrate',
      form: 'Comprime',
      strength: '400 mg',
      laboratory: 'Arkopharma',
      atcCode: 'A12CC',
      description: 'Complément pour fatigue passagère, crampes et équilibre neuromusculaire.',
      isMedicine: false,
      category: 'Complément'
    }),
    productSeed({
      barcode: 'GP-340136',
      name: 'Ginseng 500 mg',
      scientificName: 'Panax ginseng',
      form: 'Capsule',
      strength: '500 mg',
      laboratory: 'Solgar',
      atcCode: 'A13A',
      description: 'Complément tonique pour vitalité et concentration.',
      isMedicine: false,
      category: 'Complément'
    })
  ];

  const productsByBarcode = new Map<string, mongoose.Document & { _id: mongoose.Types.ObjectId }>();

  for (const product of products) {
    const saved = await Product.findOneAndUpdate(
      { barcode: product.barcode },
      { $set: product },
      { upsert: true, new: true }
    );

    if (saved) {
      productsByBarcode.set(product.barcode, saved);
    }
  }

  const inventorySeeds = pharmacies.flatMap((pharmacy, pharmacyIndex) => {
    const size = 10 + (pharmacyIndex % 5);

    return Array.from({ length: size }, (_, slotIndex) => {
      const product = products[(pharmacyIndex * 3 + slotIndex) % products.length];
      const stockQuantity = computeStockQuantity(pharmacyIndex, slotIndex);

      return {
        ifu: pharmacy.ifu,
        barcode: product.barcode,
        price: computePrice(product, pharmacyIndex, slotIndex),
        stockQuantity,
        alertThreshold: product.isMedicine ? 6 : 4,
        expiryDate: product.isMedicine ? addDays(seedStartedAt, 180 + pharmacyIndex * 11 + slotIndex * 17) : undefined
      };
    });
  });

  for (const item of inventorySeeds) {
    const pharmacy = pharmaciesByIfu.get(item.ifu);
    const product = productsByBarcode.get(item.barcode);

    if (!pharmacy || !product) {
      continue;
    }

    await InventoryItem.findOneAndUpdate(
      {
        pharmacyId: pharmacy._id,
        productId: product._id
      },
      {
        $set: {
          price: item.price,
          stockQuantity: item.stockQuantity,
          alertThreshold: item.alertThreshold,
          isAvailable: item.stockQuantity > 0,
          expiryDate: item.expiryDate,
          lastUpdatedAt: seedStartedAt
        }
      },
      { upsert: true, new: true }
    );
  }

  for (const [index, pharmacy] of pharmacies.entries()) {
    const persistedPharmacy = pharmaciesByIfu.get(pharmacy.ifu);
    const owner = ownersByIfu.get(pharmacy.ifu) ?? rootManager;

    if (!persistedPharmacy) {
      continue;
    }

    const isOnDuty = pharmacy.services.includes('Garde');

    await Schedule.findOneAndUpdate(
      { pharmacyId: persistedPharmacy._id },
      {
        $set: {
          pharmacyId: persistedPharmacy._id,
          weekly: buildWeeklySchedule(index, isOnDuty),
          exceptions: buildScheduleExceptions(seedStartedAt, index, isOnDuty),
          updatedBy: owner._id
        }
      },
      { upsert: true, new: true }
    );
  }

  console.log('Seed complete:', {
    admin: admin.email,
    patient: patientEmail,
    manager: rootManager.email,
    pharmacyManagers: pharmacyManagers.length,
    pharmacies: seededPharmacies.length,
    products: productsByBarcode.size,
    inventoryItems: inventorySeeds.length,
    password: 'Admin123!'
  });

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
