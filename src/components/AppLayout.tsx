import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/lib/i18n';
import {
  LayoutDashboard, Mic, PenTool, BookOpen, Headphones,
  ClipboardList, BarChart3, CreditCard, LogOut, BookOpenCheck, Globe,
  ArrowLeft, LayoutGrid, Timer, User, Sun, Moon, Settings,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const sidebarItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Speaking', path: '/practice/speaking', icon: Mic },
  { title: 'Writing', path: '/practice/writing', icon: PenTool },
  { title: 'Reading', path: '/practice/reading', icon: BookOpen },
  { title: 'Listening', path: '/practice/listening', icon: Headphones },
  { title: 'Mock Test', path: '/mock-test', icon: ClipboardList },
  { title: 'Progress', path: '/progress', icon: BarChart3 },
  { title: 'Pricing', path: '/pricing', icon: CreditCard },
  { title: 'Profile', path: '/profile', icon: Settings },
];

const bottomTabs = [
  { title: 'Home', path: '/', icon: LayoutDashboard },
  { title: 'Practice', path: '/practice/speaking', icon: LayoutGrid, matchPaths: ['/practice/speaking', '/practice/writing', '/practice/reading', '/practice/listening'] },
  { title: 'Mock', path: '/mock-test', icon: Timer },
  { title: 'Progress', path: '/progress', icon: BarChart3 },
  { title: 'Profile', path: '/profile', icon: User },
];

function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center w-14 h-7 rounded-full bg-muted p-0.5 transition-colors btn-press"
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          'absolute w-6 h-6 rounded-full bg-card shadow-md flex items-center justify-center transition-transform duration-200',
          theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
        )}
      >
        {theme === 'light' ? (
          <Sun className="w-3.5 h-3.5 text-warning" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-primary" />
        )}
      </span>
    </button>
  );
}
function DesktopSidebar() {

  const { signOut } = useAuth();
  const { lang, toggle } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="hidden md:flex flex-col h-screen w-16 hover:w-56 transition-[width] duration-300 ease-out bg-sidebar border-r border-sidebar-border group/sidebar overflow-hidden shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <BookOpenCheck className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-heading font-bold text-sidebar-foreground text-lg whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
          PTE Sansar
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                {item.title}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-0.5 border-t border-sidebar-border">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Globe className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            {lang === 'en' ? 'नेपाली' : 'English'}
          </span>
        </button>
        <button
          onClick={() => { signOut(); navigate('/auth'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}

function MobileBottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab: typeof bottomTabs[0]) => {
    if (tab.matchPaths) return tab.matchPaths.some(p => location.pathname.startsWith(p));
    return tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-14 px-1">
        {bottomTabs.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary" />
              )}
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for notched devices */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggle: toggleTheme } = useTheme();
  const showBack = location.pathname !== '/';

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden h-12 flex items-center border-b bg-card px-3 gap-2 shrink-0">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 btn-press">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <BookOpenCheck className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-sm">PTE Sansar</span>
          </div>
        </header>

        {/* Desktop header with theme toggle */}
        <header className="hidden md:flex h-12 items-center justify-end border-b bg-card px-4 shrink-0">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="animate-fade-up">
            {children}
          </div>
          {/* Footer */}
          <footer className="border-t mt-12 py-6 px-4 text-center text-xs text-muted-foreground space-y-1">
            <p>© {new Date().getFullYear()} Udan Technologies Pvt. Ltd.</p>
            <div className="flex items-center justify-center gap-3">
              <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>
              <span>·</span>
              <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }} className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </footer>
        </main>
      </div>
      <MobileBottomBar />
    </div>
  );
}
