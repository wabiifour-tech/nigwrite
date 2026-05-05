/**
 * NigWrite - Footer Component
 * Created by: Wabi The Tech Nurse
 *
 * Application footer displaying branding and credits.
 * Must appear on every page of the application.
 */

'use client';

import { Shield, Code2, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm">NigWrite</span>
            </div>
            <span className="text-muted-foreground text-xs">|</span>
            <span className="text-muted-foreground text-xs">
              Academic Integrity & Writing Assistant
            </span>
          </div>

          {/* Creator Credit */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-primary text-xs">
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

        {/* Technical Footer */}
        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Winnowing Algorithm
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
              AI Detection
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              LLM Correction
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            v1.0.0 — Microservices Architecture
          </span>
        </div>
      </div>
    </footer>
  );
}
