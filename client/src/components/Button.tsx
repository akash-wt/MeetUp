import type { ReactNode } from "react";

interface ButtonProps {
    children: ReactNode;
    className?: string;
    appName?: string;
    variant?: string;
    onClick?: () => void;
}

export const Button = ({ children, className, onClick }: ButtonProps) => {
    return (
        <button
            className={className}
            onClick={onClick}
        >
            {children}
        </button>
    );
};
