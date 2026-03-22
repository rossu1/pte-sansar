import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, MessageCircle, Shield, Star } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { toast } from 'sonner';

const i18n = {
  title: { en: 'Choose Your Plan', np: 'आफ्नो योजना छान्नुहोस्' },
  subtitle: { en: 'Invest in your PTE success', np: 'तपाईंको PTE सफलतामा लगानी गर्नुहोस्' },
  currentPlan: { en: 'Current Plan', np: 'हालको योजना' },
  popular: { en: 'Most Popular', np: 'सबैभन्दा लोकप्रिय' },
  perMonth: { en: '/month', np: '/महिना' },
  upgrade: { en: 'Upgrade', np: 'अपग्रेड गर्नुहोस्' },
  contact: { en: 'Contact to Upgrade', np: 'अपग्रेड गर्न सम्पर्क गर्नुहोस्' },
};

interface PlanFeature {
  text: { en: string; np: string };
}

interface Plan {
  id: string;
  name: { en: string; np: string };
  price: string;
  priceLabel: { en: string; np: string };
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: { icon: React.ReactNode; text: { en: string; np: string } }[];
}

const plans: Plan[] = [
  {
    id: 'free',
    name: { en: 'Free', np: 'निःशुल्क' },
    price: 'NPR 0',
    priceLabel: { en: 'Forever free', np: 'सधैं निःशुल्क' },
    features: [
      { text: { en: '10 questions per day', np: 'दैनिक १० प्रश्न' } },
      { text: { en: '1 mock test per month', np: 'मासिक १ मक टेस्ट' } },
      { text: { en: 'English feedback only', np: 'अंग्रेजी प्रतिक्रिया मात्र' } },
      { text: { en: 'Basic progress tracking', np: 'आधारभूत प्रगति ट्र्याकिङ' } },
    ],
  },
  {
    id: 'pro',
    name: { en: 'Pro', np: 'प्रो' },
    price: 'NPR 999',
    priceLabel: { en: '/month', np: '/महिना' },
    highlighted: true,
    features: [
      { text: { en: 'Unlimited practice questions', np: 'असीमित अभ्यास प्रश्नहरू' } },
      { text: { en: 'AI speaking scorer', np: 'AI बोल्ने स्कोरर' } },
      { text: { en: 'Nepali + English feedback', np: 'नेपाली + अंग्रेजी प्रतिक्रिया' } },
      { text: { en: 'Personalised study plan', np: 'व्यक्तिगत अध्ययन योजना' } },
      { text: { en: 'Full progress tracker', np: 'पूर्ण प्रगति ट्र्याकर' } },
    ],
  },
  {
    id: 'intensive',
    name: { en: 'Intensive', np: 'इन्टेन्सिभ' },
    price: 'NPR 2,499',
    priceLabel: { en: '/month', np: '/महिना' },
    features: [
      { text: { en: 'Everything in Pro', np: 'प्रो मा सबै कुरा' } },
      { text: { en: 'Unlimited mock tests', np: 'असीमित मक टेस्ट' } },
      { text: { en: 'Priority AI scoring', np: 'प्राथमिकता AI स्कोरिङ' } },
    ],
    badge: [
      { icon: <MessageCircle className="w-3.5 h-3.5" />, text: { en: 'WhatsApp Support', np: 'WhatsApp सहयोग' } },
      { icon: <Shield className="w-3.5 h-3.5" />, text: { en: 'Score Guarantee', np: 'स्कोर ग्यारेन्टी' } },
    ],
  },
];

const WHATSAPP_LINK = 'https://wa.me/610420758831?text=Hi%2C%20I%20want%20to%20upgrade%20my%20PTE-Sathi%20plan';

export default function PricingPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [currentPlan, setCurrentPlan] = useState<string>('free');

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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ lineHeight: '1.15' }}>
          {t(i18n.title, lang)}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t(i18n.subtitle, lang)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {plans.map((plan, i) => {
          const isCurrent = currentPlan === plan.id;
          const isHighlighted = plan.highlighted;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-shadow duration-300 hover:shadow-lg animate-fade-up ${
                isHighlighted
                  ? 'border-primary shadow-md ring-1 ring-primary/20'
                  : 'shadow-sm'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {isHighlighted && (
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
                <h2 className="text-lg font-bold">{t(plan.name, lang)}</h2>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                  {plan.id !== 'free' && (
                    <span className="text-sm text-muted-foreground">{t(plan.priceLabel, lang)}</span>
                  )}
                </div>
                {plan.id === 'free' && (
                  <span className="text-xs text-muted-foreground">{t(plan.priceLabel, lang)}</span>
                )}
              </CardHeader>

              <CardContent className="space-y-4 pb-6">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{t(feature.text, lang)}</span>
                    </li>
                  ))}
                </ul>

                {plan.badge && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {plan.badge.map((b, bi) => (
                      <Badge
                        key={bi}
                        variant="secondary"
                        className="gap-1 text-xs font-medium"
                      >
                        {b.icon}
                        {t(b.text, lang)}
                      </Badge>
                    ))}
                  </div>
                )}

                {isCurrent ? (
                  <Button disabled className="w-full mt-2" variant="outline">
                    {t(i18n.currentPlan, lang)}
                  </Button>
                ) : plan.id === 'free' ? null : (
                  <Button
                    className="w-full mt-2"
                    variant={isHighlighted ? 'default' : 'outline'}
                    onClick={handleUpgrade}
                  >
                    {t(i18n.contact, lang)}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
