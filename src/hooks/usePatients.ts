import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { PatientSummary } from '@/stores/patientStore';

export interface PatientRecord extends PatientSummary {
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PatientsResponse {
  data: PatientRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  extension?: string;
  dateOfBirth: string;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  addressStreet: string;
  addressBarangay: string;
  addressCity: string;
  addressRegion: string;
}

export interface UpdatePatientInput {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  extension?: string | null;
  dateOfBirth?: string;
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  addressStreet?: string;
  addressBarangay?: string;
  addressCity?: string;
  addressRegion?: string;
}

export interface NoteRecord {
  id: string;
  patientId: string;
  authorId: string;
  authorSnapshot: {
    firstName: string;
    lastName: string;
    role: string;
    licenseNumber?: string;
  };
  noteDatetime: string;
  notes: string;
  orders?: string;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNoteInput {
  notes: string;
  orders?: string;
  noteDatetime?: string;
}

export interface UpdateNoteInput {
  id: string;
  notes?: string;
  orders?: string;
}

export interface VitalSignRecord {
  id: string;
  patientId: string;
  sbp?: number | null;
  dbp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  measuredAt: string;
  measuredBy: string;
  measuredBySnapshot: {
    firstName: string;
    lastName: string;
    role: string;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVitalsInput {
  sbp?: number | null;
  dbp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  measuredAt?: string;
}

export interface UpdateVitalsInput extends CreateVitalsInput {
  id: string;
}

export function usePatients(search = '', page = 1, limit = 50, includeInactive = false) {
  return useQuery<PatientsResponse>({
    queryKey: ['patients', search, page, limit, includeInactive],
    queryFn: () => {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
        includeInactive: includeInactive ? 'true' : 'false',
      });
      return apiRequest<PatientsResponse>(`/patients?${params.toString()}`);
    },
    staleTime: 10000,
  });
}

export function usePatient(id: string | undefined | null) {
  return useQuery<PatientRecord>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const res = await apiRequest<{ patient: PatientRecord }>(`/patients/${id}`);
      return res.patient;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const res = await apiRequest<{ patient: PatientRecord; message: string }>('/patients', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePatientInput) => {
      const res = await apiRequest<{ patient: PatientRecord; message: string }>(
        `/patients/${patientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      );
      return res.patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function usePatientNotes(patientId: string | undefined | null, page = 1, limit = 1) {
  return useQuery<{ data: NoteRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['notes', patientId, page, limit],
    queryFn: () =>
      apiRequest<{ data: NoteRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        `/patients/${patientId}/notes?page=${page}&limit=${limit}`
      ),
    enabled: !!patientId,
    staleTime: 10000,
  });
}

export function useCreateNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const res = await apiRequest<{ note: NoteRecord; message: string }>(
        `/patients/${patientId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return res.note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', patientId] });
    },
  });
}

export function useUpdateNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateNoteInput) => {
      const res = await apiRequest<{ note: NoteRecord; message: string }>(
        `/notes/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      );
      return res.note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', patientId] });
    },
  });
}

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest<{ message: string; note: NoteRecord }>(`/notes/${noteId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', patientId] });
    },
  });
}

export function usePatientVitals(patientId: string | undefined | null, page = 1, limit = 20) {
  return useQuery<{ data: VitalSignRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['vitals', patientId, page, limit],
    queryFn: () =>
      apiRequest<{ data: VitalSignRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        `/patients/${patientId}/vitals?page=${page}&limit=${limit}`
      ),
    enabled: !!patientId,
    staleTime: 10000,
  });
}

export function useCreateVitals(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVitalsInput) => {
      const res = await apiRequest<{ vitals: VitalSignRecord; message: string }>(
        `/patients/${patientId}/vitals`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return res.vitals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', patientId] });
    },
  });
}

export function useUpdateVitals(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateVitalsInput) => {
      const res = await apiRequest<{ vitals: VitalSignRecord; message: string }>(
        `/vitals/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      );
      return res.vitals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', patientId] });
    },
  });
}

export function useDeleteVitals(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vitalsId: string) => {
      return apiRequest<{ message: string; vitals: VitalSignRecord }>(`/vitals/${vitalsId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', patientId] });
    },
  });
}
