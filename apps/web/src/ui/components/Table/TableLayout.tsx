import type { ReactNode } from "react";

type TableLayoutProps = {
  children: ReactNode;
};

export function TableLayout({ children }: TableLayoutProps) {
  return <section className="table-layout">{children}</section>;
}
