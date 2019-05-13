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

        [
            'trace3d_ui_manager_groundplane',
            'trace3d_ui_manager_ui_controls_color_ramp',
            'trace3d_ui_manager_ui_controls_structure_select',
            'trace3d_ui_manager_ui_controls_juicebox',
            'trace3d_ui_manager_ui_controls_igv',
            'trace3d_ui_manager_ui_controls_thumbnail'
        ].forEach(input_id => configurePanelVisibility($panel, input_id));

        configureRenderStyleRadioButton($panel.find('#trace3d-render-style-ball-stick'), BallAndStick.getRenderStyle());
        configureRenderStyleRadioButton($panel.find('#trace3d-render-style-noodle'), Noodle.getRenderStyle());
    }

    isPanelHidden (panelID) {
        return !(this.$panel.find(`[data-target='${panelID}']`).prop('checked'));
    }
}

const configurePanelVisibility = ($guiPanel, input_id) => {

    const selector = '#' + input_id;
    const $input = $guiPanel.find(selector);
    const change = 'change.' + input_id;
    $input.on(change, (e) => {

        e.preventDefault();

        if ('trace3d_ui_manager_groundplane' === input_id) {
            globalEventBus .post({ type: "ToggleGroundplane", data: $input.prop('checked') });
        } else {
            const payload = $input.data('target');
            globalEventBus .post({ type: "ToggleUIControl", data: { $input, payload } });
        }
    });

};

const configureRenderStyleRadioButton = ($input, renderStyle) => {

    $input.val( renderStyle );

    $input.on('change.gui_manager.render_style_ball_stick', (e) => {
        e.preventDefault();
        globalEventBus .post({ type: "RenderStyleDidChange", data: $(e.target).val() });
    });

};

export default GUIManager;
