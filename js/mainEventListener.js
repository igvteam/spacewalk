import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { IGVMouseHandler } from "./igv/IGVPanel.js";
import { juiceboxMouseHandler } from "./juicebox/juiceboxPanel.js";
import { colorRampPanel, thumbnailPanel, igvPanel, juiceboxPanel, traceSelectPanel } from './gui.js';
import { setup, dataValueMaterialProvider, noodle, ballAndStick, sceneManager, ensembleManager } from "./main.js";

export const mainEventListener =
    {
        receiveEvent: ({ type, data }) => {

            let trace;

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

            } else if ('DidSelectStructure' === type) {

                trace = ensembleManager.traceWithName(data);

                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: trace.geometry.vertices.length})
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: trace.geometry.vertices.length });
                });

                sceneManager.dispose();

                colorRampPanel.colorRampMaterialProvider.configure({ structureLength: trace.length });

                dataValueMaterialProvider.structureLength = trace.geometry.vertices.length;

                setup({ trace });

            } else if ('DidLoadFile' === type) {

                let { name, payload } = data;

                ensembleManager.path = name;
                ensembleManager.ingest(payload);

                ensembleManager.parsePathEncodedGenomicLocation(ensembleManager.path);

                const { chr, genomicStart, genomicEnd } = ensembleManager.locus;

                const initialStructureKey = '0';
                trace = ensembleManager.traceWithName(initialStructureKey);

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#spacewalk-file-name').text(str);

                igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                colorRampPanel.configure({genomicStart, genomicEnd, structureLength: trace.geometry.vertices.length});

                dataValueMaterialProvider.structureLength = trace.geometry.vertices.length;

                igvPanel.trackDataHandler();


                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({ bp, start, end, interpolant, structureLength: trace.geometry.vertices.length })
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: trace.geometry.vertices.length });
                });

                traceSelectPanel.configure({ ensemble: ensembleManager.ensemble, initialStructureKey });

                sceneManager.dispose();

                setup({ trace });

                sceneManager.doUpdateCameraPose = false;

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };
