import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || "";

async function fetchWithRetry(url: string, maxRetries = 3) {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (response.status === 429) {
                const waitTime = Math.pow(2, i) * 1000;
                console.warn(`Pixabay rate limited. Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            return response;
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    throw lastError || new Error("Max retries reached");
}

export const searchPixabayForScene = internalAction({
    args: {
        sceneId: v.id("scenes"),
        keywords: v.array(v.string()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; reason?: string; count?: number }> => {
        const scene = await ctx.runQuery(internal.scenes.getSceneInternal, { sceneId: args.sceneId });
        if (!scene) {
            console.warn(`Scene ${args.sceneId} not found, skipping Pixabay search.`);
            return { success: false, reason: "Scene not found" };
        }

        const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: scene.projectId });
        const settings = project ? await ctx.runQuery(internal.settings.getSettingsInternal, { userId: project.userId }) : null;

        const user = project ? await ctx.runQuery(internal.users.getUserByIdInternal, { userId: project.userId }) : null;
        let activeApiKey = PIXABAY_API_KEY;
        const customPixabayKey = settings?.apiKeys?.pixabay;

        if (user && user.tier === "studio") {
            if (!customPixabayKey || customPixabayKey.trim() === "") {
                throw new Error("API_MISSING_PIXABAY");
            }
            console.log("Using BYOK custom Pixabay key...");
            activeApiKey = customPixabayKey;
        } else {
            if (!activeApiKey) {
                console.warn("PIXABAY_API_KEY is not set and no custom key provided. Failing waterfall silently.");
                await ctx.runMutation(internal.scenes.updateSceneStatus, {
                    sceneId: args.sceneId,
                    status: "failed",
                });
                return { success: false, reason: "No API key" };
            }
        }

        const query = args.keywords.join(" ");
        console.log(`Fallback Pixabay scouting for "${query}" for scene ${args.sceneId}...`);

        let orientationParam = "";
        if (project?.exportPreferences) {
            const ratio = project.exportPreferences.aspectRatio;
            if (ratio === "9:16") orientationParam = "&orientation=vertical";
            else if (ratio === "16:9") orientationParam = "&orientation=horizontal";
        }

        // Phase 4: Use new searchCache
        const cachedResults = await ctx.runQuery(internal.cache.getCachedSearch, { 
            query, 
            source: "pixabay" 
        });

        if (cachedResults) {
            console.log(`[Phase 4] Cache hit for Pixabay search: "${query}"`);
            await ctx.runMutation(internal.assets.storeSearchedAssets, {
                sceneId: args.sceneId,
                searchKeywords: query,
                assets: cachedResults,
            });
            await ctx.runAction(internal.ai.rankAssetsForScene, { sceneId: args.sceneId });
            return { success: true, count: cachedResults.length };
        }

        const url = `https://pixabay.com/api/videos/?key=${activeApiKey}&q=${encodeURIComponent(query)}&per_page=15&safesearch=true${orientationParam}`;

        try {
            const response = await fetchWithRetry(url);

            let hits = [];
            if (!response.ok) {
                console.warn(`Pixabay API Error: ${response.status} ${response.statusText}. Invalid key or rate limit.`);
            } else {
                const data = await response.json();
                hits = data.hits || [];
                console.log(`Pixabay found ${hits.length} videos.`);
            }

            // Fallback Mechanism: If 0 results, ask AI for a broader generic term and try again.
            if (hits.length === 0) {
                console.log(`No videos found on Pixabay. Triggering AI Fallback...`);
                try {
                    const customGeminiKey = settings?.apiKeys?.gemini;
                    const aiKey = customGeminiKey || process.env.GOOGLE_GENAI_API_KEY;
                    if (aiKey) {
                        const aiClient = new GoogleGenAI({ apiKey: aiKey });

                        const aiResponse = await aiClient.models.generateContent({
                            model: "gemini-1.5-flash-latest",
                            contents: `Analyze this cinematic description: "${scene.visualDescription}". 
                            The previous search failed. Provide EXACTLY ONE extremely generic, one-word fallback search term (e.g., "nature", "city", "office", "people", "abstract") that is guaranteed to yield stock footage results.`
                        });

                        const fallbackKeyword = aiResponse.text?.trim()?.split(" ")[0] || "cinematic";
                        console.log(`AI Fallback generated generic keyword for Pixabay: "${fallbackKeyword}"`);

                        const fallbackUrl = `https://pixabay.com/api/videos/?key=${activeApiKey}&q=${encodeURIComponent(fallbackKeyword)}&per_page=15&safesearch=true${orientationParam}`;
                        const fallbackResponse = await fetchWithRetry(fallbackUrl);

                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            hits = fallbackData.hits || [];
                            console.log(`Fallback Pixabay search found ${hits.length} videos.`);
                        }
                    }
                } catch (fallbackError) {
                    console.error("AI Fallback on Pixabay failed.", fallbackError);
                }

                if (hits.length === 0) {
                    console.log("No videos found on Pixabay fallback. Complete Waterfall Failure.");
                    await ctx.runMutation(internal.scenes.updateSceneStatus, {
                        sceneId: args.sceneId,
                        status: "failed",
                    });
                    return { success: false, reason: "No results found" };
                }
            }

            const rawAssets: any[] = hits.map((hit: any) => {
                // Determine target quality based on user preferences
                const targetRes = project?.exportPreferences?.resolution === "4K"
                    ? (hit.videos.large || hit.videos.medium || hit.videos.small)
                    : (hit.videos.medium || hit.videos.small || hit.videos.large);

                const videoData = targetRes;

                return {
                    externalId: hit.id.toString(),
                    previewUrl: videoData.thumbnail || "",
                    downloadUrl: videoData.url,
                    matchScore: 0.9,
                    metadata: {
                        duration: hit.duration,
                        width: videoData.width,
                        height: videoData.height,
                        resolution: `${videoData.width}x${videoData.height}`,
                        tags: hit.tags.split(',').map((t: string) => t.trim()) || [],
                    },
                };
            });

            // Apply strict minimum resolution filter if 4K is demanded
            let assets = project?.exportPreferences?.resolution === "4K"
                ? rawAssets.filter((a: any) => a.metadata.width >= 3840 || a.metadata.height >= 3840)
                : rawAssets;

            // Graceful Downgrade: If strict 4K filtering resulted in 0 assets, gracefully downgrade to 1080p
            if (assets.length === 0 && rawAssets.length > 0) {
                console.log("No 4K assets found on Pixabay. Gracefully downgrading to best available resolution...");
                assets = rawAssets;
            }

            await ctx.runMutation(internal.assets.storeSearchedAssets, {
                sceneId: args.sceneId,
                searchKeywords: query,
                assets: assets,
            });

            // Phase 4: Cache results globally for this query
            if (assets.length > 0) {
                await ctx.runMutation(internal.cache.setCachedSearch, {
                    query,
                    source: "pixabay",
                    results: assets
                });
            }

            if (assets.length > 0) {
                await ctx.runAction(internal.ai.rankAssetsForScene, {
                    sceneId: args.sceneId,
                });
            }

            return { success: true, count: assets.length };
        } catch (error) {
            console.error("Resilient Pixabay Search Error:", error);
            await ctx.runMutation(internal.scenes.updateSceneStatus, {
                sceneId: args.sceneId,
                status: "failed",
            });
            throw new Error("Failed to search Pixabay footage resiliently");
        }
    },
});
