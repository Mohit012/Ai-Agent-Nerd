'use client';

import { Loader2 } from 'lucide-react';

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex gap-3">
          <div className="flex-1 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex h-screen">
      <SidebarSkeleton />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <ChatSkeleton />
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
