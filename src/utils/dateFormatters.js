import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

export function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('nb-NO', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
}

export function formatDateShort(dateString) {
  if (!dateString) return '-';
  return format(new Date(dateString), 'd. MMM yyyy', { locale: nb });
}

export function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + 
         ' kl. ' + date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: nb });
}
