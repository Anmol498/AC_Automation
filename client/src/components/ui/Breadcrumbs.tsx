import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex mb-4 text-sm text-slate-500 dark:text-slate-400 font-medium" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <Link to="/dashboard" className="hover:text-[var(--color-primary)] transition-colors">
            <i className="fa-solid fa-house mr-2 text-xs" />
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <i className="fa-solid fa-chevron-right mx-2 text-[10px] text-slate-400" />
            {item.path ? (
              <Link to={item.path} className="hover:text-[var(--color-primary)] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 dark:text-slate-100">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
