'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientIndexPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const router = useRouter();
  const { patientId } = use(params);

  useEffect(() => {
    router.replace(`/dashboard/${patientId}/notes`);
  }, [patientId, router]);

  return null;
}
