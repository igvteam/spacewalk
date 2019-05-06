import { IGVMouseHandler } from "./igv/IGVPanel.js";
import { juiceboxMouseHandler } from "./juicebox/juiceboxPanel.js";
import { setup, thumbnailPanel, noodle, ballAndStick, structureSelectPanel, igvBrowser, igvPanel, juiceboxBrowser, juiceboxPanel, sceneManager, structureManager } from "./main.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";

export const mainEventListener =
    {
        receiveEvent: async ({ type, data }) => {

            let structure;

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

                structure = structureManager.structureWithName(data);

                igvBrowser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                });

                juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                });

                sceneManager.dispose();

                structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                const { chr, genomicStart, genomicEnd } = structureManager.locus;

                setup({ chr, genomicStart, genomicEnd, structure });

            } else if ('DidLoadFile' === type) {

                let { name, payload } = data;

                structureManager.path = name;
                structureManager.ingest(payload);

                structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                const { chr, genomicStart, genomicEnd } = structureManager.locus;

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#trace3d-file-name').text(str);

                igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                const initialStructureKey = '0';

                structure = structureManager.structureWithName(initialStructureKey);

                igvBrowser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.array.length})
                });

                juiceboxBrowser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.array.length });
                });

                structureSelectPanel.configure({ structures: structureManager.structures, initialStructureKey });

                sceneManager.dispose();

                setup({ chr, genomicStart, genomicEnd, structure });

                sceneManager.doUpdateCameraPose = false;

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };
