"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Keyboard, 
  Mic, 
  User, 
  Palette, 
  MessageCircle, 
  Sun, 
  Moon,
  Mail,
  Settings,
  Search,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { ContactModal } from "@/components/contact-modal";
import { LanguagePanel } from "@/components/language-panel";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { id: "home", icon: Home, label: "Home", path: "/" },
  { id: "keyboard", icon: Keyboard, label: "Keyboard", path: "/concierge?mode=text" },
  { id: "theme", icon: Sun, label: "Theme", action: "toggle-theme" },
  { id: "language", icon: Palette, label: "Language", action: "toggle-language" },
  { id: "voice", icon: Mic, label: "Voice", path: "/concierge?mode=voice" },
  { id: "contact", icon: Mail, label: "Contact", action: "toggle-contact" },
  { id: "user", icon: User, label: "User", path: "/account" },
  { id: "admin", icon: Settings, label: "Admin", path: "/admin" },
  { id: "search", icon: Search, label: "Search", action: "toggle-search" },
  { id: "help", icon: HelpCircle, label: "Help", action: "toggle-help" },
];

export function CommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Close command center when route changes
    setIsOpen(false);
  }, [location]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open command center with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
    
    // Close with Escape
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
    
    // Quick navigation shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'c':
          e.preventDefault();
          navigate('/concierge');
          break;
        case 'a':
          e.preventDefault();
          navigate('/account');
          break;
        case 'm':
          e.preventDefault();
          if (isClient) {
            setTheme(theme === "dark" ? "light" : "dark");
          }
          break;
      }
    }
  }, [isOpen, navigate, theme, setTheme, isClient]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Show command center on all routes except fullscreen
  const isFullScreenRoute = location.pathname === "/fullscreen";
  
  if (isFullScreenRoute) {
    return null;
  }

  const handleItemClick = (item: typeof MENU_ITEMS[number]) => {
    if (item.path) {
      navigate(item.path);
      setIsOpen(false);
    } else if (item.action === "toggle-theme" && isClient) {
      setTheme(theme === "dark" ? "light" : "dark");
      setIsOpen(false);
    } else if (item.action === "toggle-language") {
      setShowLanguagePanel(true);
      setIsOpen(false);
    } else if (item.action === "toggle-contact") {
      setShowContactModal(true);
      setIsOpen(false);
    } else if (item.action === "toggle-search") {
      setShowSearch(true);
      setIsOpen(false);
    } else if (item.action === "toggle-help") {
      setShowHelp(true);
      setIsOpen(false);
    }
  };

  const isActiveRoute = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path.replace(/\?.*$/, ""));
  };

  const getThemeIcon = () => {
    if (!isClient) return Sun;
    return theme === "dark" ? Moon : Sun;
  };

  const itemsWithDynamicIcons = MENU_ITEMS.map(item => {
    if (item.id === "theme") {
      return { ...item, icon: getThemeIcon() };
    }
    return item;
  });

  return (
    <>
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <Button
          size="icon"
          className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open command center"
          aria-expanded={isOpen}
          aria-controls="command-center-menu"
        >
          <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-background"></div>
          </div>
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              
              <motion.div
                id="command-center-menu"
                className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                role="menu"
                aria-label="Command center menu"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xl rounded-2xl shadow-xl w-80 h-40" />
                  
                  <div className="relative flex flex-wrap justify-center gap-4 p-6 w-80">
                    {itemsWithDynamicIcons.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = item.path ? isActiveRoute(item.path) : false;
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent transition-all",
                              isActive && "bg-primary text-primary-foreground"
                            )}
                            onClick={() => handleItemClick(item)}
                            aria-label={item.label}
                          >
                            <Icon className="w-5 h-5" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <ContactModal 
        open={showContactModal} 
        onOpenChange={setShowContactModal} 
      />
      
      <LanguagePanel 
        open={showLanguagePanel} 
        onOpenChange={setShowLanguagePanel} 
      />
      
      {/* Search and Help modals would be implemented here */}
    </>
  );
}