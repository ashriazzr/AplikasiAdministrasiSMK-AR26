import React from "react";

interface LayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * LayoutWrapper - Standar wrapper untuk semua halaman
 * Provides: padding, max-width, spacing konsisten di seluruh aplikasi
 */
export function LayoutWrapper({ children, title, subtitle }: LayoutWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-6 py-6 max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
          </div>
        )}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}

/**
 * PageSection - Section dengan spacing standar
 */
export function PageSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`space-y-4 ${className}`}>{children}</section>;
}

/**
 * PageHeader - Header konsisten untuk setiap halaman
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex gap-2 shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Typography presets
 */
export const Typography = {
  H1: "text-3xl font-bold text-gray-900",
  H2: "text-2xl font-bold text-gray-900",
  H3: "text-lg font-semibold text-gray-900",
  H4: "text-base font-semibold text-gray-900",
  Body: "text-sm text-gray-700",
  BodySmall: "text-xs text-gray-600",
  Label: "text-sm font-medium text-gray-700",
  LabelSmall: "text-xs font-medium text-gray-600",
};

/**
 * Spacing presets
 */
export const Spacing = {
  PageVertical: "space-y-6",    // Antar section besar
  SectionVertical: "space-y-4", // Antar item dalam section
  CardVertical: "space-y-3",    // Antar elemen dalam card
  Compact: "space-y-2",         // Elemen yang padat
};
