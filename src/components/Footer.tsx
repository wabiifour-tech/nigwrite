/**
 * NigWrite - Footer Component
 * Created by: Wabi The Tech Nurse
 *
 * Application footer with Nigeria-themed branding and credits.
 * Must appear on every page of the application.
 */

'use client';

import { PenTool, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-6 h-6 rounded overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-[30%] bg-[#008751]" />
                  <div className="w-[40%] bg-white" />
                  <div className="w-[30%] bg-[#008751]" />
                </div>
                <PenTool className="h-3 w-3 text-[#008751] relative z-10" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm">
                Nig<span className="text-[#008751]">Write</span>
              </span>
            </div>
            <span className="text-muted-foreground text-xs">|</span>
            <span className="text-muted-foreground text-xs">
              Academic Integrity & Writing Assistant
            </span>
          </div>

          {/* Creator Credit */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008751]/10 border border-[#008751]/20">
              <span className="font-semibold text-[#008751] text-xs">
                Wabi The Tech Nurse
              </span>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>&copy; {currentYear} NigWrite. Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>by Wabi The Tech Nurse</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
