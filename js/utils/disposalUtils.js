/**
 * Utility functions for consistent disposal of Three.js objects
 * Helps prevent memory leaks and ensures proper cleanup
 */

/**
 * Safely disposes a Three.js material and all its associated textures
 * @param {THREE.Material} material - The material to dispose
 */
export function disposeMaterial(material) {
    if (!material) return;
    
    // Dispose textures
    const textureProperties = [
        'map', 'normalMap', 'bumpMap', 'specularMap', 'envMap',
        'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
        'alphaMap', 'lightMap', 'displacementMap', 'clearcoatMap',
        'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap',
        'sheenRoughnessMap', 'transmissionMap', 'thicknessMap'
    ];
    
    textureProperties.forEach(prop => {
        if (material[prop]) {
            material[prop].dispose();
        }
    });
    
    // Dispose material itself
    material.dispose();
}

/**
 * Safely disposes a Three.js geometry
 * @param {THREE.BufferGeometry} geometry - The geometry to dispose
 */
export function disposeGeometry(geometry) {
    if (!geometry) return;
    geometry.dispose();
}

/**
 * Safely disposes a Three.js object (mesh, group, etc.)
 * @param {THREE.Object3D} object - The object to dispose
 */
export function disposeObject(object) {
    if (!object) return;
    
    // Call custom dispose if available
    if (typeof object.dispose === 'function') {
        object.dispose();
    } else {
        // Fallback disposal for objects with geometry or material
        disposeGeometry(object.geometry);
        
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => disposeMaterial(mat));
            } else {
                disposeMaterial(object.material);
            }
        }
    }
}

/**
 * Safely disposes an array of Three.js objects
 * @param {THREE.Object3D[]} objects - Array of objects to dispose
 */
export function disposeObjectArray(objects) {
    if (!Array.isArray(objects)) return;
    
    objects.forEach(obj => {
        if (obj) {
            disposeObject(obj);
        }
    });
}

/**
 * Safely removes and disposes a Three.js object from a scene
 * @param {THREE.Scene} scene - The scene to remove from
 * @param {THREE.Object3D} object - The object to remove and dispose
 */
export function removeAndDisposeFromScene(scene, object) {
    if (!scene || !object) return;
    
    scene.remove(object);
    disposeObject(object);
}

/**
 * Safely removes and disposes multiple Three.js objects from a scene
 * @param {THREE.Scene} scene - The scene to remove from
 * @param {THREE.Object3D[]} objects - Array of objects to remove and dispose
 */
export function removeAndDisposeArrayFromScene(scene, objects) {
    if (!scene || !Array.isArray(objects)) return;
    
    objects.forEach(obj => {
        if (obj) {
            scene.remove(obj);
            disposeObject(obj);
        }
    });
}

/**
 * Clears all children from a scene and properly disposes them
 * @param {THREE.Scene} scene - The scene to clear
 */
export function clearScene(scene) {
    if (!scene) return;
    
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        disposeObject(child);
    }
}
