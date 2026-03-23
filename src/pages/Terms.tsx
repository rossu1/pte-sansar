import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 space-y-8 animate-fade-up">
      <h1 className="text-3xl font-bold" style={{ lineHeight: '1.15' }}>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 23 March 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Terms of Service ("Terms") govern your use of PTE Sathi, operated by <strong className="text-foreground">Udan Technologies Pvt. Ltd.</strong>, a company registered in Nepal. By using our service you agree to these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Subscriptions &amp; Billing</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-1">
          <li>Subscriptions are billed monthly or annually depending on the plan you choose.</li>
          <li>Subscriptions <strong className="text-foreground">auto-renew</strong> at the end of each billing period unless cancelled.</li>
          <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period — you retain access until then.</li>
          <li>Prices are listed in Nepalese Rupees (NPR) and may be updated with 30 days' notice.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Refund Policy</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Refund requests made within <strong className="text-foreground">24 hours of payment</strong> will be honoured in full. After 24 hours, no refunds will be issued. To request a refund, email{' '}
          <a href="mailto:privacy@udantechnologies.com" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
            privacy@udantechnologies.com
          </a>{' '}with your account email and payment details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">You agree not to:</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-1">
          <li>Share your account credentials with others or allow multiple people to use a single account.</li>
          <li>Use automated tools, bots or scrapers to access our service or extract content.</li>
          <li>Attempt to reverse-engineer, decompile or extract source code from our platform.</li>
          <li>Use the service for any unlawful purpose or in violation of these Terms.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Intellectual Property</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          All content, questions, scoring algorithms, and software on PTE Sathi are the intellectual property of Udan Technologies Pvt. Ltd. You may not reproduce, distribute or create derivative works without written permission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PTE Sathi is provided "as is" without warranties of any kind. We do not guarantee that AI scores will match official PTE exam results. Udan Technologies Pvt. Ltd. shall not be liable for any indirect, incidental, special or consequential damages arising from your use of the service, including but not limited to loss of data, exam results or revenue. Our total liability is limited to the amount you paid for the service in the 12 months preceding the claim.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Account Termination</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We reserve the right to suspend or terminate your account if you violate these Terms. You may delete your account at any time by contacting us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Governing Law</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Terms are governed by and construed in accordance with the laws of Nepal. Any disputes shall be subject to the exclusive jurisdiction of the courts of Nepal.
        </p>
      </section>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Questions? Contact us at{' '}
          <a href="mailto:privacy@udantechnologies.com" className="text-primary underline underline-offset-2">privacy@udantechnologies.com</a>
          {' · '}
          <Link to="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
