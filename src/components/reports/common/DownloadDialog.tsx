'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/reports/common/PasswordField';

export type DownloadDialogMeta = {
  password: string;
  preparedBy: string;
  checkedBy: string;
  instructorName?: string;
};

type DownloadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isPending?: boolean;
  includeDateReadonly?: boolean;
  includeInstructorField?: boolean;
  preparedByRequired?: boolean;
  checkedByRequired?: boolean;
  instructorRequired?: boolean;
  initialValues?: {
    preparedBy?: string;
    checkedBy?: string;
    instructorName?: string;
  };
  onSubmit: (meta: DownloadDialogMeta) => Promise<void> | void;
};

export function DownloadDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  includeDateReadonly,
  includeInstructorField = false,
  preparedByRequired = true,
  checkedByRequired = true,
  instructorRequired = false,
  initialValues,
  onSubmit,
}: DownloadDialogProps) {
  const [password, setPassword] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [instructorName, setInstructorName] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
      setPreparedBy(initialValues?.preparedBy ?? '');
      setCheckedBy(initialValues?.checkedBy ?? '');
      setInstructorName(initialValues?.instructorName ?? '');
      return;
    }

    setPassword('');
    setPreparedBy('');
    setCheckedBy('');
    setInstructorName('');
  }, [open, initialValues?.preparedBy, initialValues?.checkedBy, initialValues?.instructorName]);

  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleSubmit = async () => {
    await onSubmit({
      password,
      preparedBy,
      checkedBy,
      instructorName: includeInstructorField ? instructorName : undefined,
    });
  };

  const disabled =
    !password.trim() ||
    (preparedByRequired && !preparedBy.trim()) ||
    (checkedByRequired && !checkedBy.trim()) ||
    (includeInstructorField && instructorRequired && !instructorName.trim()) ||
    Boolean(isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {includeDateReadonly ? (
            <div className="space-y-2">
              <Label>Date</Label>
              <Input value={currentDate} disabled />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Password (file encryption)</Label>
            <PasswordField value={password} onChange={setPassword} />
          </div>

          {includeInstructorField ? (
            <div className="space-y-2">
              <Label>Instructor {instructorRequired ? '' : '(Optional)'}</Label>
              <Input value={instructorName} onChange={(event) => setInstructorName(event.target.value)} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Prepared By {preparedByRequired ? '' : '(Optional)'}</Label>
            <Input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Checked By {checkedByRequired ? '' : '(Optional)'}</Label>
            <Input value={checkedBy} onChange={(event) => setCheckedBy(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={disabled} onClick={handleSubmit}>
            {isPending ? 'Preparing...' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
