import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ComingSoonReportCardProps = {
  title: string;
  description: string;
};

export function ComingSoonReportCard({ title, description }: ComingSoonReportCardProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This report is visible now and will be enabled in a later release.
      </CardContent>
    </Card>
  );
}
