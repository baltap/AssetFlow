import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get("Retry-After") || "2");
                const waitTime = Math.max(retryAfter, Math.pow(2, i)) * 1000;
                console.warn(`Pexels rate limited. Retrying in ${waitTime}ms...`);
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

export const searchPexelsForScene = internalAction({
    args: {
        sceneId: v.id("scenes"),
        keywords: v.array(v.string()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; reason?: string; count?: number; cached?: boolean }> => {
        const scene = await ctx.runQuery(internal.scenes.getSceneInternal, { sceneId: args.sceneId });
        if (!scene) {
            console.warn(`Scene ${args.sceneId} not found, skipping Pexels search.`);
            return { success: false, reason: "Scene not found" };
        }

        const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: scene.projectId });
        const settings = project ? await ctx.runQuery(internal.settings.getSettingsInternal, { userId: project.userId }) : null;

        const customPexelsKey = settings?.apiKeys?.pexels;
        let activeApiKey = PEXELS_API_KEY;
        const user = project ? await ctx.runQuery(internal.users.getUserByIdInternal, { userId: project.userId }) : null;

        if (user && user.tier === "studio") {
            if (!customPexelsKey || customPexelsKey.trim() === "") {
                throw new Error("API_MISSING_PEXELS");
            }
            console.log("Using BYOK custom Pexels key...");
            activeApiKey = customPexelsKey;
        } else {
            if (!activeApiKey) {
                console.warn("PEXELS_API_KEY is not set and no custom key provided. Skipping search.");
                await ctx.runMutation(internal.scenes.updateSceneStatus, {
                    sceneId: args.sceneId,
                    status: "failed",
                });
                return { success: false, reason: "No API key" };
            }
        }

        const query = args.keywords.join(" ");
        console.log(`Resilient scouting for "${query}" for scene ${args.sceneId}...`);

        let orientationParam = "";
        let sizeParam = "";

        if (project?.exportPreferences) {
            const ratio = project.exportPreferences.aspectRatio;
            if (ratio === "9:16") orientationParam = "&orientation=portrait";
            else if (ratio === "16:9") orientationParam = "&orientation=landscape";
            else if (ratio === "1:1") orientationParam = "&orientation=square";

            const res = project.exportPreferences.resolution;
            if (res === "4K") sizeParam = "&size=large";
        }

        // Phase 4: Use new searchCache
        const cachedResults = await ctx.runQuery(internal.cache.getCachedSearch, { 
            query, 
            source: "pexels" 
        });

        if (cachedResults) {
            console.log(`[Phase 4] Cache hit for Pexels search: "${query}"`);
            await ctx.runMutation(internal.assets.storeSearchedAssets, {
                sceneId: args.sceneId,
                searchKeywords: query,
                assets: cachedResults,
            });
            await ctx.runAction(internal.ai.rankAssetsForScene, { sceneId: args.sceneId });
            return { success: true, count: cachedResults.length, cached: true };
        }

        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15${orientationParam}${sizeParam}`;

        try {
            const response = await fetchWithRetry(url, {
                headers: {
                    Authorization: activeApiKey,
                },
            });

            let videos: any[] = [];
            if (!response.ok) {
                console.warn(`Pexels API Error: ${response.status} ${response.statusText}. Forcing waterfall.`);
            } else {
                const data = await response.json();
                videos = data.videos || [];
                console.log(`Pexels found ${videos.length} videos.`);
            }

            // Fallback Mechanism: If 0 results, ask AI for a broader generic term and try again.
            if (videos.length === 0) {
                console.log(`No videos found. Triggering AI Fallback...`);
                try {
                    const aiKey = settings?.apiKeys?.gemini || process.env.GOOGLE_GENAI_API_KEY;
                    if (!aiKey) throw new Error("No Gemini key for fallback");

                    const aiClient = new (await import("@google/genai")).GoogleGenAI({ apiKey: aiKey });

                    const response = await aiClient.models.generateContent({
                        model: "gemini-1.5-flash",
                        contents: `Analyze this cinematic description: "${scene.visualDescription}". 
                        The previous search failed. Provide EXACTLY ONE extremely generic, one-word fallback search term (e.g., "nature", "city", "office", "people", "abstract") that is guaranteed to yield stock footage results.`
                    });

                    const fallbackKeyword = response.text?.trim()?.split(" ")[0] || "cinematic";
                    console.log(`AI Fallback generated generic keyword: "${fallbackKeyword}"`);

                    const fallbackUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(fallbackKeyword)}&per_page=15${orientationParam}${sizeParam}`;
                    const fallbackResponse = await fetchWithRetry(fallbackUrl, {
                        headers: { Authorization: activeApiKey },
                    });

                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        videos = fallbackData.videos || [];
                        console.log(`Fallback search found ${videos.length} videos.`);
                    }
                } catch (fallbackError) {
                    console.error("AI Fallback failed. Proceeding to failure.", fallbackError);
                }

                if (videos.length === 0) {
                    if (sizeParam) {
                        console.log("No 4K videos found on Pexels. Gracefully downgrading API search to HD...");
                        const downgradeUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15${orientationParam}`;
                        try {
                            const downgradeResponse = await fetchWithRetry(downgradeUrl, { headers: { Authorization: activeApiKey } });
                            if (downgradeResponse.ok) {
                                const downgradeData = await downgradeResponse.json();
                                videos = downgradeData.videos || [];
                                console.log(`Downgrade search found ${videos.length} videos.`);
                            }
                        } catch (e) {
                            console.error("HD Downgrade search failed", e);
                        }
                    }
                }

                if (videos.length === 0) {
                    console.log("No videos found on Pexels fallback. WATERFALL TRIGGERED: Offloading to Pixabay.");
                    await ctx.runAction(internal.pixabay.searchPixabayForScene, {
                        sceneId: args.sceneId,
                        keywords: args.keywords,
                    });
                    return { success: false, reason: "Offloading to Pixabay waterfall" };
                }
            }

            // Strictly filter by Resolution if 4K is required, otherwise try HD
            const targetRes = project?.exportPreferences?.resolution === "4K" ? "uhd" : "hd";

            const rawAssets: any[] = videos.map((video: any) => {
                // Find the best quality file by sorting by width/height
                const sortedFiles = [...(video.video_files || [])].sort((a, b) => (b.width * b.height) - (a.width * a.height));
                const file = sortedFiles[0] || video.video_files[0];
                return {
                    externalId: video.id.toString(),
                    previewUrl: video.image,
                    downloadUrl: file.link,
                    matchScore: 0.9,
                    metadata: {
                        duration: video.duration,
                        width: video.width,
                        height: video.height,
                        resolution: `${video.width}x${video.height}`,
                        tags: video.tags || [],
                    },
                };
            });

            // Apply strict minimum resolution filter if 4K is demanded
            let assets = project?.exportPreferences?.resolution === "4K"
                ? rawAssets.filter((a: any) => a.metadata.width >= 3840 || a.metadata.height >= 3840)
                : rawAssets;

            // Graceful Downgrade: If strict 4K filtering resulted in 0 assets, gracefully downgrade to 1080p
            if (assets.length === 0 && rawAssets.length > 0) {
                console.log("No 4K assets found on Pexels. Gracefully downgrading to best available resolution...");
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
                    source: "pexels",
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
            console.error("Resilient Search Error:", error);
            await ctx.runMutation(internal.scenes.updateSceneStatus, {
                sceneId: args.sceneId,
                status: "failed",
            });
            throw new Error("Failed to search footage resiliently");
        }
    },
});
