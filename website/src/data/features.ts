export type Feature = {
  id: string;
  title: string;
  body: string;
  icon: 'flash' | 'cube' | 'chart' | 'offline' | 'stores' | 'invoice' | 'printer';
};

export const FEATURES: Feature[] = [
  {
    id: 'billing',
    title: 'Lightning Fast Billing',
    body: 'Create professional bills in just 2–3 taps. Built for busy counters.',
    icon: 'flash',
  },
  {
    id: 'inventory',
    title: 'Smart Inventory',
    body: 'Track stock, get low-stock alerts, and manage products effortlessly.',
    icon: 'cube',
  },
  {
    id: 'insights',
    title: 'Business Insights',
    body: 'Track sales, spot trends, and make better decisions for your store.',
    icon: 'chart',
  },
  {
    id: 'offline',
    title: 'Offline POS',
    body: 'Keep selling without network. Sync when you are back online.',
    icon: 'offline',
  },
  {
    id: 'stores',
    title: 'Multi-store Ready',
    body: 'One subscription for your organization — switch stores in the app.',
    icon: 'stores',
  },
  {
    id: 'invoices',
    title: 'Invoices & Analytics',
    body: 'Unlock deeper reporting and invoice generation on Growth and Pro.',
    icon: 'invoice',
  },
  {
    id: 'printer',
    title: 'Printer Connection',
    body: 'Connect your receipt printer and print bills right from the counter.',
    icon: 'printer',
  },
];
