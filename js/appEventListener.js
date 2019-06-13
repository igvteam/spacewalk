import * as THREE from "../node_modules/three/build/three.module.js";
import Globals from './globals.js';
import PointCloud from './pointCloud.js';
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";
import { distanceMapPanel, guiManager, thumbnailPanel, traceSelectPanel } from './gui.js';
import { getDistanceMapCanvasWithTrace } from "./ensembleManager.js";

export let trace;

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

                const { name: path, payload: string } = data;

                Globals.pointCloudManager.ingest({ path, string });

                setupPointCloud({ pointCloudGeometry: Globals.pointCloudManager.geometry, pointCloudConvexHullGeometry: Globals.pointCloudManager.convexHullGeometry });

            } else if ('DidLoadFile' === type) {

                const { name: path, payload: string, chr, genomicStart, genomicEnd } = data;

                const str = 'STRUCTURE: CHR ' + chr + ' ' + Math.floor(genomicStart/1e6) + 'MB to ' + Math.floor(genomicEnd/1e6) + 'MB';
                $('.navbar').find('#spacewalk-file-name').text(str);

                Globals.ensembleManager.ingest({ path, string });

                const initialStructureKey = '0';
                trace = Globals.ensembleManager.getTraceWithName(initialStructureKey);

                traceSelectPanel.configure({ ensemble: Globals.ensembleManager.ensemble, initialStructureKey });

                setup({ trace });

            } else if ('DidSelectStructure' === type) {

                trace = Globals.ensembleManager.getTraceWithName(data);
                setup({ trace });

            } else if ('ToggleAllUIControls' === type) {
                // $('.navbar').toggle();
            }

        }
    };

let setupPointCloud = ({ pointCloudGeometry, pointCloudConvexHullGeometry }) => {

    Globals.sceneManager.dispose();

    Globals.sceneManager.renderStyle = PointCloud.getRenderStyle();

    Globals.pointCloud.configure(pointCloudGeometry, pointCloudConvexHullGeometry);

    let scene = new THREE.Scene();
    Globals.pointCloud.addToScene(scene);

    const { min, max, center, radius } = Globals.pointCloud.getBounds();
    const { position, fov } = Globals.pointCloud.getCameraPoseAlongAxis({ axis: '+z', scaleFactor: 3 });
    Globals.sceneManager.configure({ scene, min, max, boundingDiameter: (2 * radius), cameraPosition: position, centroid: center, fov });

};

let setup = ({ trace }) => {

    Globals.sceneManager.dispose();

    Globals.sceneManager.renderStyle = guiManager.getRenderingStyle();

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
