import React from "react";
import { CheckCircle2 } from "lucide-react";

interface IntegrationCardProps {
    title: string;
    description: React.ReactNode;
    icon: React.ReactNode;
    linked: boolean;
    linkedText: React.ReactNode;
    actionHref: string;
    actionText: string;
    classes: {
        iconBg: string;
        iconText: string;
        buttonBg: string;
        buttonHover: string;
        linkedIcon: string;
        linkedBg: string;
        linkedBorder: string;
    };
    additionalContainerClass?: string;
}

export function IntegrationCard({
    title,
    description,
    icon,
    linked,
    linkedText,
    actionHref,
    actionText,
    classes,
    additionalContainerClass = "",
}: IntegrationCardProps) {
    return (
        <div className={`pt-6 border-t border-border/50 ${additionalContainerClass}`}>
            <div className="flex items-start gap-3 mb-4">
                <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${classes.iconBg}`}
                >
                    <div className={classes.iconText}>{icon}</div>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {description}
                    </p>
                </div>
            </div>

            {linked ? (
                <div
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${classes.linkedBg} ${classes.linkedBorder}`}
                >
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${classes.linkedIcon}`} />
                    <span className="text-xs text-foreground">{linkedText}</span>
                </div>
            ) : (
                <a
                    href={actionHref}
                    className={`flex items-center justify-center gap-2 h-10 px-4 rounded-md text-white text-sm font-medium transition-colors w-full ${classes.buttonBg} ${classes.buttonHover}`}
                >
                    {actionText}
                </a>
            )}
        </div>
    );
}
