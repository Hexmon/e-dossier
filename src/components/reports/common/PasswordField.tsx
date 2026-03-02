'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function PasswordField({ value, onChange, placeholder = 'Enter password' }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const onCopy = async () => {
    if (!value) {
      toast.error('Enter password first.');
      return;
    }
    await navigator.clipboard.writeText(value);
    toast.success('Password copied.');
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <Button type="button" variant="outline" size="icon" onClick={() => setVisible((prev) => !prev)}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
