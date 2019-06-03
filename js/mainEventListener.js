import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { IGVMouseHandler } from "./igv/IGVPanel.js";
import { juiceboxMouseHandler } from "./juicebox/juiceboxPanel.js";
import { distanceMapPanel, colorRampPanel, thumbnailPanel, igvPanel, juiceboxPanel, traceSelectPanel } from './gui.js';
import { getDistanceMapCanvasWithTrace } from "./ensembleManager.js";

export let currentTrace;
export let currentStructureLength;

export const mainEventListener =
    {
        receiveEvent: async ({ type, data }) => {

            if ('RenderStyleDidChange' === type) {

                if (data === Noodle.getRenderStyle()) {
                    Globals.sceneManager.renderStyle = Noodle.getRenderStyle();
                    Globals.ballAndStick.hide();
                    Globals.noodle.show();
                } else {
                    Globals.sceneManager.renderStyle = BallAndStick.getRenderStyle();
                    Globals.noodle.hide();
                    Globals.ballAndStick.show();
                }

                if (false === thumbnailPanel.isHidden) {
                    const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
                    thumbnailPanel.configure(model);
                    thumbnailPanel.render();
                }

            }  else if ('DidLoadFile' === type) {

                let { name: path, payload: string } = data;

                Globals.ensembleManager.ingest({ path, string });

                const initialStructureKey = '0';

                currentTrace = Globals.ensembleManager.traceWithName(initialStructureKey);
                currentStructureLength = currentTrace.geometry.vertices.length;

                const { chr, genomicStart, genomicEnd } = Globals.ensembleManager.locus;

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

                traceSelectPanel.configure({ ensemble: Globals.ensembleManager.ensemble, initialStructureKey });

                Globals.sceneManager.dispose();

                setup({ trace: currentTrace });

            } else if ('DidSelectStructure' === type) {

                currentTrace = Globals.ensembleManager.traceWithName(data);
                currentStructureLength = currentTrace.geometry.vertices.length;

                igvPanel.browser.setCustomCursorGuideMouseHandler(({ bp, start, end, interpolant }) => {
                    IGVMouseHandler({bp, start, end, interpolant, structureLength: currentStructureLength })
                });

                juiceboxPanel.browser.setCustomCrosshairsHandler(({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY }) => {
                    juiceboxMouseHandler({ xBP, yBP, startXBP, startYBP, endXBP, endYBP, interpolantX, interpolantY, structureLength: currentStructureLength });
                });

                Globals.sceneManager.dispose();

                colorRampPanel.colorRampMaterialProvider.repaint();

                setup({ trace: currentTrace });

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };

let setup = ({ trace }) => {

    Globals.noodle.configure(Globals.ensembleManager.locus, trace, Globals.sceneManager.materialProvider, Globals.sceneManager.renderStyle);
    Globals.ballAndStick.configure(trace, Globals.sceneManager.materialProvider, Globals.sceneManager.renderStyle);

    let scene = new THREE.Scene();

    Globals.noodle.addToScene(scene);
    Globals.ballAndStick.addToScene(scene);

    const { min, max, center, radius } = Globals.ballAndStick.getBounds();
    const { position, fov } = Globals.ballAndStick.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });

    Globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

    if (false === thumbnailPanel.isHidden) {
        const model = Globals.sceneManager.renderStyle === Noodle.getRenderStyle() ? Globals.noodle : Globals.ballAndStick;
        thumbnailPanel.configure(model);
        thumbnailPanel.render();
    }

    distanceMapPanel.draw(getDistanceMapCanvasWithTrace(trace));
};
