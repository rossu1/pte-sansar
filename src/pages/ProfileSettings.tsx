import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Trash2, Loader2 } from 'lucide-react';

const EXAM_TYPES = ['PTE Academic', 'PTE Core'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileSettings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [examType, setExamType] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [examDate, setExamDate] = useState('');
  const [level, setLevel] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setExamType(profile.exam_type ?? '');
      setTargetScore(profile.target_score?.toString() ?? '');
      setExamDate(profile.exam_date ?? '');
      setLevel(profile.level ?? '');
      setCity((profile as any).city ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        exam_type: examType || null,
        target_score: targetScore ? parseInt(targetScore, 10) : null,
        exam_date: examDate || null,
        level: level || null,
        city: city || null,
      } as any)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Profile updated');
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;

      await signOut();
      navigate('/auth', { replace: true });
      toast.success('Account deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Profile Settings</h1>

      <div className="space-y-5">
        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ''} disabled className="bg-muted" />
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        {/* Exam Type */}
        <div className="space-y-1.5">
          <Label>Exam Type</Label>
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger><SelectValue placeholder="Select exam type" /></SelectTrigger>
            <SelectContent>
              {EXAM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Score */}
        <div className="space-y-1.5">
          <Label htmlFor="targetScore">Target Score</Label>
          <Input id="targetScore" type="number" min={10} max={90} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
        </div>

        {/* Exam Date */}
        <div className="space-y-1.5">
          <Label htmlFor="examDate">Exam Date</Label>
          <Input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>

        {/* Level */}
        <div className="space-y-1.5">
          <Label>Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kathmandu" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save Changes
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="border border-destructive/30 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back.</p>
        <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
          <Trash2 /> Delete Account
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data including scores, attempts, and recordings. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : null}
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
