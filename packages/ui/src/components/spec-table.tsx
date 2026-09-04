import type { ReactNode } from "react";
import { storefrontShellClassName } from "../storefront-shell.js";

export function SpecTable(props: {
  rows?: Array<{ label: string; value: string }>;
}): ReactNode {
  return (
    <section className={`${storefrontShellClassName} py-16`}>
      <dl className="divide-y divide-gray-200 border-y border-gray-200">
        {(props.rows ?? []).map((row) => (
          <div className="grid gap-2 py-4 md:grid-cols-3" key={row.label}>
            <dt className="font-medium text-gray-950">{row.label}</dt>
            <dd className="md:col-span-2 text-gray-600">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
