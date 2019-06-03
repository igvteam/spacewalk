import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { IGVMouseHandler } from "./igv/IGVPanel.js";
import { juiceboxMouseHandler } from "./juicebox/juiceboxPanel.js";
import { colorRampPanel, thumbnailPanel, igvPanel, juiceboxPanel, traceSelectPanel } from './gui.js';
import { setup, noodle, ballAndStick, sceneManager, ensembleManager } from "./main.js";

export let currentTrace;
export let currentStructureLength;

export const mainEventListener =
    {
        receiveEvent: async ({ type, data }) => {


            if ('RenderStyleDidChange' === type) {

                if (data === Noodle.getRenderStyle()) {
                    sceneManager.renderStyle = Noodle.getRenderStyle();
                    ballAndStick.hide();
                    noodle.show();
                } else {
                    sceneManager.renderStyle = BallAndStick.getRenderStyle();
                    noodle.hide();
                    ballAndStick.show();
                }

                if (false === thumbnailPanel.isHidden) {
                    const model = sceneManager.renderStyle === Noodle.getRenderStyle() ? noodle : ballAndStick;
                    thumbnailPanel.configure(model);
                    thumbnailPanel.render();
                }

            }  else if ('DidLoadFile' === type) {

                let { name: path, payload: string } = data;

                ensembleManager.ingest({ path, string });

                const initialStructureKey = '0';

                currentTrace = ensembleManager.traceWithName(initialStructureKey);
                currentStructureLength = currentTrace.geometry.vertices.length;

                const { chr, genomicStart, genomicEnd } = ensembleManager.locus;

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#spacewalk-file-name').text(str);

                igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                colorRampPanel.configure({ genomicStart, genomicEnd });

                await igvPanel.trackDataHandler();

                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({ bp, start, end, interpolant, structureLength: currentStructureLength })
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: currentStructureLength });
                });

                traceSelectPanel.configure({ ensemble: ensembleManager.ensemble, initialStructureKey });

                sceneManager.dispose();

                setup({ trace: currentTrace });

            } else if ('DidSelectStructure' === type) {

                currentTrace = ensembleManager.traceWithName(data);
                currentStructureLength = currentTrace.geometry.vertices.length;

                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: currentStructureLength })
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: currentStructureLength });
                });

                sceneManager.dispose();

                colorRampPanel.colorRampMaterialProvider.repaint();

                setup({ trace: currentTrace });

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };
