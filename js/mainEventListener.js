import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { IGVMouseHandler } from "./igv/IGVPanel.js";
import { juiceboxMouseHandler } from "./juicebox/juiceboxPanel.js";
import { colorRampPanel, thumbnailPanel, igvPanel, juiceboxPanel, structureSelectPanel } from './gui.js';
import { setup, dataValueMaterialProvider, noodle, ballAndStick, sceneManager, structureManager } from "./main.js";

export const mainEventListener =
    {
        receiveEvent: ({ type, data }) => {

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

                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.length})
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.length });
                });

                sceneManager.dispose();

                const { chr, genomicStart, genomicEnd } = structureManager.locus;
                // console.log('DidSelectStructure - chr ' + chr + ' s: ' + numberFormatter(genomicStart) + ' e: ' + numberFormatter(genomicEnd));

                colorRampPanel.colorRampMaterialProvider.configure({ structureLength: structure.length });

                dataValueMaterialProvider.structureLength = structure.length;

                setup({ structure });

            } else if ('DidLoadFile' === type) {

                let { name, payload } = data;

                structureManager.path = name;
                structureManager.ingest(payload);

                structureManager.parsePathEncodedGenomicLocation(structureManager.path);

                const { chr, genomicStart, genomicEnd } = structureManager.locus;
                // console.log('DidLoadFile - chr ' + chr + ' s: ' + numberFormatter(genomicStart) + ' e: ' + numberFormatter(genomicEnd));

                const initialStructureKey = '0';
                structure = structureManager.structureWithName(initialStructureKey);

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#trace3d-file-name').text(str);

                igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                colorRampPanel.configure({ genomicStart, genomicEnd, structureLength: structure.length });

                dataValueMaterialProvider.structureLength = structure.length;

                igvPanel.trackDataHandler();


                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: structure.length})
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: structure.length });
                });

                structureSelectPanel.configure({structures: structureManager.structures, initialStructureKey});

                sceneManager.dispose();

                setup({ structure });

                sceneManager.doUpdateCameraPose = false;

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };
