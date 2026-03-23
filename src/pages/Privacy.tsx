import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 space-y-8 animate-fade-up">
      <h1 className="text-3xl font-bold" style={{ lineHeight: '1.15' }}>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 23 March 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Who We Are</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PTE Sansar is operated by <strong className="text-foreground">Udan Technologies Pvt. Ltd.</strong>, a company registered in Nepal. This policy explains how we collect, use and protect your personal data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Data We Collect</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-1">
          <li><strong className="text-foreground">Account information</strong> — email address, full name</li>
          <li><strong className="text-foreground">Exam preferences</strong> — exam type, target score, exam date</li>
          <li><strong className="text-foreground">Voice recordings</strong> — audio captured during Speaking practice sessions</li>
          <li><strong className="text-foreground">Practice data</strong> — answers, scores, AI feedback, and attempt history</li>
          <li><strong className="text-foreground">Usage data</strong> — pages visited, features used, timestamps</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. How We Store Your Data</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your data is stored securely on Supabase infrastructure hosted on Amazon Web Services (AWS). All data is encrypted in transit (TLS) and at rest. Access is restricted to authorised personnel only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Voice Recordings</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Voice recordings are used solely for AI-powered scoring and feedback. Recordings are processed within seconds of submission and are <strong className="text-foreground">permanently deleted within 24 hours</strong>. We do not sell, share or use recordings for any purpose other than providing you with scores and feedback.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. How We Use Your Data</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-1">
          <li>To provide AI scoring and personalised feedback</li>
          <li>To track your progress and adapt question difficulty</li>
          <li>To manage your subscription and account</li>
          <li>To improve our service and fix issues</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Data Deletion</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You may request deletion of all your personal data at any time by emailing{' '}
          <a href="mailto:privacy@udantechnologies.com" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
            privacy@udantechnologies.com
          </a>. We will process your request within 30 days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Third-Party Services</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use third-party AI models for scoring. Audio data sent to these services is processed in real-time and not retained by them beyond the processing window. We do not share your personal information with advertisers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Governing Law</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This Privacy Policy is governed by and construed in accordance with the laws of Nepal. Any disputes shall be subject to the exclusive jurisdiction of the courts of Nepal.
        </p>
      </section>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Questions? Contact us at{' '}
          <a href="mailto:privacy@udantechnologies.com" className="text-primary underline underline-offset-2">privacy@udantechnologies.com</a>
          {' · '}
          <Link to="/terms" className="text-primary underline underline-offset-2">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
