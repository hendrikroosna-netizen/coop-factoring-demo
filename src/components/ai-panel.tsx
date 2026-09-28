import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AiPanel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('min-w-0 border-t-[3px] border-t-primary', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />{title}
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">Simuleeritud AI</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-[13px] min-w-0">{children}</CardContent>
    </Card>
  );
}
