import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ComponentCatalog } from './ComponentCatalog';
import type { ComponentWithVariants } from './types';

afterEach(cleanup);

it('cycles ten cover colors in displayed order, including after filtering', () => {
  const components: ComponentWithVariants[] = Array.from({ length: 21 }, (_, index) => ({
    key: `item-${index}`, name: `${index % 2 ? 'Odd' : 'Even'} exploration ${index}`,
    path: `examples/${index}`, variants: [],
  }));
  const { container } = render(<ComponentCatalog components={components} onSelect={() => {}} view="grid" />);
  const colors = () => Array.from(container.querySelectorAll('.vh-exploration-cover'), node => node.className);
  const initial = colors();
  expect(new Set(initial.slice(0, 10)).size).toBe(10);
  expect(initial[10]).toBe(initial[0]);
  expect(initial[20]).toBe(initial[0]);
  expect(initial.every((color, index) => index === 0 || color !== initial[index - 1])).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search explorations' }), { target: { value: 'Odd' } });
  expect(colors()).toEqual(initial.slice(0, 10));
});
