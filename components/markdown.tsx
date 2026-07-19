"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render de markdown con los estilos del design system (clase `.markdown` en
 * globals.css). GFM activado (tablas, autolinks, tachado). Los enlaces abren
 * en una pestaña nueva. Se usa en el visor de documentos de Cerebro.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a(props) {
            const { node, ...rest } = props;
            void node; // se extrae para que no llegue al DOM
            return <a {...rest} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
