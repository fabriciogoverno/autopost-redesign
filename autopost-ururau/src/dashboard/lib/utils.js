import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) { return twMerge(clsx(inputs)); }

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatNumber(num) { return new Intl.NumberFormat('pt-BR').format(num); }

export function truncate(str, len = 60) {
  if (!str || str.length <= len) return str;
  return str.substring(0, len - 3) + '...';
}

export function getStatusColor(status) {
  const colors = {
    pending:     'text-warning bg-warning/10 border border-warning/20',
    published:   'text-success bg-success/10 border border-success/20',
    failed:      'text-destructive bg-destructive/10 border border-destructive/20',
    rolled_back: 'text-purple-700 bg-purple-50 border border-purple-200',
    scheduled:   'text-primary bg-primary/10 border border-primary/20',
    generating:  'text-orange-700 bg-orange-50 border border-orange-200',
    ignored:     'text-muted-foreground bg-muted border border-border',
  };
  return colors[status] || colors.pending;
}

export function getPlatformIcon(platform) {
  const icons = { instagram: '📸', facebook: '👥', twitter: '🐦', linkedin: '💼', threads: '🧵', tiktok: '🎵', whatsapp: '💬' };
  return icons[platform] || '📱';
}

export function getPlatformColor(platform) {
  const colors = { instagram: '#E1306C', facebook: '#1877F2', twitter: '#1DA1F2', linkedin: '#0A66C2', threads: '#000000', tiktok: '#000000', whatsapp: '#25D366' };
  return colors[platform] || '#6B7280';
}
