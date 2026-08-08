'use client';

import { useState } from 'react';
import { usePatient, VitalSignRecord, CreateVitalsInput, UpdateVitalsInput } from '@/hooks/usePatients';
import { initials, calcAge } from '@/lib/patient-utils';
import { X } from 'lucide-react';

interface VitalsFormModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  editing: VitalSignRecord | null;
  onSave: (values: CreateVitalsInput | (UpdateVitalsInput & { id: string })) => void;
  saving: boolean;
}

function VitalsFormDialog({
  onClose,
  patientId,
  editing,
  onSave,
  saving,
}: Omit<VitalsFormModalProps, 'open'>) {
  const { data: patient } = usePatient(patientId);

  // Form state initialized from editing record or blank
  const [sbp, setSbp] = useState<string>(() => editing?.sbp?.toString() ?? '');
  const [dbp, setDbp] = useState<string>(() => editing?.dbp?.toString() ?? '');
  const [heartRate, setHeartRate] = useState<string>(() => editing?.heartRate?.toString() ?? '');
  const [respiratoryRate, setRespiratoryRate] = useState<string>(
    () => editing?.respiratoryRate?.toString() ?? ''
  );
  const [temperature, setTemperature] = useState<string>(() => editing?.temperature?.toString() ?? '');
  const [oxygenSaturation, setOxygenSaturation] = useState<string>(
    () => editing?.oxygenSaturation?.toString() ?? ''
  );

  const [measureDate, setMeasureDate] = useState<string>(() => {
    const d = editing ? new Date(editing.measuredAt) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [measureTime, setMeasureTime] = useState<string>(() => {
    const d = editing ? new Date(editing.measuredAt) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    const parse = (val: string) => (val === '' ? null : Number(val));

    const s = parse(sbp);
    const d = parse(dbp);
    const hr = parse(heartRate);
    const rr = parse(respiratoryRate);
    const t = parse(temperature);
    const o2 = parse(oxygenSaturation);

    // Range checks apply ONLY when value is entered
    if (s !== null && (s < 50 || s > 300)) errs.sbp = '50–300';
    if (d !== null && (d < 20 || d > 200)) errs.dbp = '20–200';
    if (hr !== null && (hr < 20 || hr > 300)) errs.heartRate = '20–300';
    if (rr !== null && (rr < 5 || rr > 60)) errs.respiratoryRate = '5–60';
    if (t !== null && (t < 30.0 || t > 45.0)) errs.temperature = '30.0–45.0';
    if (o2 !== null && (o2 < 50 || o2 > 100)) errs.oxygenSaturation = '50–100';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const parse = (val: string) => (val === '' ? undefined : Number(val));

    const payload: CreateVitalsInput = {
      sbp: parse(sbp),
      dbp: parse(dbp),
      heartRate: parse(heartRate),
      respiratoryRate: parse(respiratoryRate),
      temperature: parse(temperature),
      oxygenSaturation: parse(oxygenSaturation),
      measuredAt:
        measureDate && measureTime
          ? new Date(`${measureDate}T${measureTime}`).toISOString()
          : undefined,
    };

    if (editing) {
      onSave({ id: editing.id, ...payload });
    } else {
      onSave(payload);
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[500] flex items-center justify-center animate-in fade-in duration-150"
    >
      <div className="bg-surface border border-border rounded-[10px] w-[600px] max-h-[90vh] overflow-y-auto shadow-modal">
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-border">
          <h2 className="text-[15px] font-bold flex-1 text-text-primary">
            {editing ? 'Edit Vitals' : 'Record Vitals'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-6 h-6 rounded-btn bg-transparent border-transparent hover:bg-surface-2 hover:border-border transition-all duration-150 inline-flex items-center justify-center text-text-muted cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Patient Identifier Banner */}
        {patient && (
          <div className="flex items-center gap-3 px-[18px] py-2 bg-surface-2 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-accent-light border border-accent flex items-center justify-center text-[11px] font-bold text-accent-hover flex-shrink-0">
              {initials(patient.firstName, patient.lastName)}
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-bold text-text-primary">
                {patient.lastName}, {patient.firstName}
              </span>
              <span className="font-mono text-[10px] text-text-muted bg-surface border border-border rounded px-1.5 py-[1px]">
                #{patient.patientCode}
              </span>
              <span className="text-text-muted ml-2">
                {patient.sex === 'MALE' ? 'M' : patient.sex === 'FEMALE' ? 'F' : 'O'} •{' '}
                {calcAge(patient.dateOfBirth)} yrs
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-[18px] flex flex-col gap-5">
          <div className="grid grid-cols-2 @max-[1023px]:grid-cols-1 gap-4">
            <div className="col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Date <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full h-[34px] px-2 border border-border rounded-[6px] bg-surface text-[13px] font-mono text-text-primary outline-none focus:border-accent"
                value={measureDate}
                onChange={(e) => setMeasureDate(e.target.value)}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Time <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <input
                type="time"
                className="w-full h-[34px] px-2 border border-border rounded-[6px] bg-surface text-[13px] font-mono text-text-primary outline-none focus:border-accent"
                value={measureTime}
                onChange={(e) => setMeasureTime(e.target.value)}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Systolic BP <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.sbp
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={sbp}
                    onChange={(e) => setSbp(e.target.value)}
                    placeholder="e.g. 120"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[40px]">mmHg</span>
              </div>
              {errors.sbp && <div className="text-[10px] text-red mt-1">{errors.sbp}</div>}
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Diastolic BP <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.dbp
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={dbp}
                    onChange={(e) => setDbp(e.target.value)}
                    placeholder="e.g. 80"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[40px]">mmHg</span>
              </div>
              {errors.dbp && <div className="text-[10px] text-red mt-1">{errors.dbp}</div>}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Heart Rate <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.heartRate
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="e.g. 72"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[30px]">bpm</span>
              </div>
              {errors.heartRate && <div className="text-[10px] text-red mt-1">{errors.heartRate}</div>}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Resp Rate <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.respiratoryRate
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="e.g. 16"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[30px]">/min</span>
              </div>
              {errors.respiratoryRate && (
                <div className="text-[10px] text-red mt-1">{errors.respiratoryRate}</div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                Temperature <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.temperature
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    step="0.1"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 36.5"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[30px]">°C</span>
              </div>
              {errors.temperature && <div className="text-[10px] text-red mt-1">{errors.temperature}</div>}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-1">
                O2 Saturation <span className="text-text-muted font-normal normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center border ${
                    errors.oxygenSaturation
                      ? 'border-red-border focus-within:border-red-border focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-border focus-within:border-accent focus-within:shadow-accent-focus'
                  } rounded-[6px] ${saving ? 'bg-surface-2' : 'bg-surface'} transition-all h-[34px]`}
                >
                  <input
                    type="number"
                    disabled={saving}
                    className="w-full bg-transparent px-3 text-[13px] text-text-primary outline-none disabled:text-text-muted disabled:cursor-not-allowed"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                    placeholder="e.g. 98"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-[30px]">%</span>
              </div>
              {errors.oxygenSaturation && (
                <div className="text-[10px] text-red mt-1">{errors.oxygenSaturation}</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[28px] px-3 rounded-btn text-[11px] font-semibold text-text-secondary bg-surface-2 border border-border hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`h-[28px] px-3 rounded-btn text-[11px] font-semibold text-white border transition-all duration-150 flex items-center justify-center gap-1.5 ${
                saving
                  ? 'bg-accent-hover border-accent-hover cursor-not-allowed'
                  : 'bg-accent border-accent-hover shadow-btn-primary hover:bg-accent-hover cursor-pointer'
              }`}
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Record Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VitalsFormModal(props: VitalsFormModalProps) {
  if (!props.open) return null;
  return <VitalsFormDialog key={`${props.editing?.id || 'new'}`} {...props} />;
}
