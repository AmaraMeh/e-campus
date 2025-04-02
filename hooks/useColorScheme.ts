
// hooks/useColorScheme.tsx
import { useTheme } from '../app/contexts/ThemeContext';

export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}