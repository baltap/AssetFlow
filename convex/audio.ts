import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { checkSceneOwnershipAction } from "./authUtils";

export const generateMockVO = action({
    args: {
        sceneId: v.id("scenes"),
        voiceId: v.optional(v.string())
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; duration?: number; usedFreeSync?: boolean; syncsRemaining?: number } | void> => {
        const { scene, project, user } = await checkSceneOwnershipAction(ctx, args.sceneId);

        await ctx.runMutation(internal.audio.updateAudioStatusInternal, {
            sceneId: args.sceneId,
            status: "generating"
        });

        // Get scene text, limit to 200 chars for free TTS endpoints
        const sceneText = scene.text || "The quick brown fox jumps over the lazy dog.";
        const wordCount = sceneText.split(/\s+/).length;
        const mockDuration = Math.max(3, Math.min(15, Math.ceil(wordCount / 2.5)));

        // Use ElevenLabs API for realistic voiceover generation
        let audioUrl = "/mock-vo.mp3"; // default fallback

        const systemApiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = args.voiceId || "pNInz6obpgDQGcFmaJgB"; // Default: Adam Voice

        let apiKeyToUse = null;
        let usedFreeSync = false;

        const syncsUsed = user.freeVoiceSyncsUsed || 0;

        if (user.tier === "studio") {
            if (user.elevenlabsApiKey) {
                apiKeyToUse = user.elevenlabsApiKey;
            } else if (syncsUsed < 3) {
                apiKeyToUse = systemApiKey;
                usedFreeSync = true;
            } else {
                await ctx.runMutation(internal.audio.updateAudioStatusInternal, { sceneId: args.sceneId, status: "failed" });
                return { success: false, error: "API_MISSING" };
            }
        } else {
            if (syncsUsed < 3) {
                apiKeyToUse = systemApiKey;
                usedFreeSync = true;
            } else {
                await ctx.runMutation(internal.audio.updateAudioStatusInternal, { sceneId: args.sceneId, status: "failed" });
                return { success: false, error: "LIMIT_REACHED" };
            }
        }

        if (apiKeyToUse) {
            try {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: "POST",
                    headers: {
                        "Accept": "audio/mpeg",
                        "xi-api-key": apiKeyToUse,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        text: sceneText,
                        model_id: "eleven_multilingual_v2", // Upgraded to premium semantic voice model
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75
                        }
                    })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    // Store the generated audio in Convex Storage
                    const storageId = await ctx.storage.store(audioBlob);
                    // Get the public URL
                    const storedUrl = await ctx.storage.getUrl(storageId);
                    if (storedUrl) {
                        audioUrl = storedUrl;
                    }
                } else {
                    console.error("ElevenLabs API error:", await response.text());
                    await ctx.runMutation(internal.audio.updateAudioStatusInternal, { sceneId: args.sceneId, status: "failed" });
                    return { success: false, error: "API_ERROR" };
                }
            } catch (e) {
                console.error("Failed to generate ElevenLabs TTS, falling back to local file", e);
            }
        } else {
            console.warn("API Key not found or configured locally.");
            await ctx.runMutation(internal.audio.updateAudioStatusInternal, { sceneId: args.sceneId, status: "failed" });
            return { success: false, error: "API_ERROR" };
        }

        if (audioUrl !== "/mock-vo.mp3") {
            if (usedFreeSync) {
                await ctx.runMutation(internal.users.incrementFreeVoiceSyncsInternal, { userId: user._id });
            }
            
            // Log usage (characters as tokens for ElevenLabs)
            await ctx.runMutation(internal.logs.logUsage, {
                userId: user._id,
                feature: "generate_vo",
                model: "eleven_multilingual_v2",
                tokens: {
                    prompt: sceneText.length,
                    completion: 0,
                }
            });
        }

        await ctx.runMutation(internal.audio.completeAudioGenerationInternal, {
            sceneId: args.sceneId,
            audioUrl: audioUrl,
            duration: mockDuration
        });

        return { success: true, duration: mockDuration, usedFreeSync, syncsRemaining: usedFreeSync ? 2 - syncsUsed : undefined };
    },
});

export const updateAudioStatusInternal = internalMutation({
    args: { sceneId: v.id("scenes"), status: v.union(v.literal("pending"), v.literal("generating"), v.literal("ready"), v.literal("failed")) },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sceneId, { audioStatus: args.status });
    }
});

export const completeAudioGenerationInternal = internalMutation({
    args: {
        sceneId: v.id("scenes"),
        audioUrl: v.string(),
        duration: v.number()
    },
    handler: async (ctx, args) => {
        console.log("Saving audio generated for scene: ", args.sceneId, "URL:", args.audioUrl);
        await ctx.db.patch(args.sceneId, {
            audioUrl: args.audioUrl,
            audioStatus: "ready",
            durationEstimate: args.duration
        });
    }
});

export const getSceneInternal = internalQuery({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.sceneId);
    }
});
