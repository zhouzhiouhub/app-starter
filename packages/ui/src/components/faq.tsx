import type { ReactNode } from "react";
import { storefrontShellClassName } from "../storefront-shell.js";

export function Faq(props: {
  items?: Array<{ question: string; answer: string }>;
}): ReactNode {
  return (
    <section className={`${storefrontShellClassName} py-16`}>
      {(props.items ?? []).map((item) => (
        <details className="border-b border-gray-200 py-4" key={item.question}>
          <summary className="cursor-pointer font-semibold text-gray-950">
            {item.question}
          </summary>
          <p className="pt-3 leading-7 text-gray-600">{item.answer}</p>
        </details>
      ))}
    </section>
  );
}
