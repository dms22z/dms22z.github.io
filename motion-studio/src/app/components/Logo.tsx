import { Group, Text } from "@mantine/core";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Group gap={8} wrap="nowrap" style={{ cursor: onClick ? "pointer" : undefined }} onClick={onClick} role={onClick ? "button" : undefined} aria-label={onClick ? "Retour à l'accueil" : undefined}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0A0A0A" />
        <path d="M9 22V10l7 7 7-7v12" stroke="#22C55E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Text fw={800} size="lg" style={{ letterSpacing: "-0.02em" }}>
        Motion Studio
      </Text>
    </Group>
  );
}
