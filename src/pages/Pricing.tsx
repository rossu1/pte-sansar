import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lock, Star, MessageCircle } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { toast } from 'sonner';

const i18n = {
  title: { en: 'Choose Your Plan', np: 'आफ्नो योजना छान्नुहोस्' },
  subtitle: { en: 'Invest in your PTE success', np: 'तपाईंको PTE सफलतामा लगानी गर्नुहोस्' },
  currentPlan: { en: 'Current Plan', np: 'हालको योजना' },
  popular: { en: 'Most Popular', np: 'सबैभन्दा लोकप्रिय' },
  contact: { en: 'Contact to Upgrade', np: 'अपग्रेड गर्न सम्पर्क गर्नुहोस्' },
  monthly: { en: 'Monthly', np: 'मासिक' },
  annual: { en: 'Annual', np: 'वार्षिक' },
  saveLabel: { en: 'Save 33%', np: '३३% बचत' },
  perMonth: { en: '/month', np: '/महिना' },
  perYear: { en: '/year', np: '/वर्ष' },
  forever: { en: 'Forever free', np: 'सधैं निःशुल्क' },
};

const freeFeatures = [
  { text: { en: '5 questions per day', np: 'दैनिक ५ प्रश्न' }, included: true },
  { text: { en: '1 mock test/month (basic score)', np: 'मासिक १ मक टेस्ट (आधारभूत स्कोर)' }, included: true },
  { text: { en: 'English feedback only', np: 'अंग्रेजी प्रतिक्रिया मात्र' }, included: true },
  { text: { en: 'Last 7 days progress only', np: 'पछिल्लो ७ दिनको प्रगति मात्र' }, included: true },
  { text: { en: 'Speaking records (AI score locked)', np: 'बोल्ने रेकर्ड (AI स्कोर लक)' }, included: true, locked: true },
  { text: { en: 'Nepali feedback', np: 'नेपाली प्रतिक्रिया' }, included: false },
  { text: { en: 'Personalised study plan', np: 'व्यक्तिगत अध्ययन योजना' }, included: false },
];

const proFeatures = [
  { text: { en: 'Unlimited AI-generated questions', np: 'असीमित AI-जनित प्रश्नहरू' }, included: true },
  { text: { en: 'Full AI speaking scorer with sub-scores', np: 'पूर्ण AI बोल्ने स्कोरर सब-स्कोर सहित' }, included: true },
  { text: { en: 'Nepali + English feedback', np: 'नेपाली + अंग्रेजी प्रतिक्रिया' }, included: true },
  { text: { en: 'Personalised study plan', np: 'व्यक्तिगत अध्ययन योजना' }, included: true },
  { text: { en: 'Full progress history', np: 'पूर्ण प्रगति इतिहास' }, included: true },
  { text: { en: 'Adaptive difficulty', np: 'अनुकूली कठिनाई' }, included: true },
  { text: { en: 'Unlimited mock tests', np: 'असीमित मक टेस्ट' }, included: true },
];

const WHATSAPP_LINK = 'https://wa.me/610420758831?text=Hi%2C%20I%20want%20to%20upgrade%20my%20PTE-Sansar%20plan';

export default function PricingPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
      .then(({ data }) => {
        if (data) setCurrentPlan(data.plan);
      });
  }, [user]);

  const handleUpgrade = () => {
    toast('Payment integration coming soon', {
      description: 'Contact us on WhatsApp to upgrade your plan.',
      action: {
        label: 'WhatsApp',
        onClick: () => window.open(WHATSAPP_LINK, '_blank'),
      },
      duration: 8000,
    });
  };

  const proPrice = billing === 'annual' ? 'NPR 7,999' : 'NPR 999';
  const proPriceLabel = billing === 'annual' ? i18n.perYear : i18n.perMonth;

  const plans = [
    { id: 'free', name: { en: 'Free', np: 'निःशुल्क' }, price: 'NPR 0', priceLabel: i18n.forever, features: freeFeatures, highlighted: false },
    { id: 'pro', name: { en: 'Pro', np: 'प्रो' }, price: proPrice, priceLabel: proPriceLabel, features: proFeatures, highlighted: true },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold font-heading" style={{ lineHeight: '1.15' }}>
          {t(i18n.title, lang)}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t(i18n.subtitle, lang)}
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <button
          onClick={() => setBilling('monthly')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
            billing === 'monthly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(i18n.monthly, lang)}
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 relative ${
            billing === 'annual'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(i18n.annual, lang)}
          <Badge className="absolute -top-2.5 -right-12 text-[9px] px-1.5 py-0 bg-accent text-accent-foreground border-0 font-semibold">
            {t(i18n.saveLabel, lang)}
          </Badge>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {plans.map((plan, i) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-shadow duration-300 hover:shadow-lg animate-fade-up ${
                plan.highlighted
                  ? 'border-primary shadow-md ring-1 ring-primary/20'
                  : 'shadow-sm'
              }`}
              style={{ animationDelay: `${(i + 1) * 80}ms` }}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {t(i18n.popular, lang)}
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-0 left-0 bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-br-lg">
                  {t(i18n.currentPlan, lang)}
                </div>
              )}

              <CardHeader className="pt-8 pb-2">
                <h2 className="text-lg font-bold font-heading">{t(plan.name, lang)}</h2>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{t(plan.priceLabel, lang)}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-6">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        (feature as any).locked ? (
                          <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        )
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <span className={!feature.included ? 'text-muted-foreground/60 line-through' : ''}>
                        {t(feature.text, lang)}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full mt-2" variant="outline">
                    {t(i18n.currentPlan, lang)}
                  </Button>
                ) : plan.id !== 'free' ? (
                  <Button
                    className="w-full mt-2 gap-2"
                    onClick={handleUpgrade}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t(i18n.contact, lang)}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
