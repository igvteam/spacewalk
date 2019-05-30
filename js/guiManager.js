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
            'spacewalk_ui_manager_groundplane',
            'spacewalk_ui_manager_gnomon',
            'spacewalk_ui_manager_ui_controls_color_ramp',
            'spacewalk_ui_manager_ui_controls_trace_select',
            'spacewalk_ui_manager_ui_controls_juicebox',
            'spacewalk_ui_manager_ui_controls_igv',
            'spacewalk_ui_manager_ui_controls_thumbnail',
            'spacewalk_ui_manager_ui_controls_distance_map',
            'spacewalk_ui_manager_ui_controls_contact_frequency_map'
        ].forEach(input_id => configurePanelVisibility($panel, input_id));

        configureRenderStyleRadioButton($panel.find('#spacewalk-render-style-ball-stick'), BallAndStick.getRenderStyle());
        configureRenderStyleRadioButton($panel.find('#spacewalk-render-style-noodle'), Noodle.getRenderStyle());
    }

    getRenderingStyle () {
        const id = this.$panel.find("input:radio[name='spacewalk-render-style']:checked").attr('id');
        return 'spacewalk-render-style-ball-stick' === id ? BallAndStick.getRenderStyle() : Noodle.getRenderStyle();
    }

    isGroundplaneHidden () {
        const $input = this.$panel.find('#spacewalk_ui_manager_groundplane');
        return $input.prop('checked');
    }

    isGnomonHidden () {
        const $input = this.$panel.find('#spacewalk_ui_manager_gnomon');
        return $input.prop('checked');
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
        if ('spacewalk_ui_manager_groundplane' === input_id) {
            globalEventBus .post({ type: "ToggleGroundPlane", data: $input.prop('checked') });
        } else if ('spacewalk_ui_manager_gnomon' === input_id) {
            globalEventBus .post({ type: "ToggleGnomon", data: $input.prop('checked') });
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
