import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    tier: v.union(v.literal("creative"), v.literal("pro"), v.literal("studio")),
    credits: v.number(),
    freeVoiceSyncsUsed: v.optional(v.number()),
    elevenlabsApiKey: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  projects: defineTable({
    userId: v.id("users"),
    folderId: v.optional(v.id("folders")),
    title: v.string(),
    currentVersionId: v.optional(v.id("scriptVersions")),
    status: v.union(v.literal("draft"), v.literal("processing"), v.literal("completed")),
    exportPreferences: v.object({
      targetSoftware: v.union(
        v.literal("Premiere Pro (.xml)"),
        v.literal("DaVinci Resolve (.edl)"),
        v.literal("Final Cut (.fcpxml)")
      ),
      resolution: v.union(v.literal("4K"), v.literal("1080p")),
      framerate: v.number(),
      aspectRatio: v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1")),
    }),
    vibe: v.optional(v.string()),
    voiceoverSettings: v.optional(v.object({
      provider: v.string(),
      voiceId: v.string(),
      stability: v.number(),
      similarity: v.number(),
    })),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  scriptVersions: defineTable({
    projectId: v.id("projects"),
    versionNumber: v.number(),
    rawText: v.string(),
    changelog: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  scenes: defineTable({
    projectId: v.id("projects"),
    versionId: v.id("scriptVersions"),
    order: v.number(),
    text: v.string(),
    visualDescription: v.optional(v.string()),
    visualKeywords: v.array(v.string()),
    shotType: v.optional(v.string()),
    lighting: v.optional(v.string()),
    cameraMovement: v.optional(v.string()),
    directorCommentary: v.optional(v.string()),
    durationEstimate: v.optional(v.number()),
    status: v.union(
      v.literal("analyzing"),
      v.literal("searching"),
      v.literal("ready"),
      v.literal("linked"),
      v.literal("failed")
    ),
    audioUrl: v.optional(v.string()),
    audioStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed")
    )),
    selectedAssetId: v.optional(v.string()),
    selectedAssetUrl: v.optional(v.string()), // This will be the video URL
    selectedAssetPreviewUrl: v.optional(v.string()), // This will be the thumbnail
    selectedAssetResolution: v.optional(v.string()),
  }).index("by_version", ["versionId"]),

  assets: defineTable({
    sceneId: v.id("scenes"),
    source: v.union(v.literal("pexels"), v.literal("pixabay")),
    externalId: v.string(),
    previewUrl: v.string(),
    downloadUrl: v.string(),
    matchScore: v.number(),
    searchKeywords: v.optional(v.string()),
    metadata: v.object({
      duration: v.optional(v.number()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      resolution: v.optional(v.string()),
      tags: v.array(v.string()),
    }),
  })
    .index("by_scene", ["sceneId"])
    .index("by_external_id", ["externalId"])
    .index("by_keywords", ["searchKeywords"]),

  creditLogs: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    action: v.union(
      v.literal("script_analysis"),
      v.literal("asset_export"),
      v.literal("subscription_refill")
    ),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    apiKeys: v.object({
      pexels: v.optional(v.string()),
      pixabay: v.optional(v.string()),
      gemini: v.optional(v.string()),
      elevenlabs: v.optional(v.string()),
    }),
    preferences: v.object({
      defaultResolution: v.union(v.literal("4K"), v.literal("1080p"), v.literal("720p")),
      defaultAspectRatio: v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1")),
    }),
  }).index("by_user", ["userId"]),

  securityLogs: defineTable({
    userId: v.optional(v.id("users")),
    eventType: v.union(v.literal("ai_injection_blocked"), v.literal("unauthorized_access")),
    payload: v.string(),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["userId"]).index("by_type", ["eventType"]),

  usageLogs: defineTable({
    userId: v.id("users"),
    feature: v.union(v.literal("segment_script"), v.literal("rank_assets"), v.literal("generate_vo")),
    model: v.string(),
    tokens: v.object({
      prompt: v.number(),
      completion: v.number(),
    }),
    costEstimate: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_user", ["userId"]).index("by_feature", ["feature"]),

  searchCache: defineTable({
    query: v.string(),
    source: v.union(v.literal("pexels"), v.literal("pixabay")),
    results: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_query_source", ["query", "source"]),

  segmentCache: defineTable({
    textHash: v.string(),
    analysis: v.object({
      visualDescription: v.string(),
      visualKeywords: v.array(v.string()),
      shotType: v.string(),
      lighting: v.string(),
      cameraMovement: v.string(),
      directorCommentary: v.string(),
      durationEstimate: v.number(),
    }),
    timestamp: v.number(),
  }).index("by_hash", ["textHash"]),
});
