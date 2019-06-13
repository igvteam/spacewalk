import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { distanceMapPanel, colorRampPanel, thumbnailPanel, igvPanel, juiceboxPanel, traceSelectPanel } from './gui.js';
import { getDistanceMapCanvasWithTrace } from "./ensembleManager.js";
import { guiManager } from "./gui.js";

export let currentTrace;

export const appEventListener =
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

            }  else if ('DidLoadPointCloudFile' === type) {

                Globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

                let { name: path, payload: string } = data;

                Globals.pointCloudManager.ingest({ path, string });

                Globals.sceneManager.dispose();

                setupPointCloud({ pointCloudGeometry: Globals.pointCloudManager.geometry, pointCloudConvexHullGeometry: Globals.pointCloudManager.convexHullGeometry });

            } else if ('DidLoadFile' === type) {

                Globals.sceneManager.renderStyle = guiManager.getRenderingStyle();

                let { name: path, payload: string } = data;

                Globals.ensembleManager.ingest({ path, string });

                const initialStructureKey = '0';

                currentTrace = Globals.ensembleManager.traceWithName(initialStructureKey);
                // Globals.ensembleManager.describeTraceWithName(initialStructureKey);

                const { chr, genomicStart, genomicEnd } = Globals.ensembleManager.locus;

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#spacewalk-file-name').text(str);

                igvPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                juiceboxPanel.goto({ chr, start: genomicStart, end: genomicEnd });

                colorRampPanel.configure({ genomicStart, genomicEnd });

                traceSelectPanel.configure({ ensemble: Globals.ensembleManager.ensemble, initialStructureKey });

                Globals.sceneManager.dispose();

                setup({ trace: currentTrace });

            } else if ('DidSelectStructure' === type) {

                Globals.sceneManager.renderStyle = guiManager.getRenderingStyle();

                currentTrace = Globals.ensembleManager.traceWithName(data);

                // Globals.ensembleManager.describeTraceWithName(data);

                Globals.sceneManager.dispose();

                colorRampPanel.colorRampMaterialProvider.repaint();

                setup({ trace: currentTrace });

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };

let setupPointCloud = ({ pointCloudGeometry, pointCloudConvexHullGeometry }) => {

    Globals.pointCloud.configure(pointCloudGeometry, pointCloudConvexHullGeometry);

    let scene = new THREE.Scene();
    Globals.pointCloud.addToScene(scene);

    const { min, max, center, radius } = Globals.pointCloud.getBounds();
    const { position, fov } = Globals.pointCloud.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
    Globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

};

let setup = ({ trace }) => {

    Globals.noodle.configure(trace);
    Globals.ballAndStick.configure(trace);

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
