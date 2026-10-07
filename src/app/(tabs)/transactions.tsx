import { ComingSoon } from '@/components/coming-soon';
import { it } from '@/i18n/it';

export default function Screen() {
  return <ComingSoon title={it.tabs.transactions} body={it.placeholder.transactions} />;
}
