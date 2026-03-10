import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// --- Search Cache Implementation ---

export const getCachedSearch = internalQuery({
  args: { 
    query: v.string(), 
    source: v.union(v.literal("pexels"), v.literal("pixabay")) 
  },
  handler: async (ctx, args) => {
    const TTL = 48 * 60 * 60 * 1000; // 48-hour cache for search queries
    const entry = await ctx.db
      .query("searchCache")
      .withIndex("by_query_source", (q) => 
        q.eq("query", args.query.toLowerCase().trim()).eq("source", args.source)
      )
      .unique();

    if (entry && (Date.now() - entry.timestamp < TTL)) {
      return entry.results;
    }
    return null;
  },
});

export const setCachedSearch = internalMutation({
  args: {
    query: v.string(),
    source: v.union(v.literal("pexels"), v.literal("pixabay")),
    results: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const queryNormalized = args.query.toLowerCase().trim();
    const existing = await ctx.db
      .query("searchCache")
      .withIndex("by_query_source", (q) => 
        q.eq("query", queryNormalized).eq("source", args.source)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        results: args.results,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert("searchCache", {
        query: queryNormalized,
        source: args.source,
        results: args.results,
        timestamp: Date.now(),
      });
    }
  },
});

// --- Segment Cache Implementation ---

export const getCachedSegment = internalQuery({
  args: { textHash: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("segmentCache")
      .withIndex("by_hash", (q) => q.eq("textHash", args.textHash))
      .unique();
    
    return entry ? entry.analysis : null;
  },
});

export const setCachedSegment = internalMutation({
  args: {
    textHash: v.string(),
    analysis: v.union(
      v.object({
        visualDescription: v.string(),
        visualKeywords: v.array(v.string()),
        shotType: v.string(),
        lighting: v.string(),
        cameraMovement: v.string(),
        directorCommentary: v.string(),
        durationEstimate: v.number(),
      }),
      v.array(v.any())
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("segmentCache")
      .withIndex("by_hash", (q) => q.eq("textHash", args.textHash))
      .unique();

    if (!existing) {
      await ctx.db.insert("segmentCache", {
        textHash: args.textHash,
        analysis: args.analysis,
        timestamp: Date.now(),
      });
    }
  },
});
