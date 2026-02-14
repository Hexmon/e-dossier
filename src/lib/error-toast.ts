import { ApiClientError } from "@/app/lib/apiClient";

const STATUS_MAP: Record<number, string> = {
    400: "Please check the form details and try again.",
    401: "Your session expired. Please sign in again.",
    403: "You do not have permission to do this.",
    404: "Service not found. Please refresh and try again.",
    409: "This platoon already exists. Try a different name/code.",
    422: "Some details are invalid. Please review and retry.",
    429: "Too many requests. Please wait a moment and retry.",
    500: "Something went wrong on our side. Please try again.",
};

export function getToastMsg(err: unknown, resJson?: any, status?: number): string {
    // 1. Network / Connection errors
    if (err instanceof TypeError && err.message === "Failed to fetch") {
        return "Network issue. Check connection and try again.";
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.match(/ECONNREFUSED|timeout/i)) {
        return "Network issue. Check connection and try again.";
    }

    // 2. Extract status & extras from ApiClientError
    let finalStatus = status;
    let extras: any = resJson;

    if (err instanceof ApiClientError) {
        finalStatus = finalStatus ?? err.status;
        extras = extras ?? err.extras;
    }

    // 3. Check for specific field errors in extras
    // Structure might be:
    // - issues: { fieldErrors: { key: ["msg"] } } (Zod flatten)
    // - issues: [{ path: [], message: "" }] (Zod issues)
    // - errors: ... same ...

    const possibleIssues = extras?.issues ?? extras?.errors ?? extras?.zodError?.issues;

    if (possibleIssues) {
        // Case A: Zod flattened { fieldErrors: { ... } }
        if (possibleIssues.fieldErrors && typeof possibleIssues.fieldErrors === "object") {
            const firstField = Object.keys(possibleIssues.fieldErrors)[0];
            if (firstField) {
                const firstMsg = possibleIssues.fieldErrors[firstField]?.[0];
                if (firstMsg) return `Please fix: ${firstMsg}`;
            }
        }

        // Case B: Array of issues [{ path, message }]
        if (Array.isArray(possibleIssues) && possibleIssues.length > 0) {
            const first = possibleIssues[0];
            if (first.message) return `Please fix: ${first.message}`;
        }
    }


    // 4. Fallback to Status Map
    if (finalStatus && STATUS_MAP[finalStatus]) {
        return STATUS_MAP[finalStatus];
    }

    // 5. Safe Generic Fallback
    return "Something went wrong. Please try again.";
}
