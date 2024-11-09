'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { FC } from 'react';
import { Button } from '../components/ui/button';
import {
  Dropdown
} from '../components/ui/dropdown-menu';

export const ModeToggle: FC = () => {
  const { setTheme } = useTheme();

  const themes = [
    { onClick: () => setTheme('light'), children: 'Light' },
    { onClick: () => setTheme('dark'), children: 'Dark' },
    { onClick: () => setTheme('system'), children: 'System' },
  ];

  return (
    <Dropdown.Menu>
      <Dropdown.Trigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 text-foreground"
        >
          <SunIcon className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {themes.map(({ onClick, children }) => (
          <Dropdown.Item key={children} onClick={onClick}>
            {children}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Menu>
  );
};
