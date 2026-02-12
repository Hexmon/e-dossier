"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { resolveToneClasses, type ColorTone } from "@/lib/theme-color";

// Core type definitions
export interface CardIcon {
  component: React.ComponentType<{ className?: string }>;
  className?: string;
  background?: string | ColorTone;
  size?: 'sm' | 'md' | 'lg';
}

export interface CardBadge {
    text: string | number;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
}

export interface CardAction {
    key: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'link';
    size?: 'sm' | 'default' | 'lg';
    handler?: () => void;
    href?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export interface CardHeader {
    title: string;
    subtitle?: string;
    icon?: CardIcon;
    badge?: CardBadge;
    actions?: CardAction[];
    className?: string;
    colorStripe?: string; // For platoon-style cards
}

export interface CardBody {
    description?: string;
    content?: React.ReactNode;
    image?: {
        src: string;
        alt: string;
        className?: string;
    };
    metadata?: Array<{
        key: string;
        label: string;
        value: string | React.ReactNode;
        icon?: React.ComponentType<{ className?: string }>;
    }>;
    className?: string;
}

export interface CardFooter {
    actions?: CardAction[];
    metadata?: Array<{
        key: string;
        label?: string;
        value: string | React.ReactNode;
        icon?: React.ComponentType<{ className?: string }>;
    }>;
    className?: string;
}

export interface UniversalCardConfig {
    header?: CardHeader;
    body?: CardBody;
    footer?: CardFooter;
    layout?: 'default' | 'compact' | 'spacious' | 'list' | 'dashboard';
    styling?: {
        variant?: 'default' | 'outlined' | 'elevated' | 'flat';
        size?: 'sm' | 'md' | 'lg';
        hover?: boolean | 'shadow' | 'lift' | 'glow';
        clickable?: boolean;
        className?: string;
    };
    behavior?: {
        loading?: boolean;
        disabled?: boolean;
        onClick?: () => void;
        href?: string;
    };
}

export interface UniversalCardProps {
    config: UniversalCardConfig;
    children?: React.ReactNode;
    className?: string;
}

export function CardLayout({ config, children, className }: UniversalCardProps) {
    const {
        header,
        body,
        footer,
        layout = 'default',
        styling = {},
        behavior = {},
    } = config;

    const {
        variant = 'default',
        size = 'md',
        hover = false,
        clickable = false,
    } = styling;

    // Generate card classes based on configuration
    const getCardClasses = () => {
        const baseClasses = ['transition-all', 'duration-200'];

        // Layout-specific classes
        switch (layout) {
            case 'compact':
                baseClasses.push('p-3');
                break;
            case 'spacious':
                baseClasses.push('p-8');
                break;
            case 'list':
                baseClasses.push('flex', 'flex-row', 'items-center', 'p-4');
                break;
            case 'dashboard':
                baseClasses.push('group', 'cursor-pointer', 'rounded-xl', 'shadow-lg');
                break;
        }

        // Variant-specific classes
        switch (variant) {
            case 'outlined':
                baseClasses.push('border-2', 'border-border');
                break;
            case 'elevated':
                baseClasses.push('shadow-lg', 'border-0');
                break;
            case 'flat':
                baseClasses.push('shadow-none', 'border-0', 'bg-transparent');
                break;
        }

        // Size-specific classes
        switch (size) {
            case 'sm':
                baseClasses.push('text-sm');
                break;
            case 'lg':
                baseClasses.push('text-lg');
                break;
        }

        // Hover effects
        if (hover) {
            switch (hover) {
                case 'shadow':
                    baseClasses.push('hover:shadow-lg');
                    break;
                case 'lift':
                    baseClasses.push('hover:shadow-lg', 'hover:-translate-y-1');
                    break;
                case 'glow':
                    baseClasses.push('hover:shadow-command');
                    break;
                case true:
                    baseClasses.push('hover:shadow-lg', 'hover:border-primary/20');
                    break;
            }
        }

        // Clickable state
        if (clickable || behavior.onClick || behavior.href) {
            baseClasses.push('cursor-pointer');
        }

        // Loading/disabled states
        if (behavior.loading) {
            baseClasses.push('opacity-70', 'pointer-events-none');
        }
        if (behavior.disabled) {
            baseClasses.push('opacity-50', 'pointer-events-none');
        }

        return baseClasses.join(' ');
    };

    // Render icon with background
    const renderIcon = (iconConfig: CardIcon) => {
        const { component: IconComponent, className: iconClassName, background, size: iconSize = 'md' } = iconConfig;

        const sizeClasses = {
            sm: 'w-8 h-8',
            md: 'w-10 h-10',
            lg: 'w-12 h-12',
        };

        const iconSizes = {
            sm: 'h-4 w-4',
            md: 'h-5 w-5',
            lg: 'h-6 w-6',
        };

        if (background) {
            const backgroundClass = isColorTone(background)
                ? resolveToneClasses(background, "icon")
                : background;
            return (
                <div className={cn(
                    'flex items-center justify-center rounded-lg',
                    sizeClasses[iconSize],
                    backgroundClass,
                    iconClassName
                )}>
                    <IconComponent className={iconSizes[iconSize]} />
                </div>
            );
        }

        return <IconComponent className={cn(iconSizes[iconSize], iconClassName)} />;
    };

    // Render action button
    const renderAction = (action: CardAction) => {
        const ButtonContent = (
            <Button
                key={action.key}
                variant={action.variant || 'outline'}
                size={action.size || 'sm'}
                onClick={action.handler}
                disabled={action.disabled || action.loading}
                className={action.className}
            >
                {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                {action.label}
            </Button>
        );

        if (action.href) {
            return (
                <Link key={action.key} href={action.href}>
                    {ButtonContent}
                </Link>
            );
        }

        return ButtonContent;
    };

    // Render metadata item
    const renderMetadata = (item: { key: string; label?: string; value: string | React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
        <div key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label && <span className="font-medium">{item.label}:</span>}
            <span>{item.value}</span>
        </div>
    );

    // Handle card click
    const handleCardClick = () => {
        if (behavior.onClick) {
            behavior.onClick();
        }
    };

    // Wrap with link if href is provided, otherwise use div
    const cardContent = (
        <Card className={cn(getCardClasses(), styling.className, className)}>
            {/* Color stripe for platoon-style cards */}
            {header?.colorStripe && (
                <div className={cn('w-full h-3 rounded-t-lg mb-4', header.colorStripe)} />
            )}

            {/* Header */}
            {header && (
                <CardHeader className={cn('pb-3', header.className)}>
                    {layout === 'list' ? (
                        // List layout header
                        <div className="flex items-center gap-3 flex-1">
                            {header.icon && renderIcon(header.icon)}
                            <div className="flex-1">
                                <CardTitle className="text-lg font-semibold">
                                    {header.title}
                                </CardTitle>
                                {header.subtitle && (
                                    <p className="text-sm text-muted-foreground">{header.subtitle}</p>
                                )}
                            </div>
                            {header.badge && (
                                <Badge variant={header.badge.variant} className={header.badge.className}>
                                    {header.badge.text}
                                </Badge>
                            )}
                            {header.actions && (
                                <div className="flex gap-2">
                                    {header.actions.map(renderAction)}
                                </div>
                            )}
                        </div>
                    ) : (
                        // Default layout header
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {header.icon && renderIcon(header.icon)}
                                <div className="flex-1">
                                    <CardTitle className={cn(
                                        'font-semibold',
                                        layout === 'dashboard' ? 'text-lg group-hover:text-primary transition-colors' : 'text-lg'
                                    )}>
                                        {header.title}
                                    </CardTitle>
                                    {header.subtitle && (
                                        <p className="text-sm text-muted-foreground">{header.subtitle}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {header.badge && (
                                    <Badge variant={header.badge.variant} className={header.badge.className}>
                                        {header.badge.text}
                                    </Badge>
                                )}
                                {header.actions && header.actions.map(renderAction)}
                            </div>
                        </div>
                    )}
                </CardHeader>
            )}

            {/* Body */}
            {(body || children) && (
                <CardContent className={cn(body?.className)}>
                    {body?.image && (
                        <img
                            src={body.image.src}
                            alt={body.image.alt}
                            className={cn('w-full rounded-md mb-4', body.image.className)}
                        />
                    )}

                    {body?.description && (
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {body.description}
                        </p>
                    )}

                    {body?.metadata && (
                        <div className="space-y-2 mb-4">
                            {body.metadata.map(renderMetadata)}
                        </div>
                    )}

                    {body?.content}
                    {children}
                </CardContent>
            )}

            {/* Footer */}
            {footer && (
                <CardFooter className={cn('pt-4', footer.className)}>
                    {footer.actions && (
                        <div className="flex gap-2 w-full">
                            {footer.actions.map(renderAction)}
                        </div>
                    )}

                    {footer.metadata && (
                        <div className="flex items-center gap-4 w-full">
                            {footer.metadata.map(renderMetadata)}
                        </div>
                    )}
                </CardFooter>
            )}
        </Card>
    );

    // Return wrapped content based on whether href is provided
    if (behavior.href) {
        return <Link href={behavior.href}>{cardContent}</Link>;
    }

    return <div onClick={handleCardClick}>{cardContent}</div>;
}

// Helper functions for common card configurations
export function createDashboardCard(
    title: string,
    description: string,
    icon: React.ComponentType<{ className?: string }>,
    color: string,
    href?: string,
    onClick?: () => void
): UniversalCardConfig {
    return {
        header: {
            title,
            icon: {
                component: icon,
                background: color,
                size: 'md',
            },
        },
        body: {
            description,
        },
        layout: 'dashboard',
        styling: {
            hover: 'glow',
        },
        behavior: {
            href,
            onClick,
        },
    };
}

export function createActionCard(
    title: string,
    subtitle: string,
    description: string,
    actions: CardAction[],
    metadata?: Array<{ key: string; label: string; value: string; icon?: React.ComponentType<{ className?: string }> }>
): UniversalCardConfig {
    return {
        header: {
            title,
            subtitle,
        },
        body: {
            description,
            metadata,
        },
        footer: {
            actions,
        },
        styling: {
            hover: true,
            variant: 'outlined',
        },
    };
}

export function createListCard(
    title: string,
    subtitle: string,
    badge: CardBadge,
    actions: CardAction[],
    onClick?: () => void
): UniversalCardConfig {
    return {
        header: {
            title,
            subtitle,
            badge,
            actions,
        },
        layout: 'list',
        styling: {
            hover: 'shadow',
        },
        behavior: {
            onClick,
        },
    };
}
    const isColorTone = (value: unknown): value is ColorTone =>
        typeof value === "string" &&
        ["primary", "secondary", "muted", "success", "warning", "info", "destructive"].includes(value);
