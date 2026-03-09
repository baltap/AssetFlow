import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Common logic to get the current authenticated user from the database.
 * Throws an error if the user is not authenticated or not found in the DB.
 */
export async function getCurrentUser(ctx: GenericQueryCtx<any> | GenericMutationCtx<any>) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthenticated. Please log in.");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();

    if (!user) {
        throw new Error("Authenticated identity not found in database.");
    }

    return user;
}

/**
 * Verifies that the current user owns the project.
 * Returns the project if successful.
 */
export async function checkProjectOwnership(
    ctx: GenericQueryCtx<any> | GenericMutationCtx<any>,
    projectId: Id<"projects">
) {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(projectId);

    if (!project) {
        throw new Error("Project not found.");
    }

    if (project.userId !== user._id) {
        throw new Error("Unauthorized: You do not own this project.");
    }

    return project;
}

/**
 * Verifies that the current user owns the project associated with the scene.
 * Returns both the scene and project if successful.
 */
export async function checkSceneOwnership(
    ctx: GenericQueryCtx<any> | GenericMutationCtx<any>,
    sceneId: Id<"scenes">
) {
    const user = await getCurrentUser(ctx);
    const scene = await ctx.db.get(sceneId);

    if (!scene) {
        throw new Error("Scene not found.");
    }

    const project = await ctx.db.get(scene.projectId);
    if (!project || project.userId !== user._id) {
        throw new Error("Unauthorized: You do not own this scene/project.");
    }

    return { scene, project, user };
}

/**
 * Verifies that the current user owns the project associated with the script version.
 * Returns the project if successful.
 */
export async function checkVersionOwnership(
    ctx: GenericQueryCtx<any> | GenericMutationCtx<any>,
    versionId: Id<"scriptVersions">
) {
    const user = await getCurrentUser(ctx);
    const version = await ctx.db.get(versionId);

    if (!version) {
        throw new Error("Resource Missing: Script version not found.");
    }

    const project = await ctx.db.get(version.projectId);
    if (!project || project.userId !== user._id) {
        throw new Error("Security Violation: Unauthorized access to this script version.");
    }

    return { version, project, user };
}

/**
 * Action-compatible version of getCurrentUser.
 */
export async function getCurrentUserAction(ctx: ActionCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthenticated: Please log in.");
    }

    const user = await ctx.runQuery(internal.users.getUserByTokenInternal, {
        tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
        throw new Error("Authenticated identity not found in database.");
    }

    return user;
}

/**
 * Action-compatible version of checkProjectOwnership.
 */
export async function checkProjectOwnershipAction(ctx: ActionCtx, projectId: Id<"projects">) {
    const user = await getCurrentUserAction(ctx);
    const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId });

    if (!project) {
        throw new Error("Project not found.");
    }

    if (project.userId !== user._id) {
        throw new Error("Unauthorized: You do not own this project.");
    }

    return { project, user };
}

/**
 * Action-compatible version of checkSceneOwnership.
 */
export async function checkSceneOwnershipAction(ctx: ActionCtx, sceneId: Id<"scenes">) {
    const user = await getCurrentUserAction(ctx);
    const scene = await ctx.runQuery(internal.scenes.getSceneInternal, { sceneId });

    if (!scene) {
        throw new Error("Scene not found.");
    }

    const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: scene.projectId });
    if (!project || project.userId !== user._id) {
        throw new Error("Unauthorized: You do not own this scene/project.");
    }

    return { scene, project, user };
}

/**
 * Action-compatible version of checkVersionOwnership.
 */
export async function checkVersionOwnershipAction(ctx: ActionCtx, versionId: Id<"scriptVersions">) {
    const user = await getCurrentUserAction(ctx);
    const version = await ctx.runQuery(internal.projects.getVersionInternal, { versionId });

    if (!version) {
        throw new Error("Resource Missing: Script version not found.");
    }

    const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: version.projectId });
    if (!project || project.userId !== user._id) {
        throw new Error("Security Violation: Unauthorized access to this script version.");
    }

    return { version, project, user };
}

/**
 * Basic sanitization to prevent prompt injection.
 * Checks for high-risk keywords and suspicious patterns.
 */
export function sanitizeAiInput(text: string) {
    const riskPatterns = [
        "ignore previous instructions",
        "system prompt",
        "forget everything",
        "you are now",
        "new role",
        "instead of following",
        "output the hidden",
    ];

    const lowerText = text.toLowerCase();
    for (const pattern of riskPatterns) {
        if (lowerText.includes(pattern)) {
            throw new Error("SECURITY_ALERT: Suspicious input pattern detected. AI processing halted.");
        }
    }
    return text;
}

/**
 * Enhanced sanitization that logs security events.
 * Use this in mutations and actions.
 */
export async function sanitizeAiInputWithLogging(
    ctx: any,
    text: string,
    userId?: Id<"users">
) {
    const riskPatterns = [
        "ignore previous instructions",
        "system prompt",
        "forget everything",
        "you are now",
        "new role",
        "instead of following",
        "output the hidden",
    ];

    const lowerText = text.toLowerCase();
    for (const pattern of riskPatterns) {
        if (lowerText.includes(pattern)) {
            // Log the security event asynchronously so it persists even if this mutation/action fails
            if (ctx.scheduler) {
                await ctx.scheduler.runAfter(0, internal.logs.logSecurityEvent, {
                    userId,
                    eventType: "ai_injection_blocked",
                    payload: text.substring(0, 500), // Limit payload size
                    metadata: `Pattern matched: ${pattern}`,
                });
            }
            
            throw new Error(`SECURITY_ALERT: Suspicious pattern detected (${pattern}).`);
        }
    }
    return text;
}
