'use client';

import { useEffect, use } from 'react';
import { usePatient } from '@/hooks/usePatients';
import { usePatientStore } from '@/stores/patientStore';
import { ScreenNav } from '@/components/layout/ScreenNav';
import { PatientProvider } from '@/contexts/PatientContext';
import { calcAge, initials } from '@/lib/patient-utils';

export default function PatientWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { data: patient, isLoading } = usePatient(patientId);
  const { setActivePatient } = usePatientStore();

  const age = patient ? calcAge(patient.dateOfBirth) : 0;
  const dob = patient
    ? new Date(patient.dateOfBirth).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const sexLabel = patient
    ? patient.sex === 'MALE'
      ? 'Male'
      : patient.sex === 'FEMALE'
      ? 'Female'
      : 'Other'
    : '';

  useEffect(() => {
    if (patient) {
      setActivePatient(patient);
    }
  }, [patient, setActivePatient]);

  return (
    <PatientProvider value={{ patient, isLoading }}>
      <div className="flex flex-col flex-1 overflow-hidden">
        <ScreenNav patientId={patientId} />
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-3">
            {patient && (
              <div className="bg-surface border border-border rounded-card p-4 flex gap-5 items-stretch flex-wrap shadow-card w-full mb-1">
                {/* Left Column: Avatar + Name */}
                <div className="flex gap-3.5 items-center flex-[1.2] min-w-[250px] border-r border-border pr-5">
                  <div className="w-11 h-11 rounded-full bg-accent-light border-2 border-accent flex items-center justify-center text-[15px] font-bold text-accent-hover flex-shrink-0">
                    {initials(patient.firstName, patient.lastName)}
                  </div>
                  <div className="text-[12px] flex flex-col gap-1 min-w-0">
                    <span className="text-[9px] font-semibold text-text-muted uppercase tracking-[0.5px]">
                      Patient Name
                    </span>
                    <span
                      className="text-[18px] font-bold text-text-primary leading-tight truncate"
                      title={`${patient.lastName}, ${patient.firstName}`}
                    >
                      {patient.lastName}, {patient.firstName}
                      {patient.middleName ? ` ${patient.middleName}` : ''}
                      {patient.extension ? ` ${patient.extension}` : ''}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted mt-1 bg-surface-2 border border-border rounded px-1.5 py-[1px] w-fit leading-none">
                      #{patient.patientCode}
                    </span>
                  </div>
                </div>

                {/* Right Column: Demographics */}
                <div className="flex flex-col gap-2 flex-1 min-w-[280px] justify-center pl-5">
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted uppercase tracking-[0.5px] block">
                        Sex
                      </span>
                      <strong className="text-text-primary text-[12px]">{sexLabel}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted uppercase tracking-[0.5px] block">
                        Age
                      </span>
                      <strong className="text-text-primary text-[12px]">{age} yrs</strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted uppercase tracking-[0.5px] block">
                        Birthdate
                      </span>
                      <strong className="text-text-primary text-[12px]" title={dob}>
                        {dob}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </PatientProvider>
  );
}
