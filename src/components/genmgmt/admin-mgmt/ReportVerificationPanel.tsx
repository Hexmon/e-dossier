"use client";

import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldX, FileCheck2 } from 'lucide-react';

import { useReportVerification } from '@/hooks/useReportVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function maskChecksum(value: string | null): string {
  if (!value) return '-';
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ReportVerificationPanel() {
  const [versionId, setVersionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { verifyReport, isVerifying, verificationResult } = useReportVerification();

  const canSubmit = versionId.trim().length > 0 && !isVerifying;

  const verdictTone = useMemo(() => {
    if (!verificationResult) return null;
    if (verificationResult.overallVerdict === 'AUTHENTIC_EXACT') return 'success';
    if (verificationResult.overallVerdict === 'AUTHENTIC_CODE_ONLY') return 'warning';
    return 'destructive';
  }, [verificationResult]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await verifyReport({
      versionId: versionId.trim().toUpperCase(),
      file,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verify Downloaded Report PDF</CardTitle>
          <CardDescription>
            Enter the report version code and optionally upload the PDF to verify byte-level integrity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="version-id">Version Code</Label>
              <Input
                id="version-id"
                value={versionId}
                onChange={(event) => setVersionId(event.target.value)}
                placeholder="RPT-260302-123456"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="pdf-file">PDF File (Optional)</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex items-end md:col-span-1">
              <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {verificationResult ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="mr-2 text-lg">Verification Result</CardTitle>
              {verdictTone === 'success' ? (
                <Badge className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Authentic (Code + File Match)
                </Badge>
              ) : null}
              {verdictTone === 'warning' ? (
                <Badge variant="secondary" className="gap-1">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Code Verified (File Not Matched)
                </Badge>
              ) : null}
              {verdictTone === 'destructive' ? (
                <Badge variant="destructive" className="gap-1">
                  <ShieldX className="h-3.5 w-3.5" />
                  Not Authentic
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              Code Status: {verificationResult.codeStatus} | File Status: {verificationResult.fileStatus}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {verificationResult.fileStatus === 'MISMATCH' ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Uploaded PDF hash does not match stored checksum for this version code.
              </p>
            ) : null}

            {verificationResult.fileStatus === 'CHECKSUM_UNAVAILABLE' ? (
              <p className="rounded-md border border-warning/30 bg-warning/20 px-3 py-2 text-sm text-warning-foreground">
                Stored checksum is unavailable for this version. Code authenticity is confirmed, file integrity cannot
                be compared.
              </p>
            ) : null}

            {verificationResult.details ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3 text-sm">
                  <p><span className="font-medium">Version:</span> {verificationResult.versionId}</p>
                  <p><span className="font-medium">Report Type:</span> {verificationResult.details.reportType}</p>
                  <p><span className="font-medium">Generated At:</span> {formatDate(verificationResult.details.generatedAt)}</p>
                  <p><span className="font-medium">Encrypted:</span> {verificationResult.details.encrypted ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">File Name:</span> {verificationResult.details.fileName}</p>
                  <p><span className="font-medium">Checksum:</span> {maskChecksum(verificationResult.details.checksumSha256)}</p>
                  <p><span className="font-medium">Batch ID:</span> {verificationResult.details.batchId ?? '-'}</p>
                </div>

                <div className="space-y-2 rounded-md border p-3 text-sm">
                  <p><span className="font-medium">Requested By Username:</span> {verificationResult.details.requestedBy.username ?? '-'}</p>
                  <p><span className="font-medium">Requested By Name:</span> {verificationResult.details.requestedBy.name ?? '-'}</p>
                  <p><span className="font-medium">Requested By Rank:</span> {verificationResult.details.requestedBy.rank ?? '-'}</p>
                  <p><span className="font-medium">Prepared By:</span> {verificationResult.details.preparedBy || '-'}</p>
                  <p><span className="font-medium">Checked By:</span> {verificationResult.details.checkedBy || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No stored details found for this version code.</p>
            )}

            {verificationResult.details?.filters ? (
              <div className="space-y-2">
                <Label>Stored Filters</Label>
                <pre className="max-h-60 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                  {JSON.stringify(verificationResult.details.filters, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
