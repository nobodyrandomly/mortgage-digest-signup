import { render, screen } from '@testing-library/react';
import App from './App';

test('renders mortgage digest signup form', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /Mortgage Digest/i, level: 1 });
  expect(headingElement).toBeInTheDocument();
});
