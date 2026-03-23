import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

const CONSENT_KEY = 'pte-sathi-recording-consent';

export function hasRecordingConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function grantRecordingConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, 'true');
  } catch {}
}

export default function RecordingConsentModal({
  open,
  onAccept,
}: {
  open: boolean;
  onAccept: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Voice Recording Notice</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed pt-2">
            PTE Sansar records your voice to provide AI scoring. Recordings are processed within seconds and{' '}
            <strong className="text-foreground">permanently deleted within 24 hours</strong>. By continuing you agree to our{' '}
            <Link to="/privacy" className="text-primary underline underline-offset-2" target="_blank">
              Privacy Policy
            </Link>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button
            onClick={() => {
              grantRecordingConsent();
              onAccept();
            }}
            className="w-full sm:w-auto"
          >
            Accept &amp; Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
