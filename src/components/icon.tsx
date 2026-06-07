import type { CSSProperties } from "react";
import * as Lucide from "lucide-react";

type LucideComponent = React.ComponentType<{ size?: number; strokeWidth?: number }>;

const registry = Lucide as unknown as Record<string, LucideComponent>;

export interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renderiza un ícono de lucide-react por nombre (PascalCase),
 * manteniendo la API `<Icon name="House" size={19} />` del diseño.
 */
export function Icon({ name, size = 18, sw = 2, className = "", style }: IconProps) {
  const Cmp = registry[name];
  if (!Cmp) return <span className={"ic " + className} style={style} />;
  return (
    <span className={"ic " + className} style={style}>
      <Cmp size={size} strokeWidth={sw} />
    </span>
  );
}
