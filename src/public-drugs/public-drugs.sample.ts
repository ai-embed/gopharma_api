export interface PublicDrugRecord {
  id: string;
  name: string;
  scientificName?: string;
  category?: string;
  barcode?: string;
  form?: string;
  strength?: string;
  laboratory?: string;
  atcCode?: string;
  country?: string;
  source?: string;
  sourcePharmacyId?: string;
  sourcePharmacyName?: string;
}

export const PUBLIC_DRUGS_SAMPLE: PublicDrugRecord[] = [
  {
    id: 'BDPM-001',
    name: 'PARACETAMOL 500 MG CPR',
    form: 'Comprimé',
    strength: '500 mg',
    laboratory: 'Sanofi',
    atcCode: 'N02BE01',
    country: 'FR',
    source: 'ANSM'
  },
  {
    id: 'BDPM-002',
    name: 'AMOXICILLINE 500 MG GELULE',
    form: 'Gélule',
    strength: '500 mg',
    laboratory: 'Mylan',
    atcCode: 'J01CA04',
    country: 'FR',
    source: 'ANSM'
  },
  {
    id: 'BDPM-003',
    name: 'IBUPROFENE 400 MG CPR',
    form: 'Comprimé',
    strength: '400 mg',
    laboratory: 'Biogaran',
    atcCode: 'M01AE01',
    country: 'FR',
    source: 'ANSM'
  }
];
