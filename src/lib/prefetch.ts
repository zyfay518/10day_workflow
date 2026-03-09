const loaded = new Set<string>();

function once(key: string, loader: () => Promise<unknown>) {
  if (loaded.has(key)) return;
  loaded.add(key);
  loader().catch(() => loaded.delete(key));
}

export function prefetchRoute(path: string) {
  switch (path) {
    case '/':
      once('home', () => import('../pages/Home'));
      break;
    case '/goals':
      once('goals', () => import('../pages/Goals'));
      break;
    case '/history':
      once('history', () => import('../pages/History'));
      break;
    case '/report':
      once('report', () => import('../pages/Report'));
      break;
    case '/knowledge':
      once('knowledge', () => import('../pages/Knowledge'));
      break;
    case '/profile':
      once('profile', () => import('../pages/Profile'));
      break;
    case '/record':
      once('record', () => import('../pages/Record'));
      break;
    case '/expense':
      once('expense', () => import('../pages/Expense'));
      break;
    default:
      break;
  }
}

export function warmCommonRoutes() {
  const run = () => {
    prefetchRoute('/report');
    prefetchRoute('/history');
    prefetchRoute('/knowledge');
  };

  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(run, { timeout: 1200 });
  } else {
    setTimeout(run, 600);
  }
}
