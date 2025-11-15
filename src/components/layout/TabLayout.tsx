"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Core type definitions
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  link?: string;
  content?: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  badge?: string | number;
  className?: string;
}

export interface DropdownTabItem extends TabItem {
  dropdownItems?: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    link: string;
    color?: string;
  }>;
}

export interface TabGroup {
  id: string;
  label?: string;
  tabs: (TabItem | DropdownTabItem)[];
  defaultTab?: string;
  className?: string;
}

export interface UniversalTabConfig {
  groups: TabGroup[];
  layout?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline' | 'buttons';
  size?: 'sm' | 'default' | 'lg';
  sticky?: boolean | { top?: string; zIndex?: number };
  responsive?: {
    breakpoint?: 'sm' | 'md' | 'lg';
    collapsible?: boolean;
  };
  styling?: {
    tabsListClassName?: string;
    tabTriggerClassName?: string;
    tabContentClassName?: string;
    containerClassName?: string;
  };
  behavior?: {
    urlSync?: boolean;
    lazy?: boolean;
    keepMounted?: boolean;
  };
}

export interface UniversalTabPanelProps {
  config: UniversalTabConfig;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function UniversalTabPanel({
  config,
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
}: UniversalTabPanelProps) {
  const pathname = usePathname();
  const [internalValue, setInternalValue] = useState<string>('');
  
  const {
    groups,
    layout = 'horizontal',
    variant = 'default',
    size = 'default',
    sticky = false,
    responsive = {},
    styling = {},
    behavior = {},
  } = config;

  // Flatten all tabs for easier management
  const allTabs = useMemo(() => {
    return groups.flatMap(group => 
      group.tabs.filter(tab => !tab.hidden)
    );
  }, [groups]);

  // Determine active tab based on URL or controlled value
  const activeTab = useMemo(() => {
    if (controlledValue) return controlledValue;
    
    if (behavior.urlSync) {
      const currentPath = pathname.split("/").pop();
      const urlTab = allTabs.find(tab => tab.id === currentPath);
      if (urlTab) return urlTab.id;
    }
    
    return internalValue || defaultValue || allTabs[0]?.id || '';
  }, [controlledValue, behavior.urlSync, pathname, allTabs, internalValue, defaultValue]);

  // Handle tab change
  const handleTabChange = (newValue: string) => {
    if (!controlledValue) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  // Generate sticky styles
  const stickyStyles = useMemo(() => {
    if (!sticky) return {};
    
    const stickyConfig = typeof sticky === 'boolean' ? {} : sticky;
    return {
      position: 'sticky' as const,
      top: stickyConfig.top || '4rem',
      zIndex: stickyConfig.zIndex || 40,
    };
  }, [sticky]);

  // Variant-specific classes
  const getVariantClasses = () => {
    const baseClasses = {
      tabsList: 'grid w-full',
      tabTrigger: 'flex items-center gap-2 transition-colors',
    };

    switch (variant) {
      case 'pills':
        return {
          tabsList: `${baseClasses.tabsList} bg-muted rounded-lg p-1`,
          tabTrigger: `${baseClasses.tabTrigger} rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm`,
        };
      case 'underline':
        return {
          tabsList: `${baseClasses.tabsList} border-b border-border bg-transparent`,
          tabTrigger: `${baseClasses.tabTrigger} border-b-2 border-transparent data-[state=active]:border-primary rounded-none`,
        };
      case 'buttons':
        return {
          tabsList: `${baseClasses.tabsList} bg-transparent gap-2`,
          tabTrigger: `${baseClasses.tabTrigger} border border-gray-300 data-[state=inactive]:bg-blue-100 text-blue-700 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2`,
        };
      default:
        return baseClasses;
    }
  };

  const variantClasses = getVariantClasses();

  // Size-specific classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-2 py-1';
      case 'lg':
        return 'text-lg px-4 py-3';
      default:
        return 'px-3 py-2';
    }
  };

  // Render dropdown tab
  const renderDropdownTab = (tab: DropdownTabItem, groupIndex: number) => {
    if (!tab.dropdownItems?.length) {
      return renderRegularTab(tab, groupIndex);
    }

    return (
      <DropdownMenu key={tab.id}>
        <DropdownMenuTrigger asChild>
          <TabsTrigger
            value={tab.id}
            className={`${variantClasses.tabTrigger} ${getSizeClasses()} ${tab.className || ''} ${styling.tabTriggerClassName || ''}`}
            disabled={tab.disabled}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
            <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            {tab.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
          {tab.dropdownItems.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.link} className="flex items-center gap-2 w-full">
                {item.icon && <item.icon className={`h-4 w-4 ${item.color || ''}`} />}
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Render regular tab
  const renderRegularTab = (tab: TabItem, groupIndex: number) => {
    const TriggerContent = (
      <>
        {tab.icon && <tab.icon className="h-4 w-4" />}
        {tab.label}
        {tab.badge && (
          <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
            {tab.badge}
          </span>
        )}
      </>
    );

    const triggerClassName = `${variantClasses.tabTrigger} ${getSizeClasses()} ${tab.className || ''} ${styling.tabTriggerClassName || ''}`;

    if (tab.link) {
      return (
        <Link key={tab.id} href={tab.link} className="text-center hover:text-primary">
          <TabsTrigger
            value={tab.id}
            className={triggerClassName}
            disabled={tab.disabled}
          >
            {TriggerContent}
          </TabsTrigger>
        </Link>
      );
    }

    return (
      <TabsTrigger
        key={tab.id}
        value={tab.id}
        className={triggerClassName}
        disabled={tab.disabled}
      >
        {TriggerContent}
      </TabsTrigger>
    );
  };

  // Render tab group
  const renderTabGroup = (group: TabGroup, groupIndex: number) => {
    const visibleTabs = group.tabs.filter(tab => !tab.hidden);
    const gridCols = `repeat(${visibleTabs.length}, minmax(0, 1fr))`;

    return (
      <div key={group.id} className={group.className}>
        {group.label && (
          <h3 className="text-lg font-semibold mb-4">{group.label}</h3>
        )}
        
        <TabsList
          className={`${variantClasses.tabsList} ${styling.tabsListClassName || ''}`}
          style={{ 
            gridTemplateColumns: layout === 'horizontal' ? gridCols : undefined,
            ...stickyStyles,
          }}
        >
          {visibleTabs.map((tab) => {
            const dropdownTab = tab as DropdownTabItem;
            return dropdownTab.dropdownItems 
              ? renderDropdownTab(dropdownTab, groupIndex)
              : renderRegularTab(tab, groupIndex);
          })}
        </TabsList>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${styling.containerClassName || ''}`}>
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        orientation={layout}
        className="space-y-6"
      >
        {groups.map((group, index) => renderTabGroup(group, index))}
        
        {/* Tab Contents */}
        <div className={styling.tabContentClassName}>
          {allTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="space-y-6"
              forceMount={behavior.keepMounted ? true : undefined}
            >
              {tab.content}
            </TabsContent>
          ))}
          
          {/* Custom children content */}
          {children}
        </div>
      </Tabs>
    </div>
  );
}

// Helper function to create tab configurations
export function createTabConfig(
  tabs: TabItem[],
  options: Partial<UniversalTabConfig> = {}
): UniversalTabConfig {
  return {
    groups: [
      {
        id: 'main',
        tabs,
      }
    ],
    ...options,
  };
}

// Helper function for nested tab scenarios
export function createNestedTabConfig(
  parentTabs: TabItem[],
  childTabGroups: Record<string, TabItem[]>,
  options: Partial<UniversalTabConfig> = {}
): UniversalTabConfig {
  return {
    groups: [
      {
        id: 'parent',
        tabs: parentTabs,
      },
      ...Object.entries(childTabGroups).map(([parentId, childTabs]) => ({
        id: `${parentId}-children`,
        tabs: childTabs,
      }))
    ],
    ...options,
  };
}