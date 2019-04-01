import {globalEventBus} from "./eventBus.js";

class GUIManager {
    constructor ({ $button, $panel }) {

        $button.on('click.gui_manager', (e) => {
            e.preventDefault();
            $panel.toggle();
        });

        const $groundplane_input = $panel.find('#trace3d_ui_manager_groundplane');
        $groundplane_input.on('change.gui_manager_groundplane', (e) => {
            e.preventDefault();
            globalEventBus .post({ type: "ToggleGroundplane", data: $groundplane_input.prop('checked') });
        });

        const $ui_controls_input = $panel.find('#trace3d_ui_manager_ui_controls');
        $ui_controls_input.on('change.gui_manager_ui_controls', (e) => {
            e.preventDefault();
            globalEventBus .post({ type: "ToggleUIControls", data: $ui_controls_input.prop('checked') });
        });

    }
}

export default GUIManager;
