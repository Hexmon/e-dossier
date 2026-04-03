import { buildTemplateMappings, getTemplateMatchForSemester } from '@/lib/interviewTemplateMatching';

type ExpectedSlot = {
  templateId: string;
  semester: number;
};

function matchIsSemesterAllowed(match: ReturnType<typeof getTemplateMatchForSemester>, semester: number) {
  if (!match) return false;
  const semesters = match.template.semesters ?? [];
  return semesters.length === 0 || semesters.includes(semester);
}

export function buildExpectedSpecialInterviewSlots(
  mappings: ReturnType<typeof buildTemplateMappings>
): ExpectedSlot[] {
  const specialSlotMap = new Map<string, ExpectedSlot>();

  for (const semester of [1, 2, 3, 4, 5, 6] as const) {
    const match = getTemplateMatchForSemester(mappings, 'special', semester);
    if (!match || !matchIsSemesterAllowed(match, semester)) continue;
    const key = `${match.template.id}:${semester}`;
    specialSlotMap.set(key, { templateId: match.template.id, semester });
  }

  return Array.from(specialSlotMap.values());
}
