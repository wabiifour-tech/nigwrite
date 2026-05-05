/**
 * NigWrite - Navigation Bar Component
 * Created by: Wabi The Tech Nurse
 *
 * Top navigation with Nigeria-themed branding (green-white-green).
 * Logo uses a PenTool (writing) icon with Nigeria flag colors.
 */

'use client';

import { PenTool, Upload, LayoutDashboard, FileText, Info } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Upload },
  { id: 'scan', label: 'Scan Document', icon: FileText },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'about', label: 'About', icon: Info },
];

export function Navbar({ currentView, onViewChange }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo — Nigeria green + white + green writing icon */}
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden">
              {/* Nigeria flag background: green-white-green */}
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
              <PenTool className="h-4 w-4 text-[#008751] relative z-10" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Nig<span className="text-[#008751]">Write</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#008751] text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Creator Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <span>by</span>
            <span className="font-semibold text-foreground">Wabi The Tech Nurse</span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="flex overflow-x-auto px-2 py-1 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#008751] text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
