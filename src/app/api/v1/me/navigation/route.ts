import { NextRequest, NextResponse } from "next/server";
import { createAuthzEngine } from "@/app/lib/acx/engine";
import { buildPrincipalFromRequest } from "@/app/lib/acx/principal";
import { NAVIGATION_TREE, NavSectionConfig, NavItemConfig } from "@/app/lib/navigation/config";
import { Principal } from "@hexmon_tech/acccess-control-core";

export const dynamic = "force-dynamic";

/**
 * Filter items recursively based on permissions
 */
async function filterItems(
    items: NavItemConfig[],
    principal: Principal,
    engine: ReturnType<typeof createAuthzEngine>
): Promise<NavItemConfig[]> {
    const result: NavItemConfig[] = [];
    const userRoles = principal.roles || [];

    for (const item of items) {
        // 1. Super Admin bypass (always Allow)
        if (userRoles.includes("SUPER_ADMIN")) {
            result.push(await processChildren(item, principal, engine));
            continue;
        }

        // 2. Admin Baseline check
        if (item.adminBaseline && userRoles.includes("ADMIN")) {
            result.push(await processChildren(item, principal, engine));
            continue;
        }

        // 3. Required Action check
        if (item.requiredAction) {
            // Build a minimal resource context for the engine
            const resource = {
                id: item.key,
                type: "navigation_item",
                attrs: {
                    adminBaseline: item.adminBaseline,
                },
            };

            const decision = await engine.authorize({
                principal,
                resource,
                action: { name: item.requiredAction },
                context: {
                    attributes: {},
                },
            });

            if (decision.allow) {
                result.push(await processChildren(item, principal, engine));
            }
            continue;
        }

        // Default to allowed if no specific action required
        result.push(await processChildren(item, principal, engine));
    }
    return result;
}

async function processChildren(
    item: NavItemConfig,
    principal: Principal,
    engine: ReturnType<typeof createAuthzEngine>
): Promise<NavItemConfig> {
    const newItem = { ...item };
    if (newItem.children) {
        newItem.children = await filterItems(newItem.children, principal, engine);
        // Hide if it's a group (no url) and has no visible children
        if (!newItem.url && newItem.children.length === 0) {
            return null as any; // Filtered out later
        }
    }
    return newItem;
}

export async function GET(req: NextRequest) {
    try {
        // 1. Build Principal
        const principal = await buildPrincipalFromRequest(req);
        const engine = createAuthzEngine();
        const userRoles = principal.roles || [];
        const isSuperAdmin = userRoles.includes("SUPER_ADMIN");

        // 2. Filter Sections
        const visibleSections: NavSectionConfig[] = [];

        for (const section of NAVIGATION_TREE) {
            // Check section-level permission if exists
            if (!isSuperAdmin && section.requiredAction) {
                const decision = await engine.authorize({
                    principal,
                    resource: { id: section.key, type: "navigation_section", attrs: {} },
                    action: { name: section.requiredAction },
                    context: { attributes: {} },
                });
                if (!decision.allow) continue;
            }

            // Filter items within section
            const visibleItems = (await filterItems(section.items, principal, engine))
                .filter(item => item !== null); // Remove nulls from processChildren

            if (visibleItems.length > 0) {
                visibleSections.push({
                    ...section,
                    items: visibleItems,
                });
            }
        }

        return NextResponse.json({
            sections: visibleSections,
            generatedAt: new Date().toISOString(),
            userRoleSummary: userRoles,
        });
    } catch (error) {
        console.error("Navigation fetch error:", error);
        return NextResponse.json({ error: "Failed to load navigation" }, { status: 500 });
    }
}
