'use client';

import { createContext, useContext } from 'react';
import type { PatientRecord } from '@/hooks/usePatients';

interface PatientContextType {
  patient: PatientRecord | undefined;
  isLoading: boolean;
}

const PatientContext = createContext<PatientContextType>({
  patient: undefined,
  isLoading: false,
});

export const PatientProvider = PatientContext.Provider;

export function usePatientContext() {
  return useContext(PatientContext);
}
