import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BookOpen, Target, Calendar, GraduationCap } from 'lucide-react';
import { sanitizeNumeric } from '@/lib/sanitize';

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [examType, setExamType] = useState<string>('');
  const [targetScore, setTargetScore] = useState('');
  const [examDate, setExamDate] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);

  const examOptions = [
    { value: 'PTE', label: 'PTE Academic', icon: '📝' },
    { value: 'IELTS', label: 'IELTS', icon: '📚' },
    { value: 'Both', label: 'Both', icon: '🎯' },
  ];

  const levelOptions = [
    { value: 'Beginner', label: 'Beginner', desc: 'Just starting out' },
    { value: 'Intermediate', label: 'Intermediate', desc: 'Some experience' },
    { value: 'Advanced', label: 'Advanced', desc: 'Need fine-tuning' },
  ];

  const handleSubmit = async () => {
    if (!examType || !level) {
      toast.error('Please select your exam and level');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        exam_type: examType,
        target_score: targetScore ? parseInt(targetScore) : null,
        exam_date: examDate || null,
        level,
      }).eq('user_id', user!.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated! Let\'s start studying 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to PTE Sathi!</h1>
          </div>
          <p className="text-muted-foreground">Let's personalize your study plan</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <h2 className="text-lg font-semibold">Tell us about your goals</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Which exam are you preparing for?</Label>
              <div className="grid grid-cols-3 gap-2">
                {examOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExamType(opt.value)}
                    className={`p-3 rounded-lg border text-center transition-all duration-200 active:scale-[0.97] ${examType === opt.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                      }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-xs font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Score */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Target className="w-4 h-4" /> Target score</Label>
              <Input type="number" placeholder={examType === 'IELTS' ? 'e.g. 7' : 'e.g. 65'} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
            </div>

            {/* Exam Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Exam date (optional)</Label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Current level</Label>
              <div className="grid grid-cols-3 gap-2">
                {levelOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(opt.value)}
                    className={`p-3 rounded-lg border text-center transition-all duration-200 active:scale-[0.97] ${level === opt.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                      }`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full h-11" disabled={loading}>
              {loading ? 'Saving...' : 'Start Learning 🚀'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
