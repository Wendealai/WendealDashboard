import { routes } from '../routes';

describe('sparkery dispatch routes', () => {
  it('includes /sparkery/dispatch and /sparkery/schedule routes', () => {
    const root = routes.find(route => route.path === '/');
    const children = root?.children || [];
    const paths = children.map(route => route.path);

    expect(paths).toContain('sparkery/dispatch');
    expect(paths).toContain('sparkery/schedule');
  });
});
