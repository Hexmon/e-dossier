import { ConsolidatedSessionalCard } from '@/components/reports/cards/ConsolidatedSessionalCard';
import { SemesterGradeCard } from '@/components/reports/cards/SemesterGradeCard';
import { PtAssessmentCard } from '@/components/reports/cards/PtAssessmentCard';
import { FinalResultCompilationCard } from '@/components/reports/cards/FinalResultCompilationCard';
import { CourseWisePerformanceCard } from '@/components/reports/cards/CourseWisePerformanceCard';
import { CourseWiseFinalPerformanceCard } from '@/components/reports/cards/CourseWiseFinalPerformanceCard';

export function ReportsHub() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Academics</h2>
        <div className="grid grid-cols-1 gap-4">
          <ConsolidatedSessionalCard />
          <SemesterGradeCard />
          <FinalResultCompilationCard />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mil Training</h2>
        <div className="grid grid-cols-1 gap-4">
          <PtAssessmentCard />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Overall Training</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CourseWisePerformanceCard />
          <CourseWiseFinalPerformanceCard />
        </div>
      </section>
    </div>
  );
}
