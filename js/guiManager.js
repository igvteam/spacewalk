import {globalEventBus} from "./eventBus.js";
import Noodle from "./noodle.js";
import BallAndStick from "./ballAndStick.js";

class GUIManager {
    constructor ({ $button, $panel }) {

        this.$panel = $panel;

        $button.on('click.gui_manager', (e) => {
            e.preventDefault();
            $panel.toggle();
        });

        const $groundplane_input = $panel.find('#trace3d_ui_manager_groundplane');
        $groundplane_input.on('change.gui_manager_groundplane', (e) => {
            e.preventDefault();
            globalEventBus .post({ type: "ToggleGroundplane", data: $groundplane_input.prop('checked') });
        });

        // const $ui_controls_input = $panel.find('#trace3d_ui_manager_ui_controls');
        // $ui_controls_input.on('change.gui_manager_ui_controls', (e) => {
        //     e.preventDefault();
        //     globalEventBus .post({ type: "ToggleAllUIControls", data: $ui_controls_input.prop('checked') });
        // });

        [
            'trace3d_ui_manager_ui_controls_color_ramp',
            'trace3d_ui_manager_ui_controls_structure_select',
            'trace3d_ui_manager_ui_controls_juicebox',
            'trace3d_ui_manager_ui_controls_igv'
        ].forEach((input_id) => {
            const selector = '#' + input_id;
            const $input = $panel.find(selector);
            const change = 'change.' + input_id;
            $input.on(change, (e) => {
                e.preventDefault();

                const payload = $input.data('target');
                globalEventBus .post({ type: "ToggleUIControl", data: { $input, payload } });
            });

        });

        const $inputBallAndSick = $panel.find('#trace3d-render-style-ball-stick');
        $inputBallAndSick.val(BallAndStick.renderStyle());

        $inputBallAndSick.on('change.gui_manager.render_style_ball_stick', (e) => {
            e.preventDefault();
            globalEventBus .post({ type: "RenderStyleDidChange", data: $(e.target).val() });
        });


        const $inputNoodle = $panel.find('#trace3d-render-style-noodle');
        $inputNoodle.val(Noodle.renderStyle());

        $inputNoodle.on('change.gui_manager.render_style_noodle', (e) => {
            e.preventDefault();
            globalEventBus .post({ type: "RenderStyleDidChange", data: $(e.target).val() });
        });
    }

    isPanelHidden (panelID) {
        return !(this.$panel.find(`[data-target='${panelID}']`).prop('checked'));
    }
}

export default GUIManager;
