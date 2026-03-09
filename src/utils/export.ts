import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Id } from '../../convex/_generated/dataModel';

export interface ExportScene {
    _id: Id<"scenes">;
    order: number;
    visualDescription: string;
    scriptText: string;
    videoUrl?: string | null;
    audioUrl?: string | null;
    audioDurationMs?: number | null;
}

export async function createAndDownloadBundle(
    projectName: string,
    scenes: ExportScene[],
    onProgress: (status: string, progress: number) => void
) {
    try {
        const zip = new JSZip();
        const visualsFolder = zip.folder("visuals");
        const audioFolder = zip.folder("audio");

        let scriptContent = `# ${projectName || 'Exported Script'}\n\n`;
        let totalFiles = 0;
        let downloadedFiles = 0;

        // Count expected files for progress bar
        scenes.forEach(scene => {
            if (scene.videoUrl) totalFiles++;
            if (scene.audioUrl) totalFiles++;
        });

        const updateProgress = (itemName: string) => {
            downloadedFiles++;
            const percent = Math.round((downloadedFiles / totalFiles) * 80); // 80% is downloading
            onProgress(`Downloading ${itemName}...`, percent);
        };

        const fetchAsBlob = async (url: string): Promise<Blob> => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.blob();
        };

        const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

        for (let i = 0; i < sortedScenes.length; i++) {
            const scene = sortedScenes[i];
            const zeroPadIndex = String(i + 1).padStart(2, '0');

            // Add script chunk
            scriptContent += `## Scene ${i + 1}\n\n`;
            scriptContent += `**Visual:** ${scene.visualDescription}\n\n`;
            scriptContent += `**Audio:**\n${scene.scriptText}\n\n---\n\n`;

            const promises = [];

            // Download Video
            if (scene.videoUrl && visualsFolder) {
                const videoFilename = `${zeroPadIndex}_scene_visual.mp4`;
                promises.push(
                    fetchAsBlob(scene.videoUrl)
                        .then(blob => {
                            visualsFolder.file(videoFilename, blob);
                            updateProgress(videoFilename);
                        })
                        .catch(err => console.error(`Failed to download video ${videoFilename}:`, err))
                );
            }

            // Download Audio
            if (scene.audioUrl && audioFolder) {
                const audioFilename = `${zeroPadIndex}_scene_vo.mp3`;
                promises.push(
                    fetchAsBlob(scene.audioUrl)
                        .then(blob => {
                            audioFolder.file(audioFilename, blob);
                            updateProgress(audioFilename);
                        })
                        .catch(err => console.error(`Failed to download audio ${audioFilename}:`, err))
                );
            }

            await Promise.all(promises);
        }

        onProgress("Writing script.md...", 85);
        zip.file("script.md", scriptContent);

        // Generate robust FCPXML (Final Cut Pro XML) compatible with Premiere Pro / DaVinci Resolve
        onProgress("Generating Editor Timeline (FCPXML)...", 90);
        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <format id="r1" name="FFVideoFormat1080p30" frameDuration="100/3000s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
`;

        // Add resources
        sortedScenes.forEach((scene, i) => {
            const zeroPadIndex = String(i + 1).padStart(2, '0');
            if (scene.videoUrl) {
                xmlContent += `        <asset id="v${i}" name="${zeroPadIndex}_scene_visual.mp4" src="file://visuals/${zeroPadIndex}_scene_visual.mp4" hasVideo="1" audioSources="0" duration="${scene.audioDurationMs ? scene.audioDurationMs / 1000 : 5}s"/>\n`;
            }
            if (scene.audioUrl) {
                xmlContent += `        <asset id="a${i}" name="${zeroPadIndex}_scene_vo.mp3" src="file://audio/${zeroPadIndex}_scene_vo.mp3" hasAudio="1" audioSources="1" duration="${scene.audioDurationMs ? scene.audioDurationMs / 1000 : 5}s"/>\n`;
            }
        });

        xmlContent += `    </resources>
    <library>
        <event name="${projectName || 'Export'}">
            <project name="${projectName || 'Timeline'}">
                <sequence format="r1" tcStart="0s" tcFormat="NDF" duration="100s">
                    <spine>\n`;

        // We loosely stack audio tracks under video tracks sequentially
        let totalDuration = 0;
        sortedScenes.forEach((scene, i) => {
            const durationSec = scene.audioDurationMs ? scene.audioDurationMs / 1000 : 5;
            const zeroPadIndex = String(i + 1).padStart(2, '0');

            xmlContent += `                        <clip name="${zeroPadIndex}_scene_visual.mp4" duration="${durationSec}s">\n`;
            if (scene.videoUrl) {
                xmlContent += `                            <video ref="v${i}" duration="${durationSec}s"/>\n`;
            }
            if (scene.audioUrl) {
                // Attach the audio layer relative to the video clip duration
                xmlContent += `                            <audio ref="a${i}" duration="${durationSec}s" lane="-1" offset="0s" />\n`;
            }
            xmlContent += `                        </clip>\n`;
            totalDuration += durationSec;
        });

        xmlContent += `                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;

        zip.file("timeline.fcpxml", xmlContent);

        onProgress("Zipping everything... This may take a moment based on your device memory.", 95);
        const zipppedBlob = await zip.generateAsync({ type: "blob" });

        onProgress("Done! Initiating download.", 100);
        saveAs(zipppedBlob, `${(projectName || 'project').replace(/\\s+/g, '_').toLowerCase()}_bundle.zip`);

        return true;
    } catch (err: any) {
        console.error("Export failure:", err);
        throw new Error(err.message || 'ZIP Compilation Failed');
    }
}
